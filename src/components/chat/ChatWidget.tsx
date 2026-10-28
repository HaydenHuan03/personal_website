import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { gsap } from 'gsap';
import { Check, Copy, MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import { MAX_MESSAGE_CHARS, MAX_USER_TURNS, parseReply, type ChatMessage } from '@/lib/chat';
import { ChatError, streamChat } from '@/lib/chatStream';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import ChatMarkup from './ChatMarkup';
import ContactActions from './ContactActions';

const SUGGESTIONS = [
  'What does Hayden do?',
  'Tell me about his internship',
  "What's his tech stack?",
  'What projects has he built?',
  'How can I contact him?',
];

const GREETING = "Hi! I'm an AI assistant that answers questions about Hayden. Ask me anything about his work, projects or background.";

const TEASER_KEY = 'chat-teaser-seen';
const TEASER_DELAY_MS = 4000;
const TEASER_VISIBLE_MS = 10000;

const ENTER = 'motion-safe:animate-[fadeInUp_0.2s_ease-out]';
const ASSISTANT_BUBBLE =
  'rounded-2xl rounded-bl-sm bg-stone-100 px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 shadow-sm dark:bg-stone-800 dark:text-stone-100';

const isPhone = () => window.matchMedia('(max-width: 639px)').matches;

/** Where the panel animates from and back to: the launcher corner on desktop, below the screen on a phone. */
const hiddenPanel = () => (isPhone() ? { yPercent: 100 } : { opacity: 0, scale: 0.85, y: 24 });

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Assistant is typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-stone-400 motion-safe:animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure context, denied permission); the button just does nothing.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [turns, setTurns] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resting, setResting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const questions = turns.filter((t) => t.role === 'user').map((t) => t.content);
  const asked = new Set(questions);
  const limitReached = questions.length >= MAX_USER_TURNS;
  const lastQuestion = [...turns].reverse().find((t) => t.role === 'user')?.content;
  const followUps = SUGGESTIONS.filter((s) => !asked.has(s)).slice(0, 3);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns, error]);

  // A one-time nudge per browser session, so first-time visitors notice the chat.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(TEASER_KEY) === '1';
    } catch {
      // Storage blocked: show the teaser anyway.
    }
    if (seen) return;
    const show = setTimeout(() => {
      setTeaser(true);
      try {
        sessionStorage.setItem(TEASER_KEY, '1');
      } catch {
        // Ignored: worst case the teaser shows again next page load.
      }
    }, TEASER_DELAY_MS);
    const hide = setTimeout(() => setTeaser(false), TEASER_DELAY_MS + TEASER_VISIBLE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel || prefersReducedMotion()) return;
    const tween = gsap.from(panel, {
      ...hiddenPanel(),
      duration: 0.32,
      ease: 'power3.out',
      transformOrigin: 'bottom right',
      clearProps: 'transform,opacity',
    });
    return () => {
      tween.kill();
    };
  }, [open]);

  function openChat() {
    setTeaser(false);
    setOpen(true);
  }

  function closeChat() {
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) return setOpen(false);
    if (closingRef.current) return;
    closingRef.current = true;
    gsap.to(panel, {
      ...hiddenPanel(),
      duration: 0.22,
      ease: 'power2.in',
      transformOrigin: 'bottom right',
      onComplete: () => {
        closingRef.current = false;
        setOpen(false);
      },
    });
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeChat();
    window.addEventListener('keydown', onKey);
    // On a phone the panel is a full-screen sheet, so the page behind it must not scroll.
    const previous = document.body.style.overflow;
    if (isPhone()) document.body.style.overflow = 'hidden';
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

  function chips(items: string[]) {
    return (
      <div className={cn('flex flex-wrap gap-2', ENTER)}>
        {items.map((s, i) => (
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
    );
  }

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Ask about Hayden"
          className={cn(
            'fixed z-[110] flex flex-col bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-50',
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
                onClick={closeChat}
                aria-label="Close chat"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div ref={listRef} role="log" aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="max-w-[88%]">
              <p className={ASSISTANT_BUBBLE}>{GREETING}</p>
            </div>

            {turns.length === 0 && chips(SUGGESTIONS)}

            {turns.map((t, i) => {
              if (t.role === 'user') {
                return (
                  <div key={i} className={cn('flex justify-end', ENTER)}>
                    <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-stone-900 px-3.5 py-2 text-sm text-stone-50 shadow-sm dark:bg-stone-100 dark:text-stone-900">
                      {t.content}
                    </p>
                  </div>
                );
              }
              const { text, wantsContact } = parseReply(t.content);
              const streaming = busy && i === turns.length - 1;
              return (
                <div key={i} className={cn('max-w-[88%]', ENTER)}>
                  <div className={ASSISTANT_BUBBLE}>
                    {text ? (
                      <>
                        <ChatMarkup text={text} />
                        {streaming && (
                          <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-stone-500 motion-safe:animate-pulse" />
                        )}
                      </>
                    ) : (
                      <TypingDots />
                    )}
                  </div>
                  {!streaming && text && <CopyButton text={text} />}
                  {wantsContact && !streaming && <ContactActions question={turns[i - 1]?.content} />}
                </div>
              );
            })}

            {!busy && turns.length > 0 && !limitReached && !resting && followUps.length > 0 && chips(followUps)}

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

      {!open && teaser && (
        <div
          className={cn(
            'fixed right-4 z-[90] flex max-w-[calc(100vw-2rem)] items-center gap-1 rounded-2xl rounded-br-sm border border-stone-200 bg-white py-1 pl-3.5 pr-1 shadow-lg dark:border-stone-800 dark:bg-stone-900 sm:right-6',
            'bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)]',
            ENTER
          )}
        >
          <button type="button" onClick={openChat} className="truncate py-1.5 text-sm text-stone-800 dark:text-stone-100">
            Hiring? Ask me anything about Hayden 👋
          </button>
          <button
            type="button"
            onClick={() => setTeaser(false)}
            aria-label="Dismiss"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={openChat}
          aria-label="Ask about Hayden"
          className={cn(
            'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[90] inline-flex h-14 items-center gap-2 rounded-full bg-stone-900 px-5 text-sm font-medium text-stone-50 shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:bg-stone-100 dark:text-stone-900 sm:right-6',
            ENTER
          )}
        >
          <MessageCircle size={18} />
          <span className="hidden sm:inline">Ask about Hayden</span>
        </button>
      )}
    </>
  );
}
