import { BarChart3, Bot, BookOpen, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../components/layout/Logo";

const features = [
  { icon: Bot, title: "AI personal tutor", text: "Step-by-step explanations, hints before answers, and a Socratic mode." },
  { icon: BookOpen, title: "Structured courses", text: "Modules and lessons built by tutors, with enrollment and progress." },
  { icon: CheckCircle2, title: "Fair quizzes", text: "Objective questions are graded by rules, not guesses." },
  { icon: BarChart3, title: "Real progress", text: "Streaks, lessons and quiz scores from your actual activity." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-navy-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-semibold"><Logo className="h-8 w-8" /> EduMind AI</div>
        <nav className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost">Sign in</Link>
          <Link to="/register" className="btn-primary">Get started</Link>
        </nav>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">AI-powered learning platform</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight text-navy-900 dark:text-white sm:text-6xl">
          Learn Smarter. <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">Grow Faster.</span> Achieve More.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500">Personal AI tutoring, interactive courses and progress tracking for students, professionals and self-learners.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/register" className="btn-primary h-12 px-6 text-base">Start learning free</Link>
          <Link to="/login" className="btn-soft h-12 px-6 text-base">I have an account</Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card p-6">
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><Icon className="h-5 w-5" /></div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
