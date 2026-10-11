import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { streamChat, type ChatMessage } from '@/lib/chatStream';

type Turn = ChatMessage;

const SUGGESTIONS = ['What has Hayden built?', 'Where has Hayden worked?', 'What is his tech stack?'];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const history: ChatMessage[] = [...turns, { role: 'user' as const, content: text }].map(({ role, content }) => ({ role, content }));
    setTurns([...turns, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setInput('');
    setError(null);
    setBusy(true);

    const patchReply = (patch: (t: Turn) => Turn) =>
      setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 ? patch(t) : t)));

    abortRef.current = new AbortController();
    try {
      await streamChat(
        history,
        {
          onToken: (token) => patchReply((t) => ({ ...t, content: t.content + token })),
        },
        abortRef.current.signal
      );
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      setTurns((prev) => (prev.at(-1)?.content ? prev : prev.slice(0, -1)));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="Ask about Hayden"
          className="w-[calc(100vw-2rem)] sm:w-96 h-[32rem] max-h-[calc(100vh-6rem)] flex flex-col rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 shadow-xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-800">
            <p className="font-heading font-medium text-stone-900 dark:text-stone-50">Ask about Hayden</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-50 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm" aria-busy={busy}>
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-stone-600 dark:text-stone-400">
                  Answers come from Hayden's resume and projects. Try one of these:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="px-3 py-1.5 rounded-full border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.role === 'user' ? 'flex justify-end' : ''}>
                <div
                  className={
                    t.role === 'user'
                      ? 'max-w-[85%] rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 px-3 py-2'
                      : 'max-w-[85%] rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-3 py-2'
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{t.content || (busy && i === turns.length - 1 ? '…' : '')}</p>
                </div>
              </div>
            ))}
            {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-stone-200 dark:border-stone-800">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask a question…"
              aria-label="Your question"
              className="flex-1 min-w-0 rounded-md border border-stone-300 dark:border-stone-700 bg-transparent px-3 py-2 text-sm text-stone-900 dark:text-stone-50 placeholder:text-stone-400 focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="p-2 rounded-md bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 disabled:opacity-40 transition-opacity"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Ask about Hayden'}
        aria-expanded={open}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 shadow-lg hover:scale-105 transition-transform"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
