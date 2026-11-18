import { Trash2, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "../../lib/api";
import type { Category, Course } from "../../lib/types";
import Modal from "../ui/Modal";
import { ErrorState } from "../ui/States";

export function CreateCourseModal({ categories, onClose, onCreated }: {
  categories: Category[]; onClose: () => void; onCreated: (c: Course) => void;
}) {
  const [form, setForm] = useState({
    title: "", description: "", category_id: "", level: "beginner", price: "0", original_price: "", status: "draft",
  });
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== "") body.append(k, v); });
    if (thumbnail) body.append("thumbnail", thumbnail);
    try {
      const { data } = await api.post<Course>("/courses/", body);
      onCreated(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Create course"
      onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" form="create-course" disabled={saving}>{saving ? "Creating…" : "Create course"}</button>
      </>}
    >
      <form id="create-course" onSubmit={submit} className="space-y-4">
        {error && <ErrorState message={error} />}
        <label className="block text-sm font-medium">Title
          <input required maxLength={160} className="input mt-1" value={form.title} onChange={set("title")} />
        </label>
        <label className="block text-sm font-medium">Description
          <textarea rows={3} className="input mt-1" value={form.description} onChange={set("description")} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium">Category
            <select className="input mt-1" value={form.category_id} onChange={set("category_id")}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Level
            <select className="input mt-1" value={form.level} onChange={set("level")}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="block text-sm font-medium">Price (USD)
            <input type="number" min="0" step="0.01" className="input mt-1" value={form.price} onChange={set("price")} />
          </label>
          <label className="block text-sm font-medium">Original price
            <input type="number" min="0" step="0.01" placeholder="Optional" className="input mt-1" value={form.original_price} onChange={set("original_price")} />
          </label>
        </div>
        <label className="block text-sm font-medium">Cover image <span className="font-normal text-slate-400">(JPEG/PNG/WebP, max 5 MB)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.status === "published"} onChange={(e) => setForm({ ...form, status: e.target.checked ? "published" : "draft" })} />
          Publish immediately
        </label>
      </form>
    </Modal>
  );
}

const COLORS = ["orange", "purple", "green", "amber", "teal", "blue", "emerald", "pink"];

export function CategoriesModal({ categories, canEdit, onClose, onChanged }: {
  categories: Category[]; canEdit: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("purple");
  const [error, setError] = useState("");

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/categories/", { name, color });
      setName("");
      onChanged();
    } catch (err) { setError(errorMessage(err)); }
  };

  const remove = async (c: Category) => {
    try { await api.delete(`/categories/${c.id}/`); onChanged(); } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <Modal title="Manage categories" onClose={onClose}>
      {error && <div className="mb-3"><ErrorState message={error} /></div>}
      <ul className="divide-y divide-slate-100 dark:divide-white/10">
        {categories.length === 0 && <li className="py-3 text-sm text-slate-500">No categories yet.</li>}
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
            <span>{c.name} <span className="text-slate-400">· {c.course_count ?? 0} courses</span></span>
            {canEdit && (
              <button onClick={() => remove(c)} className="rounded p-1 text-slate-400 hover:text-red-600" aria-label={`Delete ${c.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form onSubmit={add} className="mt-4 flex gap-2">
          <input required className="input" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input w-32" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Colour">
            {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn-primary shrink-0">Add</button>
        </form>
      )}
    </Modal>
  );
}

interface ImportShape {
  title: string;
  description?: string;
  level?: string;
  modules?: { title: string; lessons?: { title: string; content?: string; estimated_minutes?: number }[] }[];
}

/** Imports a course from a JSON file: { title, description, modules: [{ title, lessons: [{ title, content }] }] } */
export function ImportCourseModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportShape | null>(null);

  const read = async (file: File) => {
    setError("");
    if (file.size > 1024 * 1024) return setError("File is larger than 1 MB.");
    try {
      const data = JSON.parse(await file.text()) as ImportShape;
      if (!data || typeof data.title !== "string" || !data.title.trim()) throw new Error("missing title");
      setPreview(data);
    } catch {
      setError("That file isn't a valid course JSON (it needs at least a \"title\").");
    }
  };

  const run = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const { data: course } = await api.post<Course>("/courses/", {
        title: preview.title, description: preview.description ?? "", level: preview.level ?? "beginner",
      });
      for (const [mi, m] of (preview.modules ?? []).entries()) {
        const { data: mod } = await api.post("/modules/", { course: course.id, title: m.title, order: mi });
        for (const [li, l] of (m.lessons ?? []).entries()) {
          await api.post("/lessons/", { module: mod.id, title: l.title, content: l.content ?? "", estimated_minutes: l.estimated_minutes ?? 10, order: li });
        }
      }
      onImported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Import course"
      onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={run} disabled={!preview || busy}>{busy ? "Importing…" : "Import as draft"}</button>
      </>}
    >
      {error && <div className="mb-3"><ErrorState message={error} /></div>}
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 hover:bg-slate-50 dark:border-white/20 dark:hover:bg-white/5">
        <Upload className="h-6 w-6 text-brand-500" />
        Choose a course .json file
        <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      </label>
      {preview && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-white/5">
          <p className="font-medium">{preview.title}</p>
          <p className="text-slate-500">
            {preview.modules?.length ?? 0} modules · {preview.modules?.reduce((n, m) => n + (m.lessons?.length ?? 0), 0) ?? 0} lessons
          </p>
        </div>
      )}
    </Modal>
  );
}
