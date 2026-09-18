import { Search, X } from 'lucide-react';
import type { Difficulty } from '../../types/leetcode';
import { DIFFICULTIES, EMPTY_FILTERS, hasActiveFilters, type Filters, type TopicCount } from '../../utils/leetcodeSolutions';
import FilterDropdown from './FilterDropdown';

const DIFFICULTY_DOT: Record<Difficulty, string> = {
  Easy: 'bg-emerald-500',
  Medium: 'bg-amber-500',
  Hard: 'bg-rose-500',
};

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

        <FilterDropdown
          label="Difficulty"
          options={DIFFICULTIES.map((d) => ({ value: d, label: d, dotClass: DIFFICULTY_DOT[d] }))}
          selected={filters.difficulties}
          onToggle={(v) => onChange({ ...filters, difficulties: toggled(filters.difficulties, v as Difficulty) })}
        />
        <FilterDropdown
          label="Topic"
          options={topics.map((t) => ({ value: t.name, label: t.name, count: t.count }))}
          selected={filters.topics}
          onToggle={(v) => onChange({ ...filters, topics: toggled(filters.topics, v) })}
        />

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
    </div>
  );
}
