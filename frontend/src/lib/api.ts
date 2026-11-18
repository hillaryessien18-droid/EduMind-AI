import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api";

const ACCESS = "edumind.access";
const REFRESH = "edumind.refresh";

export const tokens = {
  get access() { return localStorage.getItem(ACCESS); },
  get refresh() { return localStorage.getItem(REFRESH); },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = tokens.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (!tokens.refresh) return null;
  refreshing ??= axios
    .post(`${API_URL}/auth/refresh/`, { refresh: tokens.refresh })
    .then((res) => {
      tokens.set(res.data.access, res.data.refresh);
      return res.data.access as string;
    })
    .catch(() => {
      tokens.clear();
      return null;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry && tokens.refresh) {
      original._retry = true;
      const access = await refreshAccessToken();
      if (access) {
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      }
      window.dispatchEvent(new Event("edumind:logout"));
    }
    return Promise.reject(error);
  },
);

/** Turn any API error into a readable message. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "Can't reach the server. Is the backend running?";
    const data = err.response.data as Record<string, unknown> | undefined;
    if (data && typeof data === "object") {
      if (typeof data.detail === "string") return data.detail;
      const first = Object.entries(data)[0];
      if (first) {
        const [field, val] = first;
        const msg = Array.isArray(val) ? String(val[0]) : String(val);
        return field === "non_field_errors" ? msg : `${field.replace(/_/g, " ")}: ${msg}`;
      }
    }
  }
  return fallback;
}
