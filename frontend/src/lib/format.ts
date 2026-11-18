export function formatPrice(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!n) return "Free";
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Tailwind classes for category pills, keyed by Category.color. */
export const CATEGORY_STYLES: Record<string, { pill: string; dot: string; from: string; to: string }> = {
  orange: { pill: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300", dot: "bg-orange-500", from: "from-orange-200", to: "to-rose-200" },
  purple: { pill: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300", dot: "bg-purple-500", from: "from-violet-200", to: "to-indigo-200" },
  green: { pill: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300", dot: "bg-green-500", from: "from-emerald-200", to: "to-lime-100" },
  amber: { pill: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300", dot: "bg-amber-500", from: "from-amber-100", to: "to-orange-200" },
  teal: { pill: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300", dot: "bg-teal-500", from: "from-teal-100", to: "to-cyan-200" },
  blue: { pill: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300", dot: "bg-blue-500", from: "from-sky-100", to: "to-blue-200" },
  emerald: { pill: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300", dot: "bg-emerald-500", from: "from-emerald-100", to: "to-teal-200" },
  pink: { pill: "bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300", dot: "bg-pink-500", from: "from-pink-100", to: "to-fuchsia-200" },
};

export const categoryStyle = (color?: string) => CATEGORY_STYLES[color ?? ""] ?? CATEGORY_STYLES.purple!;
