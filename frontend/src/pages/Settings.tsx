import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorState, Toast } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api, errorMessage, tokens } from "../lib/api";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: user?.first_name ?? "", last_name: user?.last_name ?? "" });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try { await api.patch("/auth/me/", form); await refreshUser(); setToast("Profile saved."); } catch (err) { setError(errorMessage(err)); }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account and all your learning data? This can't be undone.")) return;
    try {
      await api.delete("/auth/me/");
      tokens.clear();
      window.location.assign("/");
    } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Profile &amp; settings</h1>
      {error && <ErrorState message={error} />}
      <form onSubmit={save} className="card space-y-4 p-6">
        <h2 className="font-semibold">Profile</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">First name
            <input className="input mt-1" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Last name
            <input className="input mt-1" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </label>
        </div>
        <p className="text-sm text-slate-500">{user?.email} · <span className="capitalize">{user?.role}</span></p>
        <button className="btn-primary">Save changes</button>
      </form>
      <div className="card flex items-center justify-between p-6">
        <div><h2 className="font-semibold">Appearance</h2><p className="text-sm text-slate-500">Currently {theme} mode.</p></div>
        <button className="btn-soft" onClick={toggle}>Switch to {theme === "dark" ? "light" : "dark"}</button>
      </div>
      <div className="card border-red-200 p-6 dark:border-red-500/30">
        <h2 className="font-semibold text-red-600">Delete account</h2>
        <p className="mt-1 text-sm text-slate-500">Permanently removes your account, enrollments, progress and AI conversations.</p>
        <button className="btn mt-4 bg-red-600 text-white hover:bg-red-700" onClick={deleteAccount}>Delete my account</button>
        <button className="btn-ghost ml-2 mt-4" onClick={() => navigate(-1)}>Cancel</button>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
