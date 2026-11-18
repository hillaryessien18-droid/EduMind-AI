import { BookOpen, Brain, Cloud, Code2, Megaphone, PenTool, Shield, Target } from "lucide-react";
import { categoryStyle } from "../../lib/format";
import type { Course } from "../../lib/types";

const ICONS: Record<string, typeof BookOpen> = {
  design: PenTool, development: Code2, "machine-learning": Brain, architecture: Cloud,
  management: Target, marketing: Megaphone, cybersecurity: Shield,
};

/** Uses the uploaded thumbnail, or a generated cover in the category's colours. */
export default function CourseCover({ course, className = "h-[138px]" }: { course: Course; className?: string }) {
  if (course.thumbnail) {
    return <img src={course.thumbnail} alt="" className={`w-full object-cover ${className}`} loading="lazy" />;
  }
  const style = categoryStyle(course.category?.color);
  const Icon = ICONS[course.category?.slug ?? ""] ?? BookOpen;
  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-br ${style.from} ${style.to} ${className}`} aria-hidden>
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/30" />
      <div className="absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-white/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.45)_1px,transparent_0)] [background-size:14px_14px]" />
      <div className="absolute bottom-4 left-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/80 shadow-sm backdrop-blur">
        <Icon className="h-7 w-7 text-slate-700" strokeWidth={1.6} />
      </div>
      <span className="absolute bottom-4 right-4 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-700">
        {course.level}
      </span>
    </div>
  );
}
