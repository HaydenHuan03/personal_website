import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import { MAX_MESSAGE_CHARS, MAX_USER_TURNS, parseReply, type ChatMessage } from '@/lib/chat';
import { ChatError, streamChat } from '@/lib/chatStream';
import { cn } from '@/lib/utils';
import ContactActions from './ContactActions';

const SUGGESTIONS = [
  'What does Hayden do?',
  'Tell me about his internship',
  "What's his tech stack?",
  'What projects has he built?',
  'How can I contact him?',
];

const GREETING = "Hi! I'm an AI assistant that answers questions about Hayden. Ask me anything about his work, projects or background.";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resting, setResting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userTurns = turns.filter((t) => t.role === 'user').length;
  const limitReached = userTurns >= MAX_USER_TURNS;
  const lastQuestion = [...turns].reverse().find((t) => t.role === 'user')?.content;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns, error]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    // On a phone the panel is a full-screen sheet, so the page behind it must not scroll.
    const mobile = window.matchMedia('(max-width: 639px)').matches;
    const previous = document.body.style.overflow;
    if (mobile) document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy || limitReached || resting) return;
    const history: ChatMessage[] = [...turns, { role: 'user', content: text }];
    setTurns([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setError(null);
    setBusy(true);

    abortRef.current = new AbortController();
    try {
      await streamChat(
        history,
        (token) =>
          setTurns((prev) => prev.map((t, i) => (i === prev.length - 1 ? { ...t, content: t.content + token } : t))),
        abortRef.current.signal
      );
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message);
        if (e instanceof ChatError && e.resting) setResting(true);
      }
      // An empty assistant bubble from a failed request is dropped.
      setTurns((prev) => (prev.at(-1)?.content ? prev : prev.slice(0, -1)));
    } finally {
      setBusy(false);
    }
  }

  function newChat() {
    abortRef.current?.abort();
    setTurns([]);
    setError(null);
    setBusy(false);
    inputRef.current?.focus();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Ask about Hayden"
          className={cn(
            'fixed z-[110] flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-900 dark:text-stone-50',
            // Phone: full-height sheet that follows the on-screen keyboard. Larger screens: floating card.
            'inset-0 h-dvh pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]',
            'sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[34rem] sm:max-h-[calc(100dvh-3rem)] sm:w-96 sm:rounded-xl sm:border sm:border-stone-200 sm:p-0 sm:shadow-2xl dark:sm:border-stone-800'
          )}
        >
          <header className="flex items-center justify-between gap-2 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold leading-tight">Ask about Hayden</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">AI assistant · answers come from Hayden&apos;s own notes</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {turns.length > 0 && (
                <button
                  type="button"
                  onClick={newChat}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <RotateCcw size={14} /> New chat
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div ref={listRef} role="log" aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <p className="max-w-[85%] text-sm leading-relaxed text-stone-600 dark:text-stone-300">{GREETING}</p>

            {turns.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className={cn(
                      'rounded-full border border-stone-300 px-3 py-1.5 text-left text-sm text-stone-700 transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-strong dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800',
                      i >= 3 && 'hidden sm:inline-flex'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {turns.map((t, i) => {
              if (t.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-stone-900 px-3.5 py-2 text-sm text-stone-50 dark:bg-stone-100 dark:text-stone-900">
                      {t.content}
                    </p>
                  </div>
                );
              }
              const { text, wantsContact } = parseReply(t.content);
              const streaming = busy && i === turns.length - 1;
              return (
                <div key={i} className="max-w-[92%]">
                  {text ? (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>
                  ) : (
                    streaming && <p className="text-sm text-stone-400 motion-safe:animate-pulse">Thinking…</p>
                  )}
                  {wantsContact && !streaming && <ContactActions question={turns[i - 1]?.content} />}
                </div>
              );
            })}

            {error && (
              <div role="alert" className="text-sm text-red-600 dark:text-red-400">
                {error}
                {resting && <ContactActions question={lastQuestion} />}
              </div>
            )}

            {limitReached && (
              <div className="text-sm text-stone-600 dark:text-stone-300">
                That&apos;s a lot of questions! For anything else, message Hayden directly.
                <ContactActions />
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-stone-200 p-3 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={MAX_MESSAGE_CHARS}
                disabled={busy || limitReached || resting}
                placeholder="Ask about Hayden…"
                aria-label="Your question"
                // 16px prevents iOS from zooming the page when the input is focused.
                className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-accent focus:outline-none disabled:opacity-50 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 sm:text-sm"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={busy || !input.trim() || limitReached || resting}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-white transition-colors hover:bg-accent-strong disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-stone-400">Questions are sent to an AI model and are not stored. It can make mistakes.</p>
          </form>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask about Hayden"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[90] inline-flex h-14 items-center gap-2 rounded-full bg-stone-900 px-5 text-sm font-medium text-stone-50 shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-stone-100 dark:text-stone-900 sm:right-6"
        >
          <MessageCircle size={18} />
          <span className="hidden sm:inline">Ask about Hayden</span>
        </button>
      )}
    </>
  );
}
