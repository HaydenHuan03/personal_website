import { forwardRef, type KeyboardEvent } from 'react';
import worldMapJson from '../../data/world-map.json';
import type { WorldMapSnapshot } from '../../../scripts/lib/worldMap';

export const WORLD_MAP = worldMapJson as unknown as WorldMapSnapshot;

export interface WorldMapProps {
  visitedIds: ReadonlySet<string>;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  dimmed?: boolean;
}

const WorldMap = forwardRef<SVGSVGElement, WorldMapProps>(function WorldMap(
  { visitedIds, selectedId, hoveredId, onHover, onSelect, dimmed = false },
  ref
) {
  const onKeyDown = (e: KeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id);
    }
  };

  return (
    <svg
      ref={ref}
      viewBox={WORLD_MAP.viewBox.join(' ')}
      role="group"
      aria-label="World map of visited countries"
      className={`w-full h-auto select-none transition-opacity duration-500 ${
        dimmed ? 'opacity-50' : 'opacity-100'
      }`}
      onMouseLeave={() => onHover(null)}
    >
      <g className="fill-stone-300/70 stroke-stone-50" strokeWidth={0.5}>
        {WORLD_MAP.countries.map((c) => (visitedIds.has(c.id) ? null : <path key={c.id} d={c.d} />))}
      </g>
      <g strokeWidth={0.75} strokeLinejoin="round">
        {WORLD_MAP.countries.map((c) => {
          if (!visitedIds.has(c.id)) return null;
          const active = c.id === hoveredId || c.id === selectedId;
          const [cx, cy] = c.centroid;
          return (
            <g
              key={c.id}
              data-country={c.id}
              role="button"
              tabIndex={0}
              aria-label={`${c.name} - open gallery`}
              className="cursor-pointer outline-none"
              onMouseEnter={() => onHover(c.id)}
              onFocus={() => onHover(c.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(c.id)}
              onKeyDown={(e) => onKeyDown(e, c.id)}
            >
              <path
                d={c.d}
                className={`transition-colors duration-200 ${
                  active ? 'fill-accent-strong stroke-accent-strong' : 'fill-accent stroke-accent-strong'
                }`}
              />
              {!dimmed && (
                <>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={active ? 7 : 5}
                    className={`transition-all duration-200 ${
                      active ? 'fill-accent-strong/30' : 'fill-accent/20'
                    }`}
                    stroke="none"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={active ? 3 : 2.5}
                    className="fill-accent-strong transition-all duration-200"
                    stroke="none"
                  />
                </>
              )}
              <circle cx={cx} cy={cy} r={12} fill="transparent" stroke="none" />
            </g>
          );
        })}
      </g>
    </svg>
  );
});

export default WorldMap;
