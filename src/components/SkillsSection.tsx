import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RotateCcw } from 'lucide-react';
import SectionHeader from './SectionHeader';
import SkillsPlayground, { type SkillBadge, type SkillsPlaygroundHandle } from './SkillsPlayground';
import { techIconMap } from '../utils/techIcons';
import { prefersReducedMotion } from '../utils/motion';

gsap.registerPlugin(ScrollTrigger);

interface Category {
  id: string;
  title: string;
  border: string;
  dot: string;
  skills: string[];
}

const categories: Category[] = [
  { id: 'backend', title: 'Backend & APIs', border: 'border-amber-300', dot: 'bg-amber-400', skills: ['Java (Spring Boot)', 'Python', 'FastAPI'] },
  { id: 'infra', title: 'Infrastructure', border: 'border-sky-300', dot: 'bg-sky-400', skills: ['Kubernetes', 'Docker', 'Nginx', 'Caddy'] },
  { id: 'data', title: 'Data & Events', border: 'border-emerald-300', dot: 'bg-emerald-400', skills: ['Apache Kafka', 'Apache Airflow', 'Apache Spark', 'Valkey'] },
  { id: 'db', title: 'Databases', border: 'border-violet-300', dot: 'bg-violet-400', skills: ['PostgreSQL', 'MySQL', 'Redis', 'Pinecone'] },
];

const badges: SkillBadge[] = categories.flatMap((cat) =>
  cat.skills.map((label) => ({
    label,
    categoryId: cat.id,
    border: cat.border,
    dot: cat.dot,
    iconClass: techIconMap[label],
  }))
);

const chipBase =
  'inline-flex items-center gap-2 min-h-11 px-4 rounded-full border text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2';
const chipIdle = 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900';
const chipActive = 'border-stone-900 bg-stone-900 text-stone-50';

export default function SkillsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const playgroundRef = useRef<SkillsPlaygroundHandle>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (prefersReducedMotion()) return;

    const header = section.querySelector('[data-section-header]');
    const controls = section.querySelector('[data-skill-controls]');
    gsap.set([header, controls], { opacity: 0, y: 20 });

    let tween: gsap.core.Tween | undefined;
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        tween = gsap.to([header, controls], { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' });
      },
    });

    return () => {
      trigger.kill();
      tween?.kill();
      gsap.set([header, controls], { clearProps: 'all' });
    };
  }, []);

  return (
    <section ref={sectionRef} id="skills" className="py-24 border-t border-stone-200">
      <SectionHeader title="Tech Skills" subtitle="Drag them around. Filter by category. Reset when it gets messy." />

      <div data-skill-controls className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-pressed={activeCategory === null}
          onClick={() => setActiveCategory(null)}
          className={`${chipBase} ${activeCategory === null ? chipActive : chipIdle}`}
        >
          All
        </button>
        {categories.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveCategory(active ? null : cat.id)}
              className={`${chipBase} ${active ? chipActive : chipIdle}`}
            >
              <span aria-hidden="true" className={`w-2 h-2 rounded-full ${cat.dot}`} />
              {cat.title}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => playgroundRef.current?.reset()}
          className={`${chipBase} ${chipIdle} ml-auto`}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset layout
        </button>
      </div>

      <div className="mt-6">
        <SkillsPlayground ref={playgroundRef} badges={badges} activeCategory={activeCategory} />
      </div>
    </section>
  );
}
