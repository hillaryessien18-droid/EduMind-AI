import { CheckCircle2, Circle, Clock, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import CourseCover from "../components/courses/CourseCover";
import { ErrorState, Spinner, Toast } from "../components/ui/States";
import { api, errorMessage } from "../lib/api";
import { categoryStyle, formatPrice } from "../lib/format";
import type { Course, Lesson } from "../lib/types";

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState<Lesson | null>(null);
  const [toast, setToast] = useState("");
  const [openedAt, setOpenedAt] = useState(Date.now());

  const load = useCallback(() => {
    setError("");
    api.get<Course>(`/courses/${id}/`).then((r) => {
      setCourse(r.data);
      setActive((prev) => prev ?? r.data.modules?.[0]?.lessons[0] ?? null);
    }).catch((e) => setError(errorMessage(e, "Course not found.")));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => setOpenedAt(Date.now()), [active?.id]);

  const enroll = async () => {
    try { await api.post(`/courses/${id}/enroll/`); setToast("You're enrolled!"); load(); } catch (e) { setToast(errorMessage(e)); }
  };

  const complete = async (lesson: Lesson) => {
    try {
      await api.post(`/lessons/${lesson.id}/complete/`, { time_spent_seconds: Math.round((Date.now() - openedAt) / 1000) });
      setToast("Lesson marked complete.");
      setActive({ ...lesson, completed: true });
      load();
    } catch (e) { setToast(errorMessage(e)); }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!course) return <div className="grid place-items-center py-24"><Spinner label="Loading course" /></div>;

  const lessons = course.modules?.flatMap((m) => m.lessons) ?? [];
  const done = lessons.filter((l) => l.completed).length;

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden lg:flex">
        <CourseCover course={course} className="h-48 lg:h-auto lg:w-80" />
        <div className="flex-1 p-6">
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${categoryStyle(course.category?.color).pill}`}>{course.category?.name ?? "General"}</span>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{course.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{course.description || "No description yet."}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span>By <b className="text-slate-800 dark:text-slate-200">{course.instructor.display_name}</b></span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {course.student_count} learners</span>
            <span className="capitalize">{course.level}</span>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">{formatPrice(course.price)}</span>
          </div>
          <div className="mt-5 flex gap-2">
            {course.is_enrolled ? (
              <span className="btn-soft">Enrolled · {done}/{lessons.length} lessons done</span>
            ) : course.status === "published" ? (
              <button className="btn-primary" onClick={enroll}>Enroll now</button>
            ) : (
              <span className="btn-ghost">Draft: publish it to allow enrollment</span>
            )}
            <Link to="/tutor" className="btn-ghost">Ask the AI tutor</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="card p-4">
          <h2 className="mb-3 font-semibold">Curriculum</h2>
          {(course.modules ?? []).length === 0 && <p className="text-sm text-slate-500">No modules yet.</p>}
          {course.modules?.map((m) => (
            <div key={m.id} className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{m.title}</p>
              <ul>
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <button onClick={() => setActive(l)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${active?.id === l.id ? "bg-brand-50 text-brand-700 dark:bg-white/10 dark:text-white" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
                      {l.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-slate-300" />}
                      <span className="flex-1 truncate">{l.title}</span>
                      <span className="text-xs text-slate-400">{l.estimated_minutes}m</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
        <section className="card p-6 lg:col-span-2">
          {active ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{active.title}</h2>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> {active.estimated_minutes} min</span>
              </div>
              <div className="prose-chat text-sm leading-relaxed"><ReactMarkdown>{active.content || "_This lesson has no content yet._"}</ReactMarkdown></div>
              {course.is_enrolled && (
                <button className="btn-primary mt-6" disabled={active.completed} onClick={() => complete(active)}>
                  {active.completed ? "Completed" : "Mark as complete"}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">Select a lesson to start.</p>
          )}
        </section>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
