import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { FileText, Github, Mail, MessageCircle, Send, X } from 'lucide-react';
import InlineMarkup from '@/components/ui/InlineMarkup';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { EMAIL, GITHUB_URL, RESUME_URL } from '@/lib/contact';
import { streamChat, type ChatMessage } from '@/lib/chatStream';

type Turn = ChatMessage;

// A button shows under a reply when the reply mentions its topic.
const ACTIONS = [
  { label: 'Email', href: `mailto:${EMAIL}`, icon: Mail, match: /\b(e-?mail|contact|reach)/i },
  { label: 'Resume', href: RESUME_URL, icon: FileText, match: /resume|\bcv\b/i },
  { label: 'GitHub', href: GITHUB_URL, icon: Github, match: /github/i },
];

// The model sometimes lists "Email: ..." lines anyway; the buttons cover them.
const stripContactLines = (text: string) => text.replace(/^\s*(e-?mail|resume|cv|github)\s*:.*$/gim, '').trim();

// Types the reply out a few characters per frame; a bigger backlog types faster so it keeps up with the stream.
// Children (the action buttons) show once typing is done.
function TypedReply({ text, onType, children }: { text: string; onType: () => void; children?: ReactNode }) {
  const reducedMotion = useReducedMotion();
  // Starts full for replies already on screen, empty for a new one.
  const [shown, setShown] = useState(text.length);

  useEffect(() => {
    if (shown === text.length) return;
    if (reducedMotion || shown > text.length) return setShown(text.length);
    const id = setTimeout(() => setShown((n) => n + Math.ceil((text.length - n) / 40)), 16);
    return () => clearTimeout(id);
  }, [shown, text.length, reducedMotion]);

  useEffect(onType, [shown, onType]);

  // Hide a half-typed bold marker: drop a lone trailing "*" and close an open "**" so it renders bold, not raw.
  let visible = text.slice(0, shown).replace(/(^|[^*])\*$/, '$1');
  if (visible.split('**').length % 2 === 0) visible += '**';

  return (
    <>
      <InlineMarkup text={visible} />
      {shown >= text.length && children}
    </>
  );
}

const SUGGESTIONS =['What has Hayden built?', 'Where has Hayden worked?', 'What is his tech stack?'];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Braces matter: scrollTo can return a Promise, which React would treat as an effect cleanup.
  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, []);

  useEffect(scrollToEnd, [turns, scrollToEnd]);

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
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {t.role === 'assistant' ? (
                      <TypedReply text={stripContactLines(t.content)} onType={scrollToEnd}>
                        {!(busy && i === turns.length - 1) && (
                          <span className="mt-2 flex flex-wrap gap-2">
                            {ACTIONS.filter((a) => a.match.test(t.content)).map(({ label, href, icon: Icon }) => (
                              <a
                                key={label}
                                href={href}
                                target={href.startsWith('http') ? '_blank' : undefined}
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-stone-400 dark:border-stone-600 text-xs font-medium hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
                              >
                                <Icon size={14} /> {label}
                              </a>
                            ))}
                          </span>
                        )}
                      </TypedReply>
                    ) : (
                      t.content
                    )}
                    {!t.content && busy && i === turns.length - 1 && (
                      <span role="status" aria-label="Thinking" className="inline-flex gap-1 py-1">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="w-1.5 h-1.5 rounded-full bg-stone-500 dark:bg-stone-400 motion-safe:animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    )}
                  </p>
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
