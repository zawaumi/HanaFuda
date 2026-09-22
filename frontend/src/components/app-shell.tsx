"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SeasonMark, seasonForIndex } from "@/lib/season";
import styles from "./app-shell.module.css";

type NavItem = { href: string; label: string; icon: ReactNode };

const navItems: NavItem[] = [
  {
    href: "/",
    label: "ホーム",
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>,
  },
  {
    href: "/connections",
    label: "つながり",
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  {
    href: "/history",
    label: "会話履歴",
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" /></svg>,
  },
];

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={mobile ? styles.mobileNavigation : styles.navigation} aria-label={mobile ? "モバイルナビゲーション" : "メインナビゲーション"}>
      {navItems.map((item) => {
        const active = isCurrentPath(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} className={`${styles.navLink} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined}>
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!isSupabaseConfigured) return null;

  async function signOut() {
    setPending(true);
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className={styles.signOut} type="button" onClick={() => { void signOut(); }} disabled={pending}>
      {pending ? "ログアウト中…" : "ログアウト"}
    </button>
  );
}

const bareRoutes = ["/login", "/signup", "/auth"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (bareRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return <>{children}</>;
  }

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">本文へ移動</a>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/" aria-label="HanaFuda ホーム">
          <span className={styles.brandMark} aria-hidden="true">
            <SeasonMark season={seasonForIndex(2)} />
          </span>
          <span>HanaFuda</span>
        </Link>
        <Navigation />
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <span className={styles.topbarLabel}>会話の準備</span>
          <div className={styles.topbarActions}>
            <Link className={styles.profileLink} href="/profile">プロフィール</Link>
            <SignOutButton />
          </div>
        </header>
        <main id="main-content" className={styles.content} tabIndex={-1}>{children}</main>
      </div>
      <Navigation mobile />
    </div>
  );
}
