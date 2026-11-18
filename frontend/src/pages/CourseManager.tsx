import { CircleHelp, CloudUpload, LayoutGrid, List, ListFilter, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CourseCard, { ExpandCatalogCard, type CardAction } from "../components/courses/CourseCard";
import { CategoriesModal, CreateCourseModal, ImportCourseModal } from "../components/courses/CourseModals";
import Pagination from "../components/courses/Pagination";
import Select from "../components/ui/Select";
import { EmptyState, ErrorState, Spinner, Toast } from "../components/ui/States";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../lib/api";
import { categoryStyle, formatPrice } from "../lib/format";
import type { Category, Course, Instructor, Paginated } from "../lib/types";

type ModalKind = "create" | "categories" | "import" | null;

export default function CourseManager({ enrolledOnly = false }: { enrolledOnly?: boolean }) {
  const { user } = useAuth();
  const canManage = user?.role === "tutor" || user?.role === "admin";
  const [params, setParams] = useSearchParams();

  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const author = params.get("author") ?? "";
  const scope = params.get("scope") ?? "all";
  const page = Number(params.get("page") ?? 1);
  const pageSize = Number(params.get("page_size") ?? 8);

  const [searchInput, setSearchInput] = useState(search);
  const [data, setData] = useState<Paginated<Course> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [modal, setModal] = useState<ModalKind>(null);
  const [toast, setToast] = useState("");

  const update = useCallback((patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null || v === "" ? next.delete(k) : next.set(k, String(v))));
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  }, [params, setParams]);

  // Debounced search box -> URL
  useEffect(() => { setSearchInput(search); }, [search]);
  useEffect(() => {
    const t = setTimeout(() => { if (searchInput !== search) update({ search: searchInput }); }, 350);
    return () => clearTimeout(t);
  }, [searchInput, search, update]);

  const loadMeta = useCallback(() => {
    api.get<Category[]>("/categories/").then((r) => setCategories(r.data)).catch(() => {});
    api.get<Instructor[]>("/courses/authors/").then((r) => setAuthors(r.data)).catch(() => {});
  }, []);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");
    const q: Record<string, string | number> = { page, page_size: pageSize };
    if (search) q.search = search;
    if (category) q.category = category;
    if (author) q.author = author;
    if (enrolledOnly || scope === "enrolled") q.enrolled = 1;
    if (scope === "published" || scope === "draft") q.status = scope;
    if (scope === "mine") q.mine = 1;
    try {
      const { data } = await api.get<Paginated<Course>>("/courses/", { params: q });
      setData(data);
    } catch (err) {
      if ((err as { response?: { status?: number } }).response?.status === 404 && page > 1) update({ page: 1 });
      else setError(errorMessage(err, "Couldn't load courses."));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, category, author, scope, enrolledOnly, update]);

  useEffect(loadMeta, [loadMeta]);
  useEffect(() => { loadCourses(); }, [loadCourses]);

  const scopeOptions = useMemo(() => {
    const opts = [{ value: "all", label: "All courses" }, { value: "enrolled", label: "Enrolled" }];
    if (canManage) opts.push({ value: "mine", label: "My courses" }, { value: "published", label: "Published" }, { value: "draft", label: "Drafts" });
    return opts;
  }, [canManage]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try { await fn(); setToast(success); loadCourses(); loadMeta(); } catch (err) { setToast(errorMessage(err)); }
  };

  const actionsFor = (c: Course): CardAction[] => {
    const owns = user?.role === "admin" || c.instructor.id === user?.id;
    const list: CardAction[] = [];
    if (c.status === "published") {
      list.push(c.is_enrolled
        ? { label: "Unenroll", onClick: () => run(() => api.delete(`/courses/${c.id}/enroll/`), "Unenrolled.") }
        : { label: "Enroll", onClick: () => run(() => api.post(`/courses/${c.id}/enroll/`), `Enrolled in ${c.title}.`) });
    }
    if (owns) {
      list.push({
        label: c.status === "published" ? "Unpublish" : "Publish",
        onClick: () => run(() => api.post(`/courses/${c.id}/publish/`), c.status === "published" ? "Course unpublished." : "Course published."),
      });
      list.push({
        label: "Delete", danger: true,
        onClick: () => { if (window.confirm(`Delete "${c.title}"? This can't be undone.`)) run(() => api.delete(`/courses/${c.id}/`), "Course deleted."); },
      });
    }
    return list;
  };

  const courses = data?.results ?? [];
  const isLastPage = !data?.next;
  const filtersActive = Boolean(search || category || author || scope !== "all");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5 dark:border-white/10">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {enrolledOnly ? "My learning" : canManage ? "Course manager" : "Course catalog"}
            <CircleHelp className="h-4 w-4 text-slate-400" aria-hidden />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {enrolledOnly ? "Courses you're enrolled in." : canManage ? "Review and manage your school courses." : "Browse courses and start learning."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {canManage && (
            <button className="btn-ghost" onClick={() => setModal("import")}><CloudUpload className="h-4 w-4" /> Import Course</button>
          )}
          <button className="btn-ghost" onClick={() => setModal("categories")}><ListFilter className="h-4 w-4" /> {canManage ? "Manage Categories" : "Categories"}</button>
          {canManage ? (
            <button className="btn-primary ml-2 h-11 px-5" onClick={() => setModal("create")}>Create Course</button>
          ) : (
            <Link to="/tutor" className="btn-primary ml-2 h-11 px-5">Ask AI Tutor</Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search courses</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input h-10 pl-9" placeholder="Search courses" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </label>
        {!enrolledOnly && <Select label="Course scope" value={scope} onChange={(v) => update({ scope: v === "all" ? null : v })} options={scopeOptions} />}
        <Select label="Category" value={category} onChange={(v) => update({ category: v })}
          options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} />
        <Select label="Author" value={author} onChange={(v) => update({ author: v })}
          options={[{ value: "", label: "All authors" }, ...authors.map((a) => ({ value: String(a.id), label: a.display_name }))]} />
        <button className="icon-btn ml-auto" onClick={() => setView(view === "grid" ? "list" : "grid")} aria-label={view === "grid" ? "Show as list" : "Show as grid"}>
          {view === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadCourses} />
      ) : loading && !data ? (
        <div className="grid place-items-center py-24"><Spinner label="Loading courses" /></div>
      ) : courses.length === 0 && !canManage ? (
        <EmptyState
          title={filtersActive || enrolledOnly ? "No matching courses" : "No courses yet"}
          description={enrolledOnly ? "Enroll in a course from the catalog to see it here." : "Try a different search or filter."}
          action={enrolledOnly ? <Link to="/courses" className="btn-soft">Browse courses</Link> : filtersActive ? <button className="btn-soft" onClick={() => setParams({})}>Clear filters</button> : undefined}
        />
      ) : view === "grid" ? (
        <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          {courses.map((c) => <CourseCard key={c.id} course={c} actions={actionsFor(c)} />)}
          {isLastPage && !enrolledOnly && <ExpandCatalogCard canCreate={canManage} onCreate={() => setModal("create")} />}
        </div>
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-white/10">
          {courses.map((c) => (
            <Link key={c.id} to={`/courses/${c.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5">
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${categoryStyle(c.category?.color).pill}`}>{c.category?.name ?? "General"}</span>
              <span className="flex-1 truncate font-medium">{c.title}</span>
              <span className="hidden text-sm text-slate-500 sm:inline">{c.instructor.display_name}</span>
              <span className="hidden text-sm text-slate-500 md:inline">{c.lesson_count} lessons · {c.student_count} learners</span>
              {c.status === "draft" && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-white/10">Draft</span>}
              <span className="w-16 text-right font-semibold">{formatPrice(c.price)}</span>
            </Link>
          ))}
          {courses.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No courses match.</p>}
        </div>
      )}

      {data && data.count > 0 && (
        <Pagination page={page} pageSize={pageSize} count={data.count}
          onPage={(p) => update({ page: p })} onPageSize={(n) => update({ page_size: n })} />
      )}

      {modal === "create" && (
        <CreateCourseModal categories={categories} onClose={() => setModal(null)}
          onCreated={(c) => { setModal(null); setToast(`Created "${c.title}".`); loadCourses(); loadMeta(); }} />
      )}
      {modal === "categories" && (
        <CategoriesModal categories={categories} canEdit={canManage} onClose={() => setModal(null)} onChanged={loadMeta} />
      )}
      {modal === "import" && (
        <ImportCourseModal onClose={() => setModal(null)} onImported={() => { setModal(null); setToast("Course imported as a draft."); loadCourses(); loadMeta(); }} />
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}
