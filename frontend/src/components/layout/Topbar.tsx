import { Bell, ChevronDown, Menu, Moon, PanelLeftOpen, Search, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { initials } from "../../lib/format";

export interface Crumb { label: string; to?: string }

export default function Topbar({ crumbs, sidebarCollapsed, onExpandSidebar, onOpenMobileNav }: {
  crumbs: Crumb[]; sidebarCollapsed: boolean; onExpandSidebar: () => void; onOpenMobileNav: () => void;
}) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="flex h-[76px] shrink-0 items-center gap-3 border-b border-slate-100 px-4 dark:border-white/10 sm:px-6">
      <button className="icon-btn md:hidden" onClick={onOpenMobileNav} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
      {sidebarCollapsed && (
        <button className="icon-btn hidden lg:grid" onClick={onExpandSidebar} aria-label="Expand sidebar"><PanelLeftOpen className="h-5 w-5" /></button>
      )}
      <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 sm:block">
        <ol className="flex items-center gap-2 text-sm">
          {crumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-2 truncate">
              {i > 0 && <span className="text-slate-300">/</span>}
              {c.to ? (
                <Link to={c.to} className="text-slate-500 hover:text-slate-800 dark:text-slate-400">{c.label}</Link>
              ) : (
                <span className="font-medium text-slate-900 dark:text-white">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        {searchOpen ? (
          <form onSubmit={(e) => { e.preventDefault(); navigate(`/courses?search=${encodeURIComponent(q)}`); setSearchOpen(false); }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setSearchOpen(false)} placeholder="Search courses…" className="input h-10 w-48" aria-label="Search courses" />
          </form>
        ) : (
          <button className="icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search"><Search className="h-[18px] w-[18px]" /></button>
        )}
        <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        <Link to="/notifications" className="icon-btn" aria-label="Notifications"><Bell className="h-[18px] w-[18px]" /></Link>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 pl-1.5 pr-3 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/5" aria-haspopup="menu" aria-expanded={menuOpen}>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-200">
              {initials(user?.display_name ?? "?")}
            </span>
            <span className="hidden max-w-[140px] truncate sm:inline">{user?.display_name}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {menuOpen && (
            <div role="menu" className="card absolute right-0 top-12 z-30 w-56 p-1.5">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium">{user?.display_name}</p>
                <p className="truncate text-xs capitalize text-slate-500">{user?.role} · {user?.email}</p>
              </div>
              <Link role="menuitem" to="/settings" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => setMenuOpen(false)}>Profile &amp; settings</Link>
              <button role="menuitem" className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={async () => { await logout(); navigate("/login"); }}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
