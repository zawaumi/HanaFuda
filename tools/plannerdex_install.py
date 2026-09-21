#!/usr/bin/env python3
"""Portable, dry-run-first PlannerDex installer (Python 3.9+, standard library)."""

import argparse
import base64
import difflib
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import tempfile


START = b"<!-- PlannerDex:start -->"
END = b"<!-- PlannerDex:end -->"
MANIFEST = ".plannerdex/install.json"
AGENTS = "AGENTS.md"


def _root(path):
    path = Path(path).expanduser().absolute()
    if path.is_symlink() or not path.is_dir():
        raise ValueError("Root must be an existing directory, not a symlink: %s" % path)
    return path.resolve()


def _path(root, relative):
    rel = PurePosixPath(relative)
    if (not relative or rel.is_absolute() or ".." in rel.parts
            or str(rel) != relative or "\\" in relative):
        raise ValueError("Unsafe managed path: %s" % relative)
    path = root
    for part in rel.parts:
        path = path / part
        if path.is_symlink():
            raise ValueError("Symlink in managed path: %s" % path)
        if path != root / relative and path.exists() and not path.is_dir():
            raise ValueError("Managed parent is not a directory: %s" % path)
    return path


def _read(root, relative):
    path = _path(root, relative)
    if not path.exists():
        return None
    if not path.is_file():
        raise ValueError("Managed path is not a regular file: %s" % path)
    return path.read_bytes()


def _b64(data):
    return None if data is None else base64.b64encode(data).decode("ascii")


