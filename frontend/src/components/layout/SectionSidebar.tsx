import {
  ArrowLeft, Award, BookMarked, ChevronUp, ClipboardList, Crown, FileText, GraduationCap, Layers, LibraryBig, MessageSquareText,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../lib/api";
import { categoryStyle } from "../../lib/format";
import type { Category } from "../../lib/types";

const primary = [
  { to: "/courses", icon: LibraryBig, label: "Courses" },
  { to: "/learning", icon: GraduationCap, label: "My Learning" },
  { to: "/dashboard", icon: Layers, label: "Progress" },
  { to: "/gradebook", icon: ClipboardList, label: "Gradebook" },
];

const others = [
  { to: "/tutor", icon: MessageSquareText, label: "AI Tutor", tint: "bg-sky-400" },
  { to: "/flashcards", icon: BookMarked, label: "Flashcards", tint: "bg-teal-600" },
  { to: "/documents", icon: FileText, label: "Documents", tint: "bg-accent-500" },
  { to: "/generator", icon: Award, label: "Course Generator", tint: "bg-brand-600" },
];

function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-slate-200/70 pt-4 dark:border-white/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-1 text-sm font-medium text-slate-800 dark:text-slate-200"
        aria-expanded={open}
      >
        {title}
        <ChevronUp className={`h-4 w-4 text-slate-400 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function SectionSidebar({ onCollapse }: { onCollapse: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [promoHidden, setPromoHidden] = useState(() => {
    try { return localStorage.getItem("edumind.promo") === "hidden"; } catch { return false; }
  });

  useEffect(() => {
    api.get<Category[]>("/categories/").then((r) => {
      setCategories([...r.data].sort((a, b) => (b.course_count ?? 0) - (a.course_count ?? 0)).slice(0, 3));
    }).catch(() => setCategories([]));
  }, []);

  const hidePromo = () => {
    setPromoHidden(true);
    try { localStorage.setItem("edumind.promo", "hidden"); } catch { /* ignore */ }
  };

  return (
    <aside className="hidden w-[222px] shrink-0 flex-col bg-slate-50/80 px-3 py-5 dark:bg-white/[0.02] lg:flex">
      <div className="mb-5 flex items-center justify-between px-1">
        <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">Courses &amp; Learning</h2>
        <button onClick={onCollapse} className="grid h-6 w-6 place-items-center rounded-full border border-slate-300 text-slate-500 hover:bg-white dark:border-white/20" aria-label="Collapse sidebar">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      <ul className="mb-5 space-y-1 border-t border-slate-200/70 pt-4 dark:border-white/10">
        {primary.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-white font-medium text-slate-900 shadow-card dark:bg-white/10 dark:text-white"
                    : "text-slate-600 hover:bg-white/70 dark:text-slate-400 dark:hover:bg-white/5"
                }`
              }
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} /> {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="space-y-5">
        <Collapsible title="Others">
          <ul className="space-y-1">
            {others.map(({ to, icon: Icon, label, tint }) => (
              <li key={to}>
                <NavLink to={to} className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  <span className={`grid h-6 w-6 place-items-center rounded-md text-white ${tint}`}><Icon className="h-3.5 w-3.5" /></span>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </Collapsible>

        <Collapsible title="Top Categories">
          {categories.length === 0 ? (
            <p className="px-1 text-xs text-slate-400">No categories yet.</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <NavLink to={`/courses?category=${c.slug}`} className="flex items-center gap-2.5 px-1 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                    <span className={`h-2 w-2 rounded-full ${categoryStyle(c.color).dot}`} /> {c.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </Collapsible>
      </div>

      {!promoHidden && (
        <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-navy-800">
          <Crown className="mb-3 h-6 w-6 text-accent-500" fill="currentColor" aria-hidden />
          <p className="text-sm font-medium text-slate-900 dark:text-white">AI-powered tutoring ✨</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Stuck on a topic? Ask the AI tutor for a step-by-step explanation.</p>
          <NavLink to="/tutor" className="btn-dark mt-3 w-full">Ask the Tutor</NavLink>
          <button onClick={hidePromo} className="mt-2 w-full text-center text-xs text-slate-500 hover:text-slate-700">Remind me later</button>
        </div>
      )}
    </aside>
  );
}
