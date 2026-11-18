import { useEffect, useState } from "react";
import { EmptyState, ErrorState, Spinner } from "../components/ui/States";
import { api, errorMessage } from "../lib/api";
import type { Paginated } from "../lib/types";

interface Attempt { id: number; quiz_title: string; submitted_at: string; score: number; max_score: number; percent: number }

export default function Gradebook() {
  const [data, setData] = useState<Paginated<Attempt> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Paginated<Attempt>>("/quiz-attempts/", { params: { page_size: 48 } })
      .then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <div className="grid place-items-center py-24"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Gradebook</h1>
        <p className="mt-1 text-sm text-slate-500">Your quiz attempts. Objective questions are graded automatically by rule.</p>
      </div>
      {data.results.length === 0 ? (
        <EmptyState title="No quiz attempts yet" description="Quizzes you take inside your courses will show up here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr><th className="p-4">Quiz</th><th className="p-4">Submitted</th><th className="p-4">Score</th><th className="p-4">Result</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {data.results.map((a) => (
                <tr key={a.id}>
                  <td className="p-4 font-medium">{a.quiz_title}</td>
                  <td className="p-4 text-slate-500">{new Date(a.submitted_at).toLocaleString()}</td>
                  <td className="p-4">{a.score}/{a.max_score}</td>
                  <td className="p-4">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${a.percent >= 50 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{a.percent}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
