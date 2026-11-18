import { BookOpen, CheckCircle2, Clock, Flame, MessageSquareText, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, ErrorState, Spinner } from "../components/ui/States";
import { api, errorMessage } from "../lib/api";
import { timeAgo } from "../lib/format";
import type { Dashboard as DashboardData } from "../lib/types";

function Stat({ icon: Icon, label, value, tint }: { icon: typeof BookOpen; label: string; value: string | number; tint: string }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${tint}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    api.get<DashboardData>("/dashboard/").then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <div className="grid place-items-center py-24"><Spinner label="Loading your progress" /></div>;

  const { stats } = data;
  const chart = data.weekly_activity.map((d) => ({ ...d, day: new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome back, {data.user.display_name} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Here's how your learning is going.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpen} label="Enrolled courses" value={stats.enrolled_courses} tint="bg-brand-50 text-brand-600 dark:bg-brand-500/10" />
        <Stat icon={CheckCircle2} label="Lessons completed" value={stats.completed_lessons} tint="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" />
        <Stat icon={Flame} label="Day streak" value={stats.streak_days} tint="bg-orange-50 text-orange-600 dark:bg-orange-500/10" />
        <Stat icon={Trophy} label="Quiz average" value={stats.quiz_average === null ? "—" : `${stats.quiz_average}%`} tint="bg-accent-500/10 text-accent-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Weekly study activity</h2>
            <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> {stats.learning_minutes} min total</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip formatter={(v) => [`${v} min`, "Studied"]} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                <Bar dataKey="minutes" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Recent AI conversations</h2>
          {data.recent_conversations.length === 0 ? (
            <p className="text-sm text-slate-500">No conversations yet. <Link to="/tutor" className="text-brand-600">Ask the tutor</Link>.</p>
          ) : (
            <ul className="space-y-2">
              {data.recent_conversations.map((c) => (
                <li key={c.id}>
                  <Link to={`/tutor/${c.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-white/5">
                    <MessageSquareText className="h-4 w-4 shrink-0 text-brand-500" />
                    <span className="flex-1 truncate text-sm">{c.title}</span>
                    <span className="text-xs text-slate-400">{timeAgo(c.updated_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Course progress</h2>
        {data.courses.length === 0 ? (
          <EmptyState title="You're not enrolled in any course" description="Pick a course from the catalog to start tracking progress."
            action={<Link to="/courses" className="btn-soft">Browse courses</Link>} />
        ) : (
          <ul className="space-y-4">
            {data.courses.map((c) => (
              <li key={c.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <Link to={`/courses/${c.id}`} className="font-medium hover:text-brand-600">{c.title}</Link>
                  <span className="text-slate-500">{c.completed_lessons}/{c.total_lessons} lessons · {c.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${c.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
