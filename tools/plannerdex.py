#!/usr/bin/env python3
"""PlannerDex: local, explicit orchestration records. Python 3.9+, stdlib only."""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
import tempfile
import uuid

VERSION = "0.1.0"
SCHEMA = 1
SKIP = {".git", "__pycache__", ".venv", "node_modules", ".pytest_cache"}
CHILD_STATES = {"planned", "running", "done", "blocked", "interrupted"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def identifier(value):
    require(isinstance(value, str) and re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}", value), "Invalid identifier")
    return value


def relative(root, name):
    require(isinstance(name, str) and name and not Path(name).is_absolute(), "Expected a relative path")
    p = Path(name)
    require(".." not in p.parts, "Parent traversal is not allowed")
    current = root
    for part in p.parts:
        current = current / part
        require(not current.is_symlink(), "Symlink is not supported: " + name)
    require(current.resolve().is_relative_to(root.resolve()), "Path leaves project")
    return current


def read_json(path):
    try:
        result = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValueError("Cannot read JSON: %s (%s)" % (path, error)) from error
    require(isinstance(result, dict), "JSON root must be an object")
    return result


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".write-", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


@contextmanager
def locked(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    lock = path.with_suffix(".lock")
    try:
        fd = os.open(str(lock), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError as error:
        raise ValueError("Task is locked; confirm no writer remains before removing " + str(lock)) from error
    try:
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        yield
    finally:
        lock.unlink()


def strings(value, name, nonempty=False):
    require(isinstance(value, list) and all(isinstance(x, str) and x.strip() for x in value), name + " must be a string list")
    require(not nonempty or value, name + " must not be empty")


def config(root):
    cfg = read_json(relative(root, ".plannerdex/project.json"))
    require(cfg.get("schema_version") == SCHEMA, "Unsupported project schema")
    require(isinstance(cfg.get("name"), str) and cfg["name"].strip(), "Missing project name")
    for field in ("watch", "risk_paths", "environment_keys"):
        strings(cfg.get(field), field, nonempty=(field == "watch"))
    for name in cfg["watch"] + cfg["risk_paths"]:
        relative(root, name)
    require(isinstance(cfg.get("checks"), list), "checks must be a list")
    seen = set()
    for check in cfg["checks"]:
        require(isinstance(check, dict), "Invalid check")
        key = identifier(check.get("id"))
        require(key not in seen, "Duplicate check: " + key)
        seen.add(key)
        strings(check.get("argv"), "argv", nonempty=True)
        relative(root, check.get("cwd", "."))
        require(type(check.get("required")) is bool, "required must be boolean")
        timeout = check.get("timeout_seconds")
        require(type(timeout) is int and 1 <= timeout <= 3600, "Invalid timeout_seconds")
    return cfg


def overlaps(a, b):
    a, b = Path(a), Path(b)
    return a == b or a in b.parents or b in a.parents


def route(cfg, risk, scopes, parallel, reason):
    require(risk in {"low", "standard", "high"}, "Invalid risk")
    require(type(parallel) is int and 0 <= parallel <= 2, "parallel must be 0..2")
    require(isinstance(reason, str) and reason.strip(), "Routing needs a reason")
    important = risk == "high" or any(overlaps(s, p) for s in scopes for p in cfg["risk_paths"])
    return {"risk": risk, "parallel_workers": parallel, "review_required": important, "reason": reason}


def task_path(root, task_id):
    return relative(root, ".plannerdex/tasks/" + identifier(task_id) + ".json")


def validate_task(root, cfg, state):
    require(state.get("schema_version") == SCHEMA, "Unsupported task schema")
    identifier(state.get("id"))
    require(type(state.get("revision")) is int and state["revision"] >= 0, "Invalid revision")
    require(state.get("status") in {"active", "blocked", "completed"}, "Invalid task status")
    for field in ("owner", "goal", "next_action", "updated_at"):
        require(isinstance(state.get(field), str) and state[field].strip(), "Missing " + field)
    for field in ("scope", "constraints", "completed", "blockers"):
        strings(state.get(field), field, nonempty=(field == "scope"))
    for name in state["scope"]:
        relative(root, name)
    acceptance = state.get("acceptance")
    require(isinstance(acceptance, list) and acceptance, "Acceptance criteria are required")
    for item in acceptance:
        require(isinstance(item, dict) and isinstance(item.get("text"), str) and item["text"].strip(), "Invalid acceptance item")
        require(type(item.get("met")) is bool and isinstance(item.get("evidence"), str), "Invalid acceptance evidence")
        require(not item["met"] or item["evidence"].strip(), "Met criteria need evidence")
        require(item.get("fingerprint") is None or (isinstance(item["fingerprint"], str) and re.fullmatch(r"[a-f0-9]{64}", item["fingerprint"])), "Invalid acceptance fingerprint")
    r = state.get("routing")
    require(isinstance(r, dict), "Missing routing")
    expected = route(cfg, r.get("risk"), state["scope"], r.get("parallel_workers"), r.get("reason"))
    require(r == expected, "Routing differs from project risk policy; run route to refresh it")
    require(isinstance(state.get("checks"), dict) and isinstance(state.get("subtasks"), list), "Invalid checks/subtasks")
    for key, path in state["checks"].items():
        identifier(key)
        relative(root, path)
    for field in ("baseline", "review", "usage"):
        require(field in state and (state[field] is None or isinstance(state[field], str)), "Invalid " + field)
        if state[field]:
            relative(root, state[field])
    children = set()
    owners = []
    for child in state["subtasks"]:
        require(isinstance(child, dict), "Invalid subtask")
        key = identifier(child.get("id"))
        require(key not in children, "Duplicate subtask")
        children.add(key)
        require(child.get("role") in {"research", "implementation", "review"}, "Invalid subtask role")
        require(child.get("status") in CHILD_STATES, "Invalid subtask status")
        for field in ("goal", "summary", "next_action"):
            require(isinstance(child.get(field), str), "Invalid child " + field)
        for field in ("owns", "reads", "depends_on", "artifacts"):
            strings(child.get(field), field)
        for name in child["owns"] + child["reads"] + child["artifacts"]:
            relative(root, name)
        if child["role"] != "implementation":
            require(not child["owns"], "Read-only roles cannot own writes")
        if child["status"] != "done":
            for name in child["owns"]:
                require(not any(overlaps(name, other) for other in owners), "Overlapping write ownership")
                owners.append(name)
    for child in state["subtasks"]:
        require(all(x in children and x != child["id"] for x in child["depends_on"]), "Unknown/self dependency")
        if child["status"] == "running":
            require(all(next(c for c in state["subtasks"] if c["id"] == dep)["status"] == "done" for dep in child["depends_on"]), "Running child has unfinished dependencies")
    visiting, visited = set(), set()
    def visit(key):
        require(key not in visiting, "Dependency cycle")
        if key in visited:
            return
        visiting.add(key)
        for dep in next(c for c in state["subtasks"] if c["id"] == key)["depends_on"]:
            visit(dep)
        visiting.remove(key)
        visited.add(key)
    for key in children:
        visit(key)
    require(sum(c["status"] == "running" for c in state["subtasks"]) <= 2, "At most two running children in v1")
    require(sum(c["status"] == "running" and c["role"] != "review" for c in state["subtasks"]) <= r["parallel_workers"], "Running workers exceed route parallel_workers")
    return state


def load_task(root, cfg, key, refresh_route=False):
    state = read_json(task_path(root, key))
    require(state.get("id") == key, "Task ID and filename differ")
    if refresh_route:
        r = state.get("routing", {})
        state["routing"] = route(cfg, r.get("risk"), state.get("scope", []), r.get("parallel_workers"), r.get("reason"))
    return validate_task(root, cfg, state)


def snapshot(root, cfg, state):
    files = {}
    for name in dict.fromkeys(cfg["watch"] + state["scope"]):
        base = relative(root, name)
        require(base.exists(), "Watched path is missing: " + name)
        paths = [base] if base.is_file() else base.rglob("*")
        for path in paths:
            rel = path.relative_to(root)
            runtime = rel.parts[:2] in {(".plannerdex", "tasks"), (".plannerdex", "evidence")}
            if set(rel.parts) & SKIP or runtime or rel.as_posix() == ".plannerdex/install.json":
                continue
            require(not path.is_symlink(), "Watched symlink: " + str(rel))
            if path.is_file():
                files[rel.as_posix()] = file_hash(path)
    require(files, "No source files in watch; configure project.json")
    contract = {k: state[k] for k in ("goal", "scope", "constraints")}
    contract["acceptance"] = [x["text"] for x in state["acceptance"]]
    contract["risk"] = state["routing"]["risk"]
    payload = {"files": files, "project": cfg, "contract": contract,
               "environment": {"python": platform.python_version(), "system": platform.platform(),
                               "variables": {key: digest(os.environ.get(key)) for key in cfg["environment_keys"]}}}
    return {"fingerprint": digest(payload), **payload}


def evidence(root, kind, data):
    path = ".plannerdex/evidence/%s-%s.json" % (kind, uuid.uuid4().hex[:16])
    atomic_json(relative(root, path), {"schema_version": SCHEMA, "created_at": now(), **data})
    return path


def save_task(root, cfg, state):
    state["updated_at"] = now()
    state["revision"] += 1
    validate_task(root, cfg, state)
    atomic_json(task_path(root, state["id"]), state)


def start(root, cfg, args):
    path = task_path(root, args.task)
    with locked(path):
        require(not path.exists(), "Task already exists")
        state = {"schema_version": SCHEMA, "id": args.task, "revision": 0, "status": "active", "owner": args.owner,
                 "goal": args.goal, "scope": args.scope, "constraints": args.constraint,
                 "acceptance": [{"text": text, "met": False, "evidence": ""} for text in args.accept],
                 "routing": route(cfg, args.risk, args.scope, args.parallel, args.reason),
                 "completed": [], "blockers": [], "next_action": args.next, "checks": {}, "subtasks": [],
                 "baseline": None, "review": None, "usage": None, "updated_at": now()}
        validate_task(root, cfg, state)
        state["baseline"] = evidence(root, args.task + "-baseline", snapshot(root, cfg, state))
        save_task(root, cfg, state)
    return {"task": args.task, "routing": state["routing"], "next_action": state["next_action"]}


def inspection(root, cfg, state):
    current = snapshot(root, cfg, state)
    problems, warnings = [], []
    required = [c for c in cfg["checks"] if c["required"]]
    if not required:
        problems.append("No required checks configured")
    checks = {}
    for check in cfg["checks"]:
        status = "missing"
        if check["id"] in state["checks"]:
            record = read_json(relative(root, state["checks"][check["id"]]))
            require(record.get("schema_version") == SCHEMA and record.get("kind") == "check" and record.get("check_id") == check["id"] and record.get("task") == state["id"], "Invalid check record")
            status = record.get("status")
            require(status in {"pass", "fail", "timeout", "changed", "error"}, "Invalid check status")
            if record.get("snapshot", {}).get("fingerprint") != current["fingerprint"]:
                status = "stale"
            log = relative(root, record.get("log"))
            if not log.is_file() or file_hash(log) != record.get("log_hash"):
                status = "evidence_changed"
        checks[check["id"]] = status
        if check["required"] and status != "pass":
            problems.append("Check %s: %s" % (check["id"], status))
    for item in state["acceptance"]:
        if not item["met"]:
            problems.append("Acceptance pending: " + item["text"])
        elif item.get("fingerprint") != current["fingerprint"]:
            problems.append("Acceptance stale: " + item["text"])
    problems += ["Blocker: " + b for b in state["blockers"]]
    for child in state["subtasks"]:
        if child["status"] != "done":
            problems.append("Subtask %s: %s" % (child["id"], child["status"]))
        if child["status"] == "running":
            warnings.append("Confirm liveness before reassigning: " + child["id"])
    review_status = "missing"
    if state["review"]:
        record = read_json(relative(root, state["review"]))
        require(record.get("schema_version") == SCHEMA and record.get("kind") == "review" and record.get("task") == state["id"], "Invalid review record")
        review_status = record.get("result")
        require(review_status in {"pass", "fail"}, "Invalid review result")
        authors = {state["owner"]} | {c["id"] for c in state["subtasks"] if c["role"] == "implementation"}
        require(record.get("reviewer") not in authors and record.get("reviewer"), "Reviewer must not be an author")
        if record.get("fingerprint") != current["fingerprint"]:
            review_status = "stale"
        report = relative(root, record.get("report"))
        if not report.is_file() or file_hash(report) != record.get("report_hash"):
            review_status = "evidence_changed"
    if state["routing"]["review_required"] and review_status != "pass":
        problems.append("Independent review: " + review_status)
    elif review_status in {"fail", "stale", "evidence_changed"}:
        problems.append("Review: " + review_status)
    changed = []
    if state["baseline"]:
        previous = read_json(relative(root, state["baseline"]))
        old = previous.get("files", {})
        changed = sorted(p for p in set(old) | set(current["files"]) if old.get(p) != current["files"].get(p))
        if previous.get("fingerprint") != current["fingerprint"]:
            warnings.append("Code, requirements, project settings or environment changed since checkpoint")
    return {"ready": not problems, "problems": problems, "warnings": warnings, "checks": checks,
            "review": review_status, "fingerprint": current["fingerprint"],
            "changed_files": changed[:20], "changed_file_count": len(changed)}


def run_checks(root, cfg, state, selected):
    checks = [c for c in cfg["checks"] if selected is None or c["id"] == selected]
    require(checks, "No matching checks configured")
    output = []
    for check in checks:
        before = snapshot(root, cfg, state)
        log_name = ".plannerdex/evidence/%s-%s-%s.log" % (state["id"], check["id"], uuid.uuid4().hex[:12])
        log = relative(root, log_name)
        log.parent.mkdir(parents=True, exist_ok=True)
        code, status = None, "error"
        with log.open("wb") as stream:
            try:
                result = subprocess.run(check["argv"], cwd=relative(root, check.get("cwd", ".")),
                                        stdout=stream, stderr=subprocess.STDOUT, timeout=check["timeout_seconds"], shell=False)
                code = result.returncode
                status = "pass" if code == 0 else "fail"
            except subprocess.TimeoutExpired:
                status = "timeout"
            except OSError as error:
                stream.write(str(error).encode())
        after = snapshot(root, cfg, state)
        if before["fingerprint"] != after["fingerprint"]:
            status = "changed"
        path = evidence(root, state["id"] + "-check", {"kind": "check", "task": state["id"], "check_id": check["id"],
                        "argv": check["argv"], "cwd": check.get("cwd", "."), "status": status, "exit_code": code,
                        "snapshot": before, "log": log_name, "log_hash": file_hash(log)})
        state["checks"][check["id"]] = path
        item = {"check": check["id"], "status": status, "evidence": path}
        if status != "pass":
            with log.open("rb") as stream:
                stream.seek(max(0, log.stat().st_size - 2400))
                item["tail"] = stream.read().decode("utf-8", errors="replace")
        output.append(item)
    return output


def validate_usage(data):
    require(data.get("schema_version") == SCHEMA, "Unsupported usage schema")
    require(isinstance(data.get("source"), str) and data["source"].strip(), "Usage needs a source")
    require(data.get("scope") == "parent_and_children" and data.get("complete") is True, "Usage must cover parent and children completely")
    records = data.get("records")
    require(isinstance(records, list) and records, "Usage records required")
    seen, inputs, outputs = set(), 0, 0
    for row in records:
        require(isinstance(row, dict) and isinstance(row.get("id"), str) and row["id"], "Usage ID required")
        require(row["id"] not in seen, "Duplicate usage ID; incremental records only")
        seen.add(row["id"])
        for field in ("input_tokens", "output_tokens", "cached_input_tokens", "reasoning_output_tokens"):
            value = row.get(field, 0)
            require(type(value) is int and value >= 0, "Invalid " + field)
        require("input_tokens" in row and "output_tokens" in row, "Token totals required")
        require(row.get("cached_input_tokens", 0) <= row["input_tokens"], "Cached input is a subset")
        require(row.get("reasoning_output_tokens", 0) <= row["output_tokens"], "Reasoning output is a subset")
        inputs += row["input_tokens"]
        outputs += row["output_tokens"]
    return {"input_tokens": inputs, "output_tokens": outputs, "total_tokens": inputs + outputs}


def mutate(root, cfg, args):
    with locked(task_path(root, args.task)):
        state = load_task(root, cfg, args.task, refresh_route=(args.command == "route"))
        require(state["status"] != "completed" or args.command in {"reopen", "usage"}, "Completed task: reopen before changing it")
        cmd = args.command
        result = {"task": args.task, "action": cmd}
        if cmd == "checkpoint":
            state["completed"] = (state["completed"] + [args.note])[-5:]
            state["next_action"] = args.next
            state["blockers"] = args.blocker
            state["status"] = "blocked" if args.blocker else "active"
            state["baseline"] = evidence(root, args.task + "-baseline", {**snapshot(root, cfg, state), "checkpoint_note": args.note, "next_action": args.next, "blockers": args.blocker})
        elif cmd == "reopen":
            state["status"] = "active"
            state["next_action"] = args.next
        elif cmd == "route":
            state["routing"] = route(cfg, args.risk, state["scope"], args.parallel, args.reason)
            result["routing"] = state["routing"]
        elif cmd == "accept":
            require(1 <= args.index <= len(state["acceptance"]), "Acceptance index out of range")
            state["acceptance"][args.index - 1].update(met=True, evidence=args.evidence,
                fingerprint=snapshot(root, cfg, state)["fingerprint"])
        elif cmd == "delegate":
            require(not any(c["id"] == args.child for c in state["subtasks"]), "Subtask already exists")
            if args.role == "implementation":
                require(args.owns, "Implementation needs write ownership")
                require(all(any(Path(p) == Path(s) or Path(s) in Path(p).parents for s in state["scope"]) for p in args.owns), "Write ownership must be inside task scope")
            state["subtasks"].append({"id": args.child, "role": args.role, "goal": args.goal, "status": "planned",
                                       "owns": args.owns, "reads": args.reads, "depends_on": args.depends,
                                       "summary": "", "artifacts": [], "next_action": "Dispatch only after dependencies are done"})
        elif cmd == "child":
            matches = [c for c in state["subtasks"] if c["id"] == args.child]
            require(matches, "Unknown subtask")
            matches[0].update(status=args.status, summary=args.summary, artifacts=args.artifact, next_action=args.next)
            if args.status == "done":
                require(args.summary.strip(), "Completed subtask needs a result")
                for name in args.artifact:
                    require(relative(root, name).is_file(), "Missing child artifact: " + name)
        elif cmd == "verify":
            result["results"] = run_checks(root, cfg, state, args.check)
        elif cmd == "review":
            require(not any(c["role"] == "implementation" and c["status"] != "done" for c in state["subtasks"]), "Finish implementation subtasks before final review")
            current = snapshot(root, cfg, state)
            require(args.snapshot == current["fingerprint"], "Review snapshot does not match current code/contract")
            authors = {state["owner"]} | {c["id"] for c in state["subtasks"] if c["role"] == "implementation"}
            require(args.reviewer not in authors, "Reviewer must not be an author")
            report = relative(root, args.report)
            require(report.is_file() and report.stat().st_size > 0, "Review report is missing/empty")
            state["review"] = evidence(root, args.task + "-review", {"kind": "review", "task": args.task,
                "reviewer": args.reviewer, "result": args.result, "fingerprint": current["fingerprint"],
                "report": args.report, "report_hash": file_hash(report)})
        elif cmd == "usage":
            data = read_json(Path(args.input))
            result["totals"] = validate_usage(data)
            state["usage"] = evidence(root, args.task + "-usage", {"kind": "usage", "task": args.task,
                                                                    "measurement": data, "totals": result["totals"]})
        elif cmd == "finish":
            report = inspection(root, cfg, state)
            require(report["ready"], "Cannot finish: " + "; ".join(report["problems"]))
            state["status"] = "completed"
            state["next_action"] = args.next
            state["baseline"] = evidence(root, args.task + "-baseline", snapshot(root, cfg, state))
        save_task(root, cfg, state)
        result["revision"] = state["revision"]
        return result


def compact(root, cfg, state):
    status = inspection(root, cfg, state)
    return {"id": state["id"], "status": state["status"], "goal": state["goal"], "routing": state["routing"],
            "acceptance": state["acceptance"], "next_action": state["next_action"], "completed": state["completed"][-3:],
            "subtasks": [{k: c[k] for k in ("id", "role", "status", "next_action")} for c in state["subtasks"]],
            "usage": "recorded" if state["usage"] else "unknown", **status}


def compare(root, cfg, left, right):
    states = [load_task(root, cfg, key) for key in (left, right)]
    data = []
    for state in states:
        require(state["status"] == "completed" and inspection(root, cfg, state)["ready"], "Compare requires completed, currently verified tasks")
        require(state["usage"], "Usage is unknown")
        data.append(read_json(relative(root, state["usage"]))["measurement"])
    for item in data:
        validate_usage(item)
        require(isinstance(item.get("comparison"), dict) and all(isinstance(item["comparison"].get(k), str) and item["comparison"][k] for k in ("case", "start", "model", "acceptance")), "Comparable metadata required: case/start/model/acceptance")
    require(data[0]["comparison"] == data[1]["comparison"], "Benchmark conditions differ")
    a, b = (validate_usage(d)["total_tokens"] for d in data)
    return {"baseline": left, "candidate": right, "baseline_tokens": a, "candidate_tokens": b,
            "saved_tokens": a - b, "saved_percent": round((a - b) * 100 / a, 2) if a else None,
            "note": "Supplied measurements only; matching declared conditions does not prove statistical significance."}


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", default=".", help="project root")
    p.add_argument("--version", action="version", version=VERSION)
    subs = p.add_subparsers(dest="command", required=True)
    for cmd in ("resume", "check", "size"):
        s = subs.add_parser(cmd)
        s.add_argument("task", nargs="?")
    s = subs.add_parser("start")
    s.add_argument("task")
    s.add_argument("--goal", required=True)
    s.add_argument("--owner", default="coordinator")
    s.add_argument("--accept", action="append", required=True)
    s.add_argument("--scope", action="append", required=True)
    s.add_argument("--constraint", action="append", default=[])
    s.add_argument("--next", required=True)
    for cmd in ("start", "route"):
        s = s if cmd == "start" else subs.add_parser(cmd)
        if cmd == "route":
            s.add_argument("task")
        s.add_argument("--risk", choices=["low", "standard", "high"], default="standard")
        s.add_argument("--parallel", type=int, default=0)
        s.add_argument("--reason", required=True)
    s = subs.add_parser("checkpoint")
    s.add_argument("task")
    s.add_argument("--note", required=True)
    s.add_argument("--next", required=True)
    s.add_argument("--blocker", action="append", default=[])
    for cmd in ("finish", "reopen"):
        s = subs.add_parser(cmd)
        s.add_argument("task")
        s.add_argument("--next", required=True)
    s = subs.add_parser("accept")
    s.add_argument("task")
    s.add_argument("--index", type=int, required=True)
    s.add_argument("--evidence", required=True)
    s = subs.add_parser("delegate")
    s.add_argument("task")
    s.add_argument("child")
    s.add_argument("--role", choices=["research", "implementation", "review"], required=True)
    s.add_argument("--goal", required=True)
    for flag in ("owns", "reads", "depends"):
        s.add_argument("--" + flag, action="append", default=[])
    s = subs.add_parser("child")
    s.add_argument("task")
    s.add_argument("child")
    s.add_argument("--status", choices=sorted(CHILD_STATES), required=True)
    s.add_argument("--summary", required=True)
    s.add_argument("--next", required=True)
    s.add_argument("--artifact", action="append", default=[])
    s = subs.add_parser("verify")
    s.add_argument("task")
    s.add_argument("--check")
    s = subs.add_parser("review")
    s.add_argument("task")
    s.add_argument("--reviewer", required=True)
    s.add_argument("--snapshot", required=True)
    s.add_argument("--report", required=True)
    s.add_argument("--result", choices=["pass", "fail"], required=True)
    s = subs.add_parser("usage")
    s.add_argument("task")
    s.add_argument("--input", required=True)
    s = subs.add_parser("compare")
    s.add_argument("baseline")
    s.add_argument("candidate")
    for cmd in ("install", "uninstall"):
        s = subs.add_parser(cmd)
        s.add_argument("target")
        s.add_argument("--apply", action="store_true")
        s.add_argument("--diff", action="store_true", help="show full file diffs")
    return p


def main(argv=None):
    args = parser().parse_args(argv)
    root = Path(args.root).resolve()
    try:
        if args.command in {"install", "uninstall"}:
            from plannerdex_install import install, uninstall
            if args.command == "install":
                result = install(Path(__file__).resolve().parent.parent, Path(args.target).absolute(), apply=args.apply)
            else:
                result = uninstall(Path(args.target).absolute(), apply=args.apply)
            if not args.diff:
                result["changes"] = [{"path": item["path"]} for item in result["changes"]]
                result["hint"] = "Use --diff to inspect full changes; default is dry run."
        else:
            cfg = config(root)
            if args.command == "start":
                result = start(root, cfg, args)
            elif args.command == "compare":
                result = compare(root, cfg, args.baseline, args.candidate)
            elif args.command in {"resume", "check", "size"}:
                directory = relative(root, ".plannerdex/tasks")
                paths = [task_path(root, args.task)] if args.task else sorted(directory.glob("*.json"))
                for path in paths:
                    relative(root, str(path.relative_to(root)))
                if args.command == "resume" and len(paths) != 1:
                    result = {"tasks": [p.stem for p in paths], "next_action": "Select a task ID"}
                elif args.command == "size":
                    sizes = {"AGENTS.md": relative(root, "AGENTS.md").stat().st_size if relative(root, "AGENTS.md").exists() else 0}
                    sizes.update({str(p.relative_to(root)): p.stat().st_size for p in paths})
                    result = {"bytes": sizes, "warnings": [name for name, size in sizes.items() if size > (2048 if name == "AGENTS.md" else 4096)], "note": "Bytes, not tokens; budgets are advisory."}
                else:
                    result = {"tasks": [compact(root, cfg, load_task(root, cfg, p.stem)) for p in paths]}
                    if args.command == "check":
                        result["ok"] = bool(cfg["checks"]) and all(x["status"] != "completed" or x["ready"] for x in result["tasks"])
                        result["required_checks_configured"] = any(c["required"] for c in cfg["checks"])
                        result["ok"] = result["ok"] and result["required_checks_configured"]
            else:
                result = mutate(root, cfg, args)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if result.get("ok") is False or any(r["status"] != "pass" for r in result.get("results", [])):
            return 1
        return 0
    except (ValueError, OSError, KeyError, TypeError, AttributeError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
