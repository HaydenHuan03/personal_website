import { useEffect, useRef } from 'react';
import SectionHeader from './SectionHeader';
import '../styles/journey.css';

const experiences = [
  {
    date: 'August 2025 – Feb 2026',
    title: 'Backend Engineer Internship',
    role: 'DevOps & Backend Engineer Intern',
    description:
      'Built and maintained backend services in Java, deploying and operating applications on Kubernetes in both local and production environments.',
  },
  {
    date: 'Oct 2022 - Oct 2026',
    title: 'University Teknologi Malaysia (UTM)',
    role: 'Cyber and Network Security Student',
    description:
      'Learning main network security concept with cisco netacad, also looking skills on software engineering since network is too hard',
  },
];

export default function JourneySection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const items = section.querySelectorAll('[data-orbit]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="journey" className="py-24 border-t border-stone-200">
      <SectionHeader title="The Journey" subtitle="Experience, education, and continuous learning." />

      <div className="orbit-timeline">
        <div className="orbit-axis" aria-hidden="true" />

        {experiences.map((exp, i) => (
          <div key={exp.title} className={`orbit-row ${i % 2 === 0 ? 'is-left' : 'is-right'}`} data-orbit>
            <div className="orbit-node" aria-hidden="true">
              <div className="node-ring" />
              <div className="node-dot" />
              <div className="node-sat"><span /></div>
            </div>

            <div className="orbit-card-wrap">
              <div className="orbit-card">
                <span className="orbit-date">{exp.date}</span>
                <h3 className="orbit-title">{exp.title}</h3>
                <p className="orbit-role">{exp.role}</p>
                <p className="orbit-desc">{exp.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
