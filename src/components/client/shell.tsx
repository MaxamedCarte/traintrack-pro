"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";

const NAV = [
  { group: "Workspace", items: [
    { href: "/overview", label: "Overview", icon: "■" },
    { href: "/sessions", label: "Training Sessions", icon: "📅" },
    { href: "/staff", label: "Staff Directory", icon: "👥" },
    { href: "/qr", label: "QR Attendance", icon: "▩", live: true },
    { href: "/attendance", label: "Attendance Records", icon: "✓" },
    { href: "/reports", label: "Reports & Analytics", icon: "☰" },
  ] },
  { group: "Administration", items: [
    { href: "/departments", label: "Departments", icon: "□" },
    { href: "/audit", label: "Audit Logs", icon: "◉" },
    { href: "/settings", label: "Settings", icon: "⚙" },
  ] },
];

const LABELS = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.href, i.label]))) as Record<string, string>;

export function AppShell({
  children,
  admin,
  organization,
  liveCount,
}: {
  children: ReactNode;
  admin: { name: string; email: string };
  organization: string;
  liveCount: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => typeof document !== "undefined" && document.documentElement.dataset.theme === "dark");
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    // Close overlays on navigation (state adjustment during render, no effect needed).
    setLastPath(pathname);
    setMobileOpen(false);
    setMenuOpen(false);
  }

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("tt-theme", next ? "dark" : "light");
    } catch {}
  };

  const section = "/" + (pathname.split("/")[1] ?? "");
  const initials = admin.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const orgMark = organization.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay${mobileOpen ? " open" : ""}`} onClick={() => setMobileOpen(false)} />
      <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " open" : ""}`} aria-label="Primary navigation">
        <div className="brand">
          <Image src="/logo.svg" alt="" width={36} height={36} priority />
          <div className="brand-copy">
            <strong>TrainTrack</strong>
            <span>PRO / ADMIN</span>
          </div>
          <button className="icon-btn sidebar-toggle" onClick={() => setCollapsed((c) => !c)} aria-label="Collapse navigation">
            ‹
          </button>
        </div>
        <div className="org-switcher">
          <span className="org-mark">{orgMark}</span>
          <span>
            <strong>{organization}</strong>
            <small>Operations workspace</small>
          </span>
        </div>
        <nav className="nav-list">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="nav-label">{group.group}</p>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className={`nav-item${section === item.href ? " active" : ""}`} aria-current={section === item.href ? "page" : undefined}>
                  <span className="nav-icon" aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                  {"live" in item && liveCount > 0 ? <span className="nav-count" title="Live sessions">{liveCount}</span> : null}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link className={`help-link${section === "/help" ? " active" : ""}`} href="/help">
            <span className="nav-icon">?</span>
            <span>Help &amp; Documentation</span>
          </Link>
          <div className="security-note">
            <span className="status-dot" />
            <span>
              <strong>Secure workspace</strong>
              <small>Server-validated check-in</small>
            </span>
          </div>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <button className="mobile-menu icon-btn" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            ☰
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{LABELS[section] ?? (section === "/help" ? "Help" : "Overview")}</strong>
          </div>
          <div className="top-actions">
            <form
              className="global-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = String(new FormData(e.currentTarget).get("q") || "").trim();
                router.push(q ? `/staff?q=${encodeURIComponent(q)}` : "/staff");
              }}
            >
              <span>⌕</span>
              <input name="q" placeholder="Search staff…" aria-label="Search staff" />
            </form>
            <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle dark theme" title="Toggle theme" suppressHydrationWarning style={{ color: "var(--muted)", fontSize: 17 }}>
              {dark ? "☀" : "☾"}
            </button>
            <div className="profile-menu">
              <button className="profile-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                <span className="avatar">{initials}</span>
                <span className="profile-copy">
                  <strong>{admin.name}</strong>
                  <small>Administrator</small>
                </span>
                <span>⌄</span>
              </button>
              {menuOpen ? (
                <div className="profile-dropdown">
                  <div style={{ padding: "8px 10px", fontSize: 11, color: "var(--muted)" }}>{admin.email}</div>
                  <Link href="/settings">Account &amp; settings</Link>
                  <form action={logoutAction}>
                    <button type="submit">Sign out</button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
