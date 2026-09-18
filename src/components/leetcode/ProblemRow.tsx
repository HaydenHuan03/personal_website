import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import type { Difficulty, Problem } from '../../types/leetcode';
import { LANGUAGE_LABELS, githubFileUrl, leetcodeProblemUrl } from '../../utils/leetcodeSolutions';
import CodeBlock from './CodeBlock';

const DIFFICULTY_CLASSES: Record<Difficulty, string> = {
  Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Hard: 'bg-rose-50 text-rose-700 border-rose-200',
};

interface Props {
  problem: Problem;
  open: boolean;
  onToggle: () => void;
}

export default function ProblemRow({ problem, open, onToggle }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const solution = problem.solutions[activeIndex] ?? problem.solutions[0];
  const panelId = `lc-panel-${problem.id}`;

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
    <li className="border-b border-stone-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-4 py-4 px-2 -mx-2 rounded-md text-left hover:bg-stone-100/70 transition-colors"
      >
        <span className="w-14 shrink-0 text-sm font-mono text-stone-400">#{problem.id}</span>
        <span className="flex-1 min-w-0 truncate font-medium text-stone-900">{problem.title}</span>
        {problem.difficulty && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_CLASSES[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
        )}
        <ChevronDown size={16} className={`shrink-0 text-stone-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pb-6">
              <div className="rounded-xl overflow-hidden border border-stone-800 bg-stone-900">
                <div className="flex items-center gap-1 px-3 py-2 border-b border-stone-800">
                  {problem.solutions.length > 1 ? (
                    problem.solutions.map((s, i) => (
                      <button
                        key={s.language}
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          i === activeIndex ? 'bg-stone-700 text-stone-50' : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {LANGUAGE_LABELS[s.language]}
                      </button>
                    ))
                  ) : (
                    <span className="px-3 py-1 text-xs font-medium text-stone-400">{LANGUAGE_LABELS[solution.language]}</span>
                  )}
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={copyCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-300 hover:text-stone-50 rounded-md hover:bg-stone-800 transition-colors"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <CodeBlock code={solution.code} language={solution.language} />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
