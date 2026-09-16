import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import SectionHeader from './SectionHeader';
import { projects } from '../data/projects';
import { techIconMap } from '../utils/techIcons';

gsap.registerPlugin(ScrollTrigger);

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const header = section.querySelector('[data-section-header]');
    const rows = Array.from(section.querySelectorAll<HTMLElement>('[data-project-row]'));

    gsap.set(header, { opacity: 0, y: 20 });
    gsap.set(rows, { opacity: 0, x: -32, y: 16 });

    const triggers: ScrollTrigger[] = [
      ScrollTrigger.create({
        trigger: header,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.to(header, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
        },
      }),
      ...rows.map((row) =>
        ScrollTrigger.create({
          trigger: row,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.to(row, { opacity: 1, x: 0, y: 0, duration: 0.55, ease: 'power2.out' });
          },
        })
      ),
    ];

    return () => {
      triggers.forEach((t) => t.kill());
      gsap.set([header, ...rows], { clearProps: 'all' });
    };
  }, []);

  return (
    <section ref={sectionRef} id="projects" className="py-24 border-t border-stone-200">
      <SectionHeader title="Selected Work" subtitle="Architectural highlights and engineering challenges." />

      <div className="space-y-4 mt-12">
        {projects.map((project) => (
          <Link
            key={project.slug}
            data-project-row
            to={`/projects/${project.slug}`}
            className="group flex flex-col md:flex-row gap-8 items-start p-8 rounded-xl cursor-pointer bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all no-underline"
          >
            <div className="md:w-1/3 flex-shrink-0">
              <h3 className="font-heading font-semibold text-xl mb-3 group-hover:text-stone-900 text-stone-800">
                {project.title}
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {project.tech.map((t) => {
                  const iconClass = techIconMap[t];
                  return (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-600 text-xs font-medium rounded border border-stone-200"
                    >
                      {iconClass && <i className={`${iconClass} text-sm leading-none`} />}
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="md:w-2/3">
              <p className="text-stone-600 mb-4 font-light leading-relaxed">{project.description}</p>
              <div className="flex items-center gap-2 text-sm font-medium text-stone-900 group-hover:text-stone-600 transition-colors mt-6">
                Read full case study
                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
