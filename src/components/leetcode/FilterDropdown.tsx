import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  count?: number;
  /** Optional Tailwind class for a small colour dot before the label. */
  dotClass?: string;
}

interface Props {
  label: string;
  options: DropdownOption[];
  selected: ReadonlySet<string>;
  onToggle: (value: string) => void;
}

export default function FilterDropdown({ label, options, selected, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const active = selected.size > 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
          active
            ? 'bg-stone-900 border-stone-900 text-stone-50 hover:bg-stone-800'
            : 'bg-white border-stone-300 text-stone-700 hover:border-stone-500'
        }`}
      >
        {label}
        {active && <span className="tabular-nums opacity-70">· {selected.size}</span>}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute left-0 mt-2 w-64 max-h-72 overflow-y-auto py-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50"
        >
          {options.map((o) => {
            const on = selected.has(o.value);
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => onToggle(o.value)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <span
                    className={`flex items-center justify-center w-4 h-4 rounded border shrink-0 ${
                      on ? 'bg-stone-900 border-stone-900 text-stone-50' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                  {o.dotClass && <span className={`w-2 h-2 rounded-full shrink-0 ${o.dotClass}`} />}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.count !== undefined && <span className="text-xs text-stone-400 tabular-nums">{o.count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
