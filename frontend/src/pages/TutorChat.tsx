import { Bot, Lightbulb, Plus, Send, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { ErrorState, Spinner } from "../components/ui/States";
import { api, errorMessage } from "../lib/api";
import { timeAgo } from "../lib/format";
import { streamTutorReply } from "../lib/sse";
import type { ChatMessage, Conversation, Paginated } from "../lib/types";

const MARKER = "<<FOLLOWUPS>>";
const STARTERS = [
  "Explain recursion with a simple analogy",
  "Help me understand derivatives step by step",
  "What's the difference between SQL and NoSQL?",
];

function Markdown({ text }: { text: string }) {
  return (
    <div className="prose-chat text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown>
    </div>
  );
}

export default function TutorChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const activeId = id ? Number(id) : null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [current, setCurrent] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [socratic, setSocratic] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(() => {
    api.get<Paginated<Conversation>>("/tutor/conversations/", { params: { page_size: 48 } })
      .then((r) => setConversations(r.data.results)).catch(() => {});
  }, []);
  useEffect(loadList, [loadList]);

  useEffect(() => {
    setError("");
    if (!activeId) { setCurrent(null); setMessages([]); return; }
    setLoading(true);
    api.get<Conversation>(`/tutor/conversations/${activeId}/`)
      .then((r) => { setCurrent(r.data); setMessages(r.data.messages ?? []); setSocratic(r.data.socratic_mode); })
      .catch((e) => setError(errorMessage(e, "Conversation not found.")))
      .finally(() => setLoading(false));
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setError("");
    setBusy(true);
    setInput("");

    let convo = current;
    try {
      if (!convo) {
        const { data } = await api.post<Conversation>("/tutor/conversations/", { socratic_mode: socratic });
        convo = data;
        setCurrent(data);
        navigate(`/tutor/${data.id}`, { replace: true });
      } else if (convo.socratic_mode !== socratic) {
        const { data } = await api.patch<Conversation>(`/tutor/conversations/${convo.id}/`, { socratic_mode: socratic });
        convo = data;
        setCurrent(data);
      }
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      return;
    }

    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content, follow_ups: [], created_at: new Date().toISOString() }]);
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    try {
      await streamTutorReply(convo.id, content, {
        onDelta: (t) => { acc += t; setStreaming(acc.split(MARKER)[0]!); },
        onDone: ({ message }) => { setMessages((m) => [...m, message as ChatMessage]); loadList(); },
        onError: (detail) => {
          setError(detail);
          setMessages((m) => m.filter((x) => !String(x.id).startsWith("tmp-") || x.content !== content));
          setInput(content);
        },
      }, controller.signal);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("Connection lost while the tutor was replying.");
    } finally {
      setStreaming("");
      setBusy(false);
      abortRef.current = null;
    }
  };

  const remove = async (c: Conversation) => {
    if (!window.confirm(`Delete "${c.title}"?`)) return;
    try {
      await api.delete(`/tutor/conversations/${c.id}/`);
      loadList();
      if (c.id === activeId) navigate("/tutor");
    } catch (e) { setError(errorMessage(e)); }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); send(input); };
  const last = messages[messages.length - 1];

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100%+3rem)] sm:-mx-6">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-100 p-3 dark:border-white/10 md:flex">
        <button className="btn-primary mb-3 w-full" onClick={() => navigate("/tutor")}><Plus className="h-4 w-4" /> New conversation</button>
        <ul className="flex-1 space-y-1 overflow-y-auto">
          {conversations.length === 0 && <li className="px-2 py-4 text-center text-xs text-slate-400">No conversations yet</li>}
          {conversations.map((c) => (
            <li key={c.id} className={`group flex items-center rounded-lg ${c.id === activeId ? "bg-brand-50 dark:bg-white/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
              <button className="min-w-0 flex-1 px-3 py-2 text-left" onClick={() => navigate(`/tutor/${c.id}`)}>
                <p className="truncate text-sm">{c.title}</p>
                <p className="text-[11px] text-slate-400">{timeAgo(c.updated_at)}</p>
              </button>
              <button onClick={() => remove(c)} className="mr-1 rounded p-1.5 text-slate-400 opacity-0 hover:text-red-600 group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${c.title}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {loading ? (
            <div className="grid h-full place-items-center"><Spinner label="Loading conversation" /></div>
          ) : messages.length === 0 && !streaming ? (
            <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white"><Bot className="h-7 w-7" /></div>
              <h1 className="text-xl font-semibold">What would you like to learn?</h1>
              <p className="mt-1 text-sm text-slate-500">Ask anything. Turn on Socratic mode if you'd rather be guided to the answer.</p>
              <div className="mt-6 grid w-full gap-2">
                {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="card px-4 py-3 text-left text-sm hover:border-brand-300">{s}</button>)}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
                  {m.role === "assistant" && <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10"><Bot className="h-4 w-4" /></div>}
                  <div className={m.role === "user" ? "max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white" : "min-w-0 flex-1"}>
                    {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown text={m.content} />}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex gap-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Bot className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1"><Markdown text={streaming + " ▍"} /></div>
                </div>
              )}
              {busy && !streaming && <Spinner label="Thinking" />}
              {!busy && last?.role === "assistant" && last.follow_ups.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-11">
                  {last.follow_ups.map((f) => <button key={f} onClick={() => send(f)} className="rounded-full border border-brand-200 px-3 py-1 text-xs text-brand-700 hover:bg-brand-50 dark:border-brand-500/30 dark:text-brand-200">{f}</button>)}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-4 dark:border-white/10 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {error && <div className="mb-3"><ErrorState message={error} /></div>}
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask the tutor anything…"
                maxLength={4000}
                className="input max-h-40 min-h-[44px] resize-none"
                aria-label="Message"
              />
              {busy ? (
                <button type="button" className="btn-dark h-11" onClick={() => abortRef.current?.abort()} aria-label="Stop"><Square className="h-4 w-4" /></button>
              ) : (
                <button className="btn-primary h-11" disabled={!input.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
              )}
            </form>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={socratic} onChange={(e) => setSocratic(e.target.checked)} />
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Socratic mode: guide me, don't tell me
              </label>
              <span>Replies are AI-generated and can be wrong.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
