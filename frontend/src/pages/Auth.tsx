import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/layout/Logo";
import { ErrorState } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";

function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-navy-900 via-navy-700 to-brand-700 p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-3 text-lg font-semibold"><Logo /> EduMind AI</Link>
        <div>
          <h2 className="text-4xl font-semibold leading-tight">Learn Smarter.<br />Grow Faster.<br />Achieve More.</h2>
          <p className="mt-4 max-w-md text-brand-100/80">Personal AI tutoring, structured courses and progress you can actually see.</p>
        </div>
        <p className="text-sm text-brand-100/60">© {new Date().getFullYear()} EduMind AI</p>
      </div>
      <div className="flex items-center justify-center bg-white p-6 dark:bg-navy-900">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 font-semibold lg:hidden"><Logo className="h-8 w-8" /> EduMind AI</Link>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? "/courses";

  if (user) return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Incorrect email or password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle={<>New here? <Link to="/register" className="font-medium text-brand-600">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorState message={error} />}
        <label className="block text-sm font-medium">Email
          <input type="email" required autoComplete="email" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block text-sm font-medium">Password
          <input type="password" required autoComplete="current-password" className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn-primary h-11 w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "", role: "student" as "student" | "tutor" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/courses" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form);
      navigate("/courses", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle={<>Already have one? <Link to="/login" className="font-medium text-brand-600">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorState message={error} />}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">First name
            <input required className="input mt-1" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Last name
            <input className="input mt-1" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </label>
        </div>
        <label className="block text-sm font-medium">Email
          <input type="email" required autoComplete="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="block text-sm font-medium">Password
          <input type="password" required minLength={8} autoComplete="new-password" className="input mt-1" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <fieldset>
          <legend className="text-sm font-medium">I want to</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["student", "tutor"] as const).map((r) => (
              <label key={r} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${form.role === r ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200" : "border-slate-200 dark:border-white/10"}`}>
                <input type="radio" name="role" className="sr-only" checked={form.role === r} onChange={() => setForm({ ...form, role: r })} />
                {r === "student" ? "Learn" : "Teach"}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="btn-primary h-11 w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
      </form>
    </AuthShell>
  );
}
