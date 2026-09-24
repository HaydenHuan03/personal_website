import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import type { Problem } from '../../types/leetcode';
import { DIFFICULTY_CLASSES } from './difficulty';

interface Props {
  problem: Problem;
}

export default function ProblemRow({ problem }: Props) {
  return (
    <li className="border-b border-stone-200 dark:border-stone-800 last:border-b-0">
      <Link
        to={`/leetcode/${problem.slug}`}
        className="flex items-center gap-4 py-4 px-2 -mx-2 rounded-md hover:bg-stone-100/70 dark:hover:bg-stone-800/70 transition-colors"
      >
        <span className="w-14 shrink-0 text-sm font-mono text-stone-400 dark:text-stone-500">#{problem.id}</span>
        <span className="flex-1 min-w-0 truncate font-medium text-stone-900 dark:text-stone-50">{problem.title}</span>
        {problem.difficulty && (
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_CLASSES[problem.difficulty]}`}>
            {problem.difficulty}
          </span>
        )}
        <ChevronRight size={16} className="shrink-0 text-stone-400 dark:text-stone-500" />
      </Link>
    </li>
  );
}
