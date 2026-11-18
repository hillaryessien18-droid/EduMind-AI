import { Clock } from "lucide-react";
import { Link } from "react-router-dom";

/** Placeholder for features scheduled in later phases, so navigation never dead-ends. */
export default function Planned({ feature, phase }: { feature: string; phase: number }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10"><Clock className="h-6 w-6" /></div>
      <h1 className="text-xl font-semibold">{feature}</h1>
      <p className="mt-2 text-sm text-slate-500">Planned for Phase {phase} of the EduMind roadmap. It isn't built yet.</p>
      <Link to="/tutor" className="btn-soft mt-6">Use the AI tutor meanwhile</Link>
    </div>
  );
}
