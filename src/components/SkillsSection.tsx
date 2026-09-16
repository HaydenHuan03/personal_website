import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Server, Layers, Share2, Database } from 'lucide-react';
import SectionHeader from './SectionHeader';
import { techIconMap } from '../utils/techIcons';

gsap.registerPlugin(ScrollTrigger);

const categories = [
  { title: 'Backend & APIs', Icon: Server, skills: ['Java (Spring Boot)', 'Python', 'FastAPI'] },
  { title: 'Infrastructure', Icon: Layers, skills: ['Kubernetes', 'Docker', 'Nginx', 'Caddy'] },
  { title: 'Data & Events', Icon: Share2, skills: ['Apache Kafka', 'Apache Airflow', 'Apache Spark', 'Valkey'] },
  { title: 'Databases', Icon: Database, skills: ['PostgreSQL', 'MySQL', 'Redis', 'Pinecone'] },
];

export default function SkillsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const header = section.querySelector('[data-section-header]');
    const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-skill-card]'));
    const badges = Array.from(section.querySelectorAll<HTMLElement>('[data-skill-badge]'));

    gsap.set(header, { opacity: 0, y: 20 });
    gsap.set(cards, { opacity: 0, y: 40 });
    gsap.set(badges, { opacity: 0, scale: 0.9 });

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.timeline({ defaults: { ease: 'power2.out' } })
          .to(header, { opacity: 1, y: 0, duration: 0.4 })
          .to(cards, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 }, '-=0.1')
          .to(badges, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.04 }, '-=0.3');
      },
    });

    return () => {
      trigger.kill();
      gsap.set([header, ...cards, ...badges], { clearProps: 'all' });
    };
  }, []);

  return (
    <section ref={sectionRef} id="skills" className="py-24 border-t border-stone-200">
      <SectionHeader title="Tech Skills" subtitle="Core competencies and technologies." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        {categories.map((cat) => (
          <div
            key={cat.title}
            data-skill-card
            className="p-8 border border-stone-200 rounded-xl bg-white hover:border-stone-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-stone-100 rounded-lg">
                <cat.Icon size={20} className="text-stone-700" />
              </div>
              <h3 className="font-heading font-semibold text-lg">{cat.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {cat.skills.map((skill) => {
                const iconClass = techIconMap[skill];
                return (
                  <span
                    key={skill}
                    data-skill-badge
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 text-sm rounded-md font-medium"
                  >
                    {iconClass && <i className={`${iconClass} text-base leading-none`} />}
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
