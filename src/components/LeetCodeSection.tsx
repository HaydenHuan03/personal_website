import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router';
import { ArrowRight, ExternalLink } from 'lucide-react';
import SectionHeader from './SectionHeader';
import statsJson from '../data/leetcode.json';

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

export default function LeetCodeSection() {
  const sectionRef = useRef<HTMLElement>(null);

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

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 mt-12 items-stretch">
        <div data-lc-card className="p-8 border border-stone-200 rounded-xl bg-white flex flex-col items-center justify-center gap-2 md:w-56">
          <span className="text-5xl font-heading font-semibold text-stone-900">{stats.totalSolved ?? '—'}</span>
          <span className="text-stone-500 text-sm uppercase tracking-wide">Problems Solved</span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div data-lc-card className="p-6 border border-stone-200 rounded-xl bg-white flex flex-col gap-2">
            <span className="text-sm font-medium text-emerald-600">Easy</span>
            <span className="text-2xl font-heading font-semibold text-stone-900">{stats.easySolved ?? '—'}</span>
          </div>
          <div data-lc-card className="p-6 border border-stone-200 rounded-xl bg-white flex flex-col gap-2">
            <span className="text-sm font-medium text-amber-600">Medium</span>
            <span className="text-2xl font-heading font-semibold text-stone-900">{stats.mediumSolved ?? '—'}</span>
          </div>
          <div data-lc-card className="p-6 border border-stone-200 rounded-xl bg-white flex flex-col gap-2">
            <span className="text-sm font-medium text-rose-600">Hard</span>
            <span className="text-2xl font-heading font-semibold text-stone-900">{stats.hardSolved ?? '—'}</span>
          </div>
        </div>
      </div>

      {!hasStats && (
        <p className="mt-4 text-sm text-stone-500">
          Stats temporarily unavailable — check the profile directly below.
        </p>
      )}

      <div className="flex flex-wrap gap-3 mt-8">
        <Link
          to="/leetcode"
          className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 rounded-md hover:bg-stone-800 transition-colors font-medium text-sm"
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