def _decode(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Invalid manifest byte data")
    try:
        return base64.b64decode(value, validate=True)
    except (ValueError, TypeError) as exc:
        raise ValueError("Invalid manifest byte data") from exc


def _hash(data):
    return hashlib.sha256(data).hexdigest()


def _record(before, installed):
    return {"before": _b64(before), "installed": _b64(installed),
            "sha256": _hash(installed)}


def _guidance(root):
    """Discover paths only; do not open ancestor/global instruction files."""
    codex_home = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
    roots = [codex_home] + list(reversed(root.parents)) + [root]
    found = []
    for directory in roots:
        for name in ("AGENTS.md", "AGENTS.override.md"):
            path = directory / name
            if (path.exists() or path.is_symlink()) and str(path) not in found:
                found.append(str(path))
    return found


def _check_override(root):
    path = root / "AGENTS.override.md"
    if path.exists() or path.is_symlink():
        raise ValueError("Project override shadows AGENTS.md; resolve it before installing or "
                         "uninstalling: %s. Existing guidance paths: %s" %
                         (path, ", ".join(_guidance(root))))


def _payload(source):
    files = {}
    for name in ("tools/plannerdex.py", "tools/plannerdex_install.py"):
        value = _read(source, name)
        if value is None:
            raise ValueError("Missing source payload: %s" % (source / name))
        files[name] = value
    templates = _path(source, "templates")
    if not templates.is_dir():
        raise ValueError("Missing source templates: %s" % templates)
    fragment = None
    for directory, dirs, names in os.walk(str(templates), followlinks=False):
        for name in sorted(dirs + names):
            path = Path(directory) / name
            if path.is_symlink():
                raise ValueError("Symlink in source templates: %s" % path)
        for name in sorted(names):
            path = Path(directory) / name
            if not path.is_file():
                continue
            rel = path.relative_to(templates).as_posix()
            if rel == "AGENTS.fragment.md":
                fragment = path.read_bytes()
            else:
                if rel in files or rel in (MANIFEST, AGENTS, "AGENTS.override.md"):
                    raise ValueError("Reserved or duplicate template path: %s" % rel)
                files[rel] = path.read_bytes()
    if fragment is None:
        raise ValueError("Missing templates/AGENTS.fragment.md")
    owned_paths = set(files) | {AGENTS, MANIFEST}
    for rel in owned_paths:
        if any(str(parent) in owned_paths for parent in PurePosixPath(rel).parents
               if str(parent) != "."):
            raise ValueError("Managed payload has a file/directory collision: %s" % rel)
    if START in fragment or END in fragment:
        raise ValueError("AGENTS fragment must not contain managed markers")
    try:
        fragment.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("AGENTS fragment must be UTF-8") from exc
    return files, START + b"\n" + fragment.rstrip(b"\r\n") + b"\n" + END


def _manifest(root):
    raw = _read(root, MANIFEST)
    if raw is None:
        return None, None
    try:
        data = json.loads(raw)
        if data["schema_version"] != 1 or not isinstance(data["files"], dict):
            raise ValueError("Unsupported install manifest")
        for rel, record in data["files"].items():
            _path(root, rel)
            if rel in (AGENTS, MANIFEST, "AGENTS.override.md"):
                raise ValueError("Reserved path in install manifest")
            _validate_record(record)
        _validate_record(data["agents"])
        block = _decode(data["agents"]["block"])
        addition = _decode(data["agents"]["addition"])
        if (block is None or not block.startswith(START + b"\n")
                or not block.endswith(b"\n" + END)
                or block.count(START) != 1 or block.count(END) != 1
                or addition is None or block not in addition
                or (_decode(data["agents"]["before"]) or b"") + addition
                != _decode(data["agents"]["installed"])):
            raise ValueError("Invalid AGENTS record in install manifest")
    except (KeyError, TypeError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid PlannerDex install manifest: %s" % (root / MANIFEST)) from exc
    return data, raw


def _validate_record(record):
    _decode(record["before"])
    installed = _decode(record["installed"])
    if installed is None or _hash(installed) != record["sha256"]:
        raise ValueError("Install manifest hash mismatch")


def _agents_current(root, record):
    current = _read(root, AGENTS)
    block = _decode(record["block"])
    if (current is None or current.count(START) != 1 or current.count(END) != 1
            or current.find(END) < current.find(START)
            or current[current.find(START):current.find(END) + len(END)] != block):
        raise ValueError("Managed AGENTS block was edited or removed: %s" % (root / AGENTS))
    return current


def _verify_installed(root, manifest):
    for rel, record in manifest["files"].items():
        if _read(root, rel) != _decode(record["installed"]):
            raise ValueError("Managed file changed after installation: %s" % (root / rel))
    return _agents_current(root, manifest["agents"])


def _diff(relative, before, after):
    try:
        old = (before or b"").decode("utf-8").splitlines(keepends=True)
        new = (after or b"").decode("utf-8").splitlines(keepends=True)
    except UnicodeDecodeError:
        return "Binary file differs: %s\n" % relative
    return "".join(difflib.unified_diff(old, new,
                   fromfile=relative if before is not None else "/dev/null",
                   tofile=relative if after is not None else "/dev/null", n=0))


def _manifest_summary(raw):
    if raw is None:
        return None
    manifest = json.loads(raw)
    summary = {"schema_version": manifest["schema_version"],
               "managed_files": sorted(manifest["files"]),
               "agents_block_sha256": _hash(_decode(manifest["agents"]["block"]))}
    return (json.dumps(summary, indent=2, sort_keys=True) + "\n").encode("utf-8")


def _result(action, root, operations, apply, block):
    changes = []
    for rel, before, after in operations:
        shown_before, shown_after = before, after
        if rel == AGENTS:
            # Existing instructions are private: show only the managed block.
            shown_before = block + b"\n" if action == "uninstall" else None
            shown_after = block + b"\n" if action == "install" else None
        elif rel == MANIFEST:
            shown_before, shown_after = _manifest_summary(before), _manifest_summary(after)
        changes.append({"path": rel, "diff": _diff(rel, shown_before, shown_after)})
    result = {"action": action, "applied": bool(apply), "changes": changes,
              "guidance": _guidance(root),
              "diff_note": "AGENTS diffs show only the managed block; manifest diffs show metadata only."}
    if apply:
        _commit(root, operations)
    return result


def _replace(root, rel, data):
    path = _path(root, rel)
    if data is None:
        path.unlink()
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    _path(root, rel)
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o644
    descriptor, temporary = tempfile.mkstemp(prefix=".plannerdex-", dir=str(path.parent))
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _commit(root, operations):
    # All collisions and paths are checked before the first write.
    for rel, before, after in operations:
        if _read(root, rel) != before:
            raise ValueError("File changed during preflight: %s" % (root / rel))
    done = []
    try:
        for rel, before, after in operations:
            if _read(root, rel) != before:
                raise ValueError("File changed while applying: %s" % (root / rel))
            _replace(root, rel, after)
            done.append((rel, before, after))
    except Exception as exc:
        failures = []
        for rel, before, after in reversed(done):
            try:
                if _read(root, rel) != after:
                    raise ValueError("File changed during rollback")
                _replace(root, rel, before)
            except Exception:
                failures.append(rel)
        suffix = "; rollback could not restore: " + ", ".join(failures) if failures else ""
        raise ValueError("Install transaction failed; rollback attempted: %s%s" % (exc, suffix)) from exc


def install(source_root, target_root, apply=False):
    """Plan or apply installation; refuse collisions and edits to managed files."""
    source, target = _root(source_root), _root(target_root)
    if source == target:
        raise ValueError("Do not install PlannerDex into its own source root")
    _check_override(target)
    files, block = _payload(source)
    manifest, raw = _manifest(target)
    if manifest is not None:
        _verify_installed(target, manifest)
        previous = {rel: _decode(record["installed"]) for rel, record in manifest["files"].items()}
        if files != previous or block != _decode(manifest["agents"]["block"]):
            raise ValueError("Source payload differs from installed version; uninstall it before changing versions")
        return _result("install", target, [], apply, block)

    operations, records = [], {}
    for rel, value in sorted(files.items()):
        before = _read(target, rel)
        if before is not None and before != value:
            raise ValueError("Installation collision; existing file would be overwritten: %s" % (target / rel))
        records[rel] = _record(before, value)
        if before != value:
            operations.append((rel, before, value))
    before = _read(target, AGENTS)
    if before is not None and (START in before or END in before):
        raise ValueError("Untracked PlannerDex marker already exists: %s" % (target / AGENTS))
    separator = b"" if not before else (b"\n" if before.endswith(b"\n") else b"\n\n")
    addition = separator + block + b"\n"
    installed = (before or b"") + addition
    agents = _record(before, installed)
    agents.update({"block": _b64(block), "addition": _b64(addition)})
    manifest = {"schema_version": 1, "files": records, "agents": agents}
    encoded = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode("utf-8")
    operations.extend([(AGENTS, before, installed), (MANIFEST, raw, encoded)])
    return _result("install", target, operations, apply, block)


def uninstall(target_root, apply=False):
    """Remove only unchanged installed bytes, preserving unrelated project state."""
    target = _root(target_root)
    _check_override(target)
    manifest, raw = _manifest(target)
    if manifest is None:
        return _result("uninstall", target, [], apply, b"")
    current = _verify_installed(target, manifest)
    operations = []
    for rel, record in sorted(manifest["files"].items()):
        before, installed = _decode(record["before"]), _decode(record["installed"])
        if before != installed:
            operations.append((rel, installed, before))
    record = manifest["agents"]
    block, addition = _decode(record["block"]), _decode(record["addition"])
    if current == _decode(record["installed"]):
        restored = _decode(record["before"])
    elif addition in current:
        restored = current.replace(addition, b"", 1)
    else:
        start, end = current.index(START), current.index(END) + len(END)
        if current[end:end + 1] == b"\n":
            end += 1
        restored = current[:start] + current[end:]
    operations.extend([(AGENTS, current, restored), (MANIFEST, raw, None)])
    return _result("uninstall", target, operations, apply, block)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="action", required=True)
    for action in ("install", "uninstall"):
        command = commands.add_parser(action)
        command.add_argument("target", type=Path)
        command.add_argument("--apply", action="store_true", help="write changes (default: dry run)")
        if action == "install":
            command.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args(argv)
    try:
        result = (install(args.source, args.target, args.apply) if args.action == "install"
                  else uninstall(args.target, args.apply))
    except (ValueError, OSError) as exc:
        parser.exit(2, "PlannerDex: %s\n" % exc)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
