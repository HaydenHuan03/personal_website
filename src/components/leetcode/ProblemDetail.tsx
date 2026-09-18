import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import type { Problem } from '../../types/leetcode';
import { LANGUAGE_LABELS, githubFileUrl, leetcodeProblemUrl } from '../../utils/leetcodeSolutions';
import CodeBlock from './CodeBlock';
import { DIFFICULTY_CLASSES } from './difficulty';

interface Props {
  problem: Problem;
  descriptionHtml: string | null;
}

const DESCRIPTION_STYLES = [
  'text-stone-700 leading-relaxed',
  '[&_p]:mb-4 [&_p:last-child]:mb-0',
  '[&_strong]:font-semibold [&_strong]:text-stone-900',
  '[&_code]:font-mono [&_code]:text-[0.875em] [&_code]:bg-stone-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded',
  '[&_pre]:my-4 [&_pre]:p-4 [&_pre]:bg-stone-100 [&_pre]:rounded-lg [&_pre]:font-mono [&_pre]:text-sm [&_pre]:overflow-x-auto',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1',
  '[&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg',
  '[&_sup]:text-[0.7em] [&_sub]:text-[0.7em]',
  '[&_a]:underline [&_a]:text-stone-900',
  '[&_table]:my-4 [&_table]:text-sm [&_td]:border [&_td]:border-stone-300 [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-stone-300 [&_th]:px-3 [&_th]:py-1.5',
].join(' ');

export default function ProblemDetail({ problem, descriptionHtml }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const solution = problem.solutions[activeIndex] ?? problem.solutions[0];

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(solution.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context / permission denied); ignore.
    }
  }

  return (
    <article className="animate-[fadeInUp_0.5s_ease-out]">
      <header className="mb-10">
        <p className="font-mono text-sm text-stone-400 mb-2">#{problem.id}</p>
        <h1 className="text-4xl md:text-5xl font-heading font-semibold text-stone-900 mb-5 leading-[1.1] text-balance">
          {problem.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {problem.difficulty && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${DIFFICULTY_CLASSES[problem.difficulty]}`}>
              {problem.difficulty}
            </span>
          )}
          {problem.topics.map((t) => (
            <span key={t} className="text-xs font-medium px-2.5 py-1 rounded-full border border-stone-200 bg-white text-stone-600">
              {t}
            </span>
          ))}
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12 lg:items-start">
        <section className="mb-12 lg:mb-0">
          <h2 className="text-2xl font-heading font-semibold text-stone-900 mb-4">Problem</h2>
          {descriptionHtml ? (
            <div className={DESCRIPTION_STYLES} dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
          ) : (
            <p className="text-stone-500">
              The full description for this problem is available on{' '}
              <a href={leetcodeProblemUrl(problem.slug)} target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-900">
                LeetCode
              </a>
              .
            </p>
          )}
        </section>
  
        <section className="lg:sticky lg:top-28">
          <h2 className="text-2xl font-heading font-semibold text-stone-900 mb-4">Solution</h2>
          <div className="rounded-xl overflow-hidden border border-stone-800 bg-stone-900">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-stone-800">
              <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
                {problem.solutions.length > 1 ? (
                  problem.solutions.map((s, i) => (
                    <button
                      key={s.language}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className={`shrink-0 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        i === activeIndex ? 'bg-stone-700 text-stone-50' : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {LANGUAGE_LABELS[s.language]}
                    </button>
                  ))
                ) : (
                  <span className="px-3 py-1 text-xs font-medium text-stone-400">{LANGUAGE_LABELS[solution.language]}</span>
                )}
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-300 hover:text-stone-50 rounded-md hover:bg-stone-800 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="overflow-auto lg:max-h-[calc(100vh-14rem)]">
              <CodeBlock code={solution.code} language={solution.language} />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm">
            <a
              href={leetcodeProblemUrl(problem.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-900 transition-colors"
            >
              View on LeetCode <ExternalLink size={14} />
            </a>
            <a
              href={githubFileUrl(solution.path)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-900 transition-colors"
            >
              View on GitHub <ExternalLink size={14} />
            </a>
          </div>
        </section>
      </div>
    </article>
  );
}
