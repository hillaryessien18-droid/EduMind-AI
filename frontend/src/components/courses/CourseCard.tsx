import { EllipsisVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { categoryStyle, formatPrice } from "../../lib/format";
import type { Course } from "../../lib/types";
import CourseCover from "./CourseCover";

export interface CardAction { label: string; onClick: () => void; danger?: boolean }

export default function CourseCard({ course, actions }: { course: Course; actions: CardAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const style = categoryStyle(course.category?.color);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-card dark:border-white/10 dark:bg-navy-800">
      <div className="relative">
        <CourseCover course={course} />
        {course.status === "draft" && (
          <span className="absolute left-3 top-3 rounded-md bg-slate-900/80 px-2 py-0.5 text-[11px] font-medium text-white">Draft</span>
        )}
        {actions.length > 0 && (
          <div ref={ref} className="absolute right-3 top-3">
            <button
              onClick={() => setOpen((o) => !o)}
              className="grid h-7 w-7 place-items-center rounded-md bg-white/90 text-slate-700 shadow-sm hover:bg-white"
              aria-label={`Actions for ${course.title}`}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <EllipsisVertical className="h-4 w-4" />
            </button>
            {open && (
              <div role="menu" className="card absolute right-0 top-9 z-20 w-44 p-1">
                {actions.map((a) => (
                  <button
                    key={a.label}
                    role="menuitem"
                    onClick={() => { setOpen(false); a.onClick(); }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5 ${a.danger ? "text-red-600" : ""}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 pt-5">
        <span className={`self-start rounded-md px-2 py-0.5 text-[11px] font-medium ${style.pill}`}>
          {course.category?.name ?? "General"}
        </span>
        <h3 className="mt-2 line-clamp-2 min-h-[2.75rem] text-[17px] font-semibold leading-snug text-slate-900 dark:text-white">
          {course.title}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-2 pt-6">
          <p className="truncate text-xs text-slate-500">
            By <span className="font-semibold text-slate-800 dark:text-slate-200">{course.instructor.display_name}</span>
          </p>
          <div className="flex shrink-0 items-end gap-2">
            {course.discount_percent > 0 && (
              <div className="text-right text-[11px] leading-tight">
                <p className="text-slate-700 dark:text-slate-300">{course.discount_percent}% off</p>
                <p className="text-red-400 line-through">/{formatPrice(course.original_price)}</p>
              </div>
            )}
            <p className="text-[28px] font-semibold leading-none text-slate-900 dark:text-white">{formatPrice(course.price)}</p>
          </div>
        </div>

        <Link to={`/courses/${course.id}`} className="btn-soft mt-5 w-full">View Details</Link>
      </div>
    </article>
  );
}

export function ExpandCatalogCard({ onCreate, canCreate }: { onCreate: () => void; canCreate: boolean }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-white/10 dark:bg-navy-800">
      <h3 className="text-[17px] font-semibold text-slate-900 dark:text-white">
        {canCreate ? "Expand your catalog" : "Learn anything with AI"}
      </h3>
      <p className="mt-2 max-w-[210px] text-xs leading-relaxed text-slate-500">
        {canCreate
          ? "Build your own courses, organise modules and lessons, then publish when they're ready."
          : "Can't find a course? Ask the AI tutor to explain any topic step by step."}
      </p>
      {canCreate ? (
        <button onClick={onCreate} className="btn-soft mt-4">✎ Create course</button>
      ) : (
        <Link to="/tutor" className="btn-soft mt-4">Ask the AI tutor</Link>
      )}
    </div>
  );
}
