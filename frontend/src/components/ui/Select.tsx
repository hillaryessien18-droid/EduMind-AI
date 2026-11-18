import { ChevronDown } from "lucide-react";

export interface Option { value: string; label: string }

export default function Select({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: Option[]; label: string;
}) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 appearance-none rounded-lg border border-slate-200 bg-white py-0 pl-3 pr-9 text-sm text-slate-700 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-white/10 dark:bg-navy-800 dark:text-slate-200"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </label>
  );
}
