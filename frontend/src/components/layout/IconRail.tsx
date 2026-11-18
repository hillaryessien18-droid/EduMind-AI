import {
  BarChart3, Bell, BookOpen, Bot, CalendarDays, CircleHelp, Home, LogOut, Settings, Sparkles,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Logo from "./Logo";

const items = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/courses", icon: BookOpen, label: "Courses" },
  { to: "/tutor", icon: Bot, label: "AI Tutor" },
  { to: "/generator", icon: Sparkles, label: "Course Generator" },
  { to: "/planner", icon: CalendarDays, label: "Study Planner" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const railLink = ({ isActive }: { isActive: boolean }) =>
  `grid h-10 w-10 place-items-center rounded-xl transition ${
    isActive
      ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5"
  }`;

export default function IconRail() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav aria-label="Main" className="hidden w-[76px] shrink-0 flex-col items-center border-r border-slate-100 py-5 dark:border-white/10 md:flex">
      <NavLink to="/dashboard" aria-label="EduMind home"><Logo /></NavLink>
      <div className="my-5 h-px w-8 bg-slate-200 dark:bg-white/10" />
      <ul className="flex flex-1 flex-col items-center gap-2">
        {items.map(({ to, icon: Icon, label }, i) => (
          <li key={to} className={i === 3 ? "mt-4" : undefined}>
            <NavLink to={to} className={railLink} title={label} aria-label={label} end={to === "/tutor" ? false : undefined}>
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
        <a href="https://github.com" target="_blank" rel="noreferrer" className={railLink({ isActive: false })} title="Help" aria-label="Help">
          <CircleHelp className="h-5 w-5" strokeWidth={1.8} />
        </a>
        <button
          onClick={async () => { await logout(); navigate("/login"); }}
          className={railLink({ isActive: false })}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </div>
    </nav>
  );
}
