import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router';
import { ArrowRight, ExternalLink } from 'lucide-react';
import SectionHeader from './SectionHeader';
import CountUp from './CountUp';
import statsJson from '../data/leetcode.json';
import { useSpotlight } from '../hooks/useSpotlight';
import { useMagnetic } from '../hooks/useMagnetic';

gsap.registerPlugin(ScrollTrigger);

interface LeetCodeStats {
  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
}
const stats = statsJson as LeetCodeStats;

const LEETCODE_USERNAME = 'teomeehua';
const hasStats = stats.totalSolved !== null;
const total = stats.totalSolved || 1;
const breakdown = [
  { label: 'Easy', value: stats.easySolved ?? 0, bar: 'bg-emerald-500', text: 'text-emerald-600' },
  { label: 'Medium', value: stats.mediumSolved ?? 0, bar: 'bg-amber-500', text: 'text-amber-600' },
  { label: 'Hard', value: stats.hardSolved ?? 0, bar: 'bg-rose-500', text: 'text-rose-600' },
] as const;

export default function LeetCodeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelSpotlight = useSpotlight<HTMLDivElement>();
  const browseBtn = useMagnetic<HTMLAnchorElement>(0.25);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const header = section.querySelector('[data-section-header]');
    const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-lc-card]'));

    gsap.set(header, { opacity: 0, y: 20 });
    gsap.set(cards, { opacity: 0, y: 40 });

    const timelines: gsap.core.Timeline[] = [];

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
          .to(header, { opacity: 1, y: 0, duration: 0.4 })
          .to(cards, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 }, '-=0.1');
        timelines.push(tl);
      },
    });

    return () => {
      trigger.kill();
      timelines.forEach((tl) => tl.kill());
      gsap.set([header, ...cards], { clearProps: 'all' });
    };
  }, []);

  return (
    <section ref={sectionRef} id="leetcode" className="py-24 border-t border-stone-200">
      <SectionHeader title="LeetCode" subtitle="Problem-solving practice, tracked at each deploy." />

      <div
        ref={panelSpotlight.ref}
        onMouseMove={panelSpotlight.onMouseMove}
        style={{ '--spot-color': 'rgba(63, 125, 120, 0.12)' } as React.CSSProperties}
        className="spotlight mt-12 border border-stone-200 rounded-2xl bg-white overflow-hidden grid grid-cols-1 md:grid-cols-[220px_1fr] divide-y divide-stone-200 md:divide-y-0 md:divide-x"
      >
        <div data-lc-card className="p-8 flex flex-col justify-center gap-1">
          <span className="text-6xl font-heading font-semibold text-stone-900 tabular-nums leading-none">
            {hasStats ? <CountUp value={stats.totalSolved ?? 0} /> : '-'}
          </span>
          <span className="text-stone-500 text-sm uppercase tracking-wide mt-2">Problems Solved</span>
        </div>

        <div data-lc-card className="p-8 flex flex-col justify-center gap-5">
          <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-stone-100" role="img" aria-label="Easy, medium, hard problem breakdown">
            {breakdown.map((b) => (
              <div
                key={b.label}
                className={`${b.bar} transition-[flex-basis] duration-700 ease-out`}
                style={{ flexBasis: hasStats ? `${(b.value / total) * 100}%` : `${100 / breakdown.length}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {breakdown.map((b) => (
              <div key={b.label} className="flex items-baseline gap-2">
                <span className={`text-sm font-medium ${b.text}`}>{b.label}</span>
                <span className="text-xl font-heading font-semibold text-stone-900 tabular-nums">
                  {hasStats ? b.value : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!hasStats && (
        <p className="mt-4 text-sm text-stone-500">
          Stats temporarily unavailable. Check the profile directly below.
        </p>
      )}

      <div className="flex flex-wrap gap-3 mt-8">
        <Link
          ref={browseBtn.ref}
          onMouseMove={browseBtn.onMouseMove}
          onMouseLeave={browseBtn.onMouseLeave}
          to="/leetcode"
          className="magnetic inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 rounded-md hover:bg-stone-800 transition-colors font-medium text-sm"
        >
          Browse Solutions <ArrowRight size={16} />
        </Link>
        <a
          href={`https://leetcode.com/u/${LEETCODE_USERNAME}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 border border-stone-300 rounded-md hover:bg-stone-200 transition-colors font-medium text-sm text-stone-900"
        >
          View Profile <ExternalLink size={16} />
        </a>
      </div>
    </section>
  );
}
