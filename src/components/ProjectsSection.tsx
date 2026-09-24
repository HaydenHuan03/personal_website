import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import SectionHeader from './SectionHeader';
import { projects } from '../data/projects';
import { techIconMap } from '../utils/techIcons';
import { formatProjectDate } from '../utils/projectDate';
import { prefersReducedMotion } from '../utils/motion';

gsap.registerPlugin(ScrollTrigger);

const MAX_TECH_CHIPS = 5;

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (prefersReducedMotion()) return;

    const header = section.querySelector('[data-section-header]');
    const grid = section.querySelector<HTMLElement>('[data-project-grid]');
    const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-project-card]'));

    gsap.set(header, { opacity: 0, y: 20 });
    gsap.set(cards, { opacity: 0, y: 24, scale: 0.98 });

    const tweens: gsap.core.Tween[] = [];
    const triggers = [
      ScrollTrigger.create({
        trigger: header,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          tweens.push(gsap.to(header, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }));
        },
      }),
      ScrollTrigger.create({
        trigger: grid,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          tweens.push(
            gsap.to(cards, { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out' })
          );
        },
      }),
    ];

    return () => {
      triggers.forEach((t) => t.kill());
      tweens.forEach((tw) => tw.kill());
      gsap.set([header, ...cards], { clearProps: 'all' });
    };
  }, []);

  return (
    <section ref={sectionRef} id="projects" className="py-24 border-t border-stone-200 dark:border-stone-800">
      <SectionHeader title="Projects and Experience" subtitle="Case studies and things I've built along the way." />

      <div data-project-grid className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {projects.map((project) => {
          const visibleTech = project.tech.slice(0, MAX_TECH_CHIPS);
          const hiddenTechCount = project.tech.length - visibleTech.length;

          return (
            <Link
              key={project.slug}
              data-project-card
              to={`/projects/${project.slug}`}
              className="group flex flex-col rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 no-underline transition-[transform,border-color,box-shadow] duration-200 hover:border-stone-300 dark:hover:border-stone-600 hover:shadow-sm hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 dark:focus-visible:ring-stone-100 focus-visible:ring-offset-2"
            >
              <div className="flex items-center gap-3 mb-4">
                <time dateTime={project.date} className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400 font-medium">
                  {formatProjectDate(project.date)}
                </time>
                {project.inProgress && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[11px] font-semibold rounded-full border border-amber-200 dark:border-amber-900 uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    In Progress
                  </span>
                )}
              </div>

              <h3 className="font-heading font-semibold text-xl text-stone-800 dark:text-stone-100 group-hover:text-stone-900 dark:group-hover:text-stone-50 mb-3">
                {project.title}
              </h3>

              <p className="text-stone-600 dark:text-stone-400 font-light leading-relaxed line-clamp-3 mb-6">{project.description}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {visibleTech.map((t) => {
                  const iconClass = techIconMap[t];
                  return (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-xs font-medium rounded border border-stone-200 dark:border-stone-800"
                    >
                      {iconClass && <i className={`${iconClass} text-sm leading-none`} />}
                      {t}
                    </span>
                  );
                })}
                {hiddenTechCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 text-xs font-medium rounded border border-stone-200 dark:border-stone-800">
                    +{hiddenTechCount}
                  </span>
                )}
              </div>

              <div className="mt-auto flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-50 group-focus-visible:text-stone-900 dark:group-focus-visible:text-stone-50 transition-colors">
                Read case study
                <ArrowRight
                  size={16}
                  className="transform transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
