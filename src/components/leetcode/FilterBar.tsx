import { useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Difficulty } from '../../types/leetcode';
import { DIFFICULTIES, EMPTY_FILTERS, hasActiveFilters, type Filters, type TopicCount } from '../../utils/leetcodeSolutions';

const DEFAULT_TOPIC_COUNT = 12;

const DIFFICULTY_ACTIVE: Record<Difficulty, string> = {
  Easy: 'bg-emerald-600 border-emerald-600 text-white',
  Medium: 'bg-amber-500 border-amber-500 text-white',
  Hard: 'bg-rose-600 border-rose-600 text-white',
};

const CHIP = 'px-3 py-1 text-xs font-medium rounded-full border transition-colors';
const CHIP_IDLE = 'bg-white border-stone-300 text-stone-600 hover:border-stone-500';
const CHIP_ACTIVE = 'bg-stone-900 border-stone-900 text-stone-50';

function toggled<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  topics: TopicCount[];
  total: number;
  visible: number;
}

export default function FilterBar({ filters, onChange, topics, total, visible }: Props) {
  const [showAllTopics, setShowAllTopics] = useState(false);
  const shownTopics = showAllTopics
    ? topics
    : topics.filter((t, i) => i < DEFAULT_TOPIC_COUNT || filters.topics.has(t.name));
  const hiddenCount = topics.length - DEFAULT_TOPIC_COUNT;
  const active = hasActiveFilters(filters);

  return (
    <div className="sticky top-[88px] z-40 -mx-6 px-6 md:-mx-12 md:px-12 py-4 bg-stone-50/85 backdrop-blur-sm border-b border-stone-200">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[12rem]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Search by number or title"
            aria-label="Search problems"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-stone-500"
          />
        </label>

        <div className="flex gap-2" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => {
            const on = filters.difficulties.has(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ ...filters, difficulties: toggled(filters.difficulties, d) })}
                className={`${CHIP} ${on ? DIFFICULTY_ACTIVE[d] : CHIP_IDLE}`}
              >
                {d}
              </button>
            );
          })}
        </div>

        <span className="ml-auto text-sm text-stone-500 tabular-nums">
          {visible} of {total}
        </span>
        {active && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Topic">
        {shownTopics.map((t) => {
          const on = filters.topics.has(t.name);
          return (
            <button
              key={t.name}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ ...filters, topics: toggled(filters.topics, t.name) })}
              className={`${CHIP} ${on ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              {t.name} <span className="text-stone-400">{t.count}</span>
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllTopics((v) => !v)}
            className="px-3 py-1 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
          >
            {showAllTopics ? 'Show fewer topics' : `Show all ${topics.length} topics`}
          </button>
        )}
      </div>
    </div>
  );
}
