import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SECTIONS = ['about', 'leetcode', 'projects', 'journey'] as const;
const LABELS: Record<(typeof SECTIONS)[number], string> = {
  about: 'About',
  leetcode: 'LeetCode',
  projects: 'Projects',
  journey: 'Journey',
};

export default function Navbar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(document.documentElement.scrollTop > 8);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const indicator = indicatorRef.current;
    const container = containerRef.current;
    if (!indicator || !container) return;

    function moveIndicatorTo(link: HTMLElement) {
      gsap.to(indicator, {
        x: link.offsetLeft,
        width: link.offsetWidth,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }

    const triggers: ScrollTrigger[] = [];
    SECTIONS.forEach((id) => {
      const section = document.getElementById(id);
      const link = container.querySelector<HTMLElement>(`[data-nav-link="${id}"]`);
      if (!section || !link) return;
      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => moveIndicatorTo(link),
          onEnterBack: () => moveIndicatorTo(link),
        })
      );
    });

    return () => triggers.forEach((t) => t.kill());
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 bg-stone-50/80 backdrop-blur-sm transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_1px_0_0_rgba(28,25,23,0.08)]' : ''
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-5 flex justify-center items-center">
        <div ref={containerRef} className="relative flex gap-6 text-sm font-medium text-stone-600 pb-1">
          {SECTIONS.map((id) => (
            <Link
              key={id}
              to={`/#${id}`}
              data-nav-link={id}
              className="hover:text-stone-900 transition-colors"
            >
              {LABELS[id]}
            </Link>
          ))}
          <Link to="/gallery" className="hover:text-stone-900 transition-colors">
            Gallery
          </Link>
          <span
            ref={indicatorRef}
            className="absolute bottom-0 left-0 h-[2px] bg-stone-900 rounded-full pointer-events-none"
            style={{ width: 0, opacity: 0 }}
          />
        </div>
      </div>
    </nav>
  );
}
