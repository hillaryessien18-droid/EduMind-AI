import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import IconRail from "./IconRail";
import Logo from "./Logo";
import SectionSidebar from "./SectionSidebar";
import Topbar, { type Crumb } from "./Topbar";

const TITLES: Record<string, string> = {
  dashboard: "Progress", courses: "Courses", learning: "My Learning", gradebook: "Gradebook",
  tutor: "AI Tutor", settings: "Settings", generator: "Course Generator", flashcards: "Flashcards",
  documents: "Documents", planner: "Study Planner", analytics: "Analytics", notifications: "Notifications",
};

function crumbsFor(pathname: string): Crumb[] {
  const [first, second] = pathname.split("/").filter(Boolean);
  const root: Crumb = { label: "Courses & Learning", to: "/courses" };
  const title = TITLES[first ?? ""] ?? "Home";
  if (second && first === "courses") return [root, { label: "Courses", to: "/courses" }, { label: "Course details" }];
  return [root, { label: title }];
}

const MOBILE_LINKS = [
  ["/dashboard", "Progress"], ["/courses", "Courses"], ["/learning", "My Learning"], ["/gradebook", "Gradebook"],
  ["/tutor", "AI Tutor"], ["/settings", "Settings"],
] as const;

export default function AppLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="min-h-screen p-0 sm:p-4 lg:p-8">
      <div className="mx-auto flex h-screen max-w-[1440px] overflow-hidden bg-white shadow-shell dark:bg-navy-800/60 sm:h-[calc(100vh-2rem)] sm:rounded-[28px] lg:h-[calc(100vh-4rem)]">
        <IconRail />
        {!collapsed && <SectionSidebar onCollapse={() => setCollapsed(true)} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            crumbs={crumbsFor(pathname)}
            sidebarCollapsed={collapsed}
            onExpandSidebar={() => setCollapsed(false)}
            onOpenMobileNav={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-navy-900/40 md:hidden" onClick={() => setMobileOpen(false)}>
          <nav className="h-full w-72 bg-white p-5 dark:bg-navy-800" onClick={(e) => e.stopPropagation()} aria-label="Mobile">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold"><Logo className="h-8 w-8" /> EduMind AI</div>
              <button onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
            </div>
            <ul className="space-y-1">
              {MOBILE_LINKS.map(([to, label]) => (
                <li key={to}>
                  <NavLink to={to} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-brand-50 font-medium text-brand-700 dark:bg-white/10 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>{label}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
