import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router';
import { ArrowRight, FileText, Mail, Github, Instagram } from 'lucide-react';
import PixelTransition from './PixelTransition';
import DecryptedText from './DecryptedText';
import { prefersReducedMotion } from '../utils/motion';
import { useMagnetic } from '../hooks/useMagnetic';

gsap.registerPlugin(ScrollTrigger);

const HERO_NAME = 'Hayden Huan Kee Jiun';

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const projectsBtn = useMagnetic<HTMLAnchorElement>(0.3);
  const contactBtn = useMagnetic<HTMLAnchorElement>(0.3);
  const resumeBtn = useMagnetic<HTMLAnchorElement>(0.3);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (prefersReducedMotion()) return;

    const label = section.querySelector<HTMLElement>('[data-hero-label]');
    const bio = section.querySelector<HTMLElement>('[data-hero-bio]');
    const btns = Array.from(section.querySelectorAll<HTMLElement>('[data-hero-btn]'));
    const image = section.querySelector<HTMLElement>('[data-hero-image]');
    const parallaxTarget = section.querySelector<HTMLElement>('[data-hero-parallax]');
    const nav = document.querySelector<HTMLElement>('nav');

    gsap.set([nav, label, bio, image], { opacity: 0 });
    gsap.set(nav, { y: -20 });
    gsap.set([label, bio], { y: 16 });
    gsap.set(btns, { opacity: 0, y: 16 });
    gsap.set(image, { y: 20 });

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl
      .to(nav, { opacity: 1, y: 0, duration: 0.4 })
      .to(label, { opacity: 1, y: 0, duration: 0.3 }, '-=0.1')
      .to(bio, { opacity: 1, y: 0, duration: 0.4 }, '+=0.35')
      .to(btns, { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 }, '-=0.2')
      .to(image, { opacity: 1, y: 0, duration: 0.5 }, '<');

    const parallax = gsap.to(parallaxTarget, {
      y: -40,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => {
      tl.kill();
      parallax.scrollTrigger?.kill();
      parallax.kill();
      gsap.set([nav, label, bio, image, parallaxTarget, ...btns], { clearProps: 'all' });
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="pt-20 pb-32 lg:pt-32 lg:pb-40 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] items-center gap-12 lg:gap-16"
    >
      <div className="min-w-0">
        <p data-hero-label className="text-stone-500 font-medium tracking-wide text-sm uppercase mb-4">
          Backend Engineer
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-semibold tracking-tight text-stone-900 mb-6 leading-[1.1] break-words text-balance">
          <DecryptedText
            text={HERO_NAME}
            animateOn="view"
            sequential
            revealDirection="start"
            speed={50}
            encryptedClassName="text-stone-400"
          />
        </h1>
        <p data-hero-bio className="text-lg text-stone-600 leading-relaxed font-light mb-10">
          I am a rookie backend developer who enjoys trying new technologies instead of using one tech only. I am passionate about growing my skills and understanding how backend logic connects with reliable infrastructure.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            data-hero-btn
            ref={projectsBtn.ref}
            onMouseMove={projectsBtn.onMouseMove}
            onMouseLeave={projectsBtn.onMouseLeave}
            to="/#projects"
            className="magnetic flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 rounded-md hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            View Projects <ArrowRight size={16} />
          </Link>
          <a
            data-hero-btn
            ref={contactBtn.ref}
            onMouseMove={contactBtn.onMouseMove}
            onMouseLeave={contactBtn.onMouseLeave}
            href="mailto:teomeehua@gmail.com"
            className="magnetic flex items-center gap-2 px-6 py-3 border border-stone-300 rounded-md hover:bg-stone-200 transition-colors font-medium text-sm text-stone-900"
          >
            <Mail size={16} /> Contact Me
          </a>
          <a
            data-hero-btn
            ref={resumeBtn.ref}
            onMouseMove={resumeBtn.onMouseMove}
            onMouseLeave={resumeBtn.onMouseLeave}
            href="https://docs.google.com/document/d/1bSoNi0MSzojWipmAgBUMJmb8V38dLV8IbYYKth9xvhk/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="magnetic flex items-center gap-2 px-6 py-3 border border-stone-300 rounded-md hover:bg-stone-200 transition-colors font-medium text-sm text-stone-900"
          >
            <FileText size={16} /> Resume
          </a>
          <div data-hero-btn className="flex items-center gap-3 ml-2 border-l border-stone-300 pl-6">
            <a href="https://github.com/HaydenHuan03" className="text-stone-500 hover:text-stone-900 transition-colors">
              <Github size={20} />
            </a>
            <a
              href="https://www.instagram.com/hayden_1729/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 hover:text-stone-900 transition-colors"
            >
              <Instagram size={20} />
            </a>
          </div>
        </div>
      </div>

      <div data-hero-image className="relative w-full max-w-[380px] mx-auto lg:mx-0 lg:w-[380px]">
        <div data-hero-parallax className="relative">
          <PixelTransition
            firstImage="/Profile.webp"
            secondImage="/pointingFlower.jpeg"
            gridSize={14}
            pixelColor="#1c1917"
            animationStepDuration={800}
          />
        </div>
      </div>
    </section>
  );
}
