import { ChevronLeft, ChevronRight } from "lucide-react";
import Select from "../ui/Select";

function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, "…", total];
  if (current >= total - 2) return [1, "…", total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

export default function Pagination({ page, pageSize, count, onPage, onPageSize }: {
  page: number; pageSize: number; count: number; onPage: (p: number) => void; onPageSize: (n: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button className="grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="grid h-10 w-10 place-items-center text-sm text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={`grid h-10 w-10 place-items-center rounded-full text-sm ${p === page ? "bg-slate-100 font-medium text-slate-900 dark:bg-white/10 dark:text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"}`}
            >
              {p}
            </button>
          ),
        )}
        <button className="grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-white/5" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>Show:</span>
        <Select label="Courses per page" value={String(pageSize)} onChange={(v) => onPageSize(Number(v))}
          options={[8, 12, 16, 24].map((n) => ({ value: String(n), label: pad(n) }))} />
        <span className="text-xs">Per Page</span>
        <span className="text-xs">{pad(from)} - {pad(to)} of {count}</span>
      </div>
    </div>
  );
}
