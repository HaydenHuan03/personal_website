import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Mail, Github, Instagram } from 'lucide-react';
import PixelTransition from './PixelTransition';

const HERO_NAME = 'Hayden Huan Kee Jiun';

function scramble(el: HTMLElement, totalDuration = 900): () => void {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const TICK = 45;
  const finalText = el.dataset.text ?? el.textContent ?? '';

  el.innerHTML = '';
  const items: { span: HTMLSpanElement; final: string }[] = [];

  for (const char of finalText) {
    if (char === ' ') {
      el.appendChild(document.createTextNode(' '));
    } else {
      const span = document.createElement('span');
      span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
      el.appendChild(span);
      items.push({ span, final: char });
    }
  }

  const intervals = items.map(({ span }) =>
    setInterval(() => {
      span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
    }, TICK)
  );

  const step = totalDuration / items.length;
  const timeouts = items.map(({ span, final }, i) =>
    setTimeout(() => {
      clearInterval(intervals[i]);
      span.textContent = final;
    }, step * (i + 1))
  );

  return () => {
    intervals.forEach(clearInterval);
    timeouts.forEach(clearTimeout);
    el.textContent = finalText;
  };
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const nameEl = nameRef.current;
    if (!section || !nameEl) return;

    const label = section.querySelector<HTMLElement>('[data-hero-label]');
    const bio = section.querySelector<HTMLElement>('[data-hero-bio]');
    const btns = Array.from(section.querySelectorAll<HTMLElement>('[data-hero-btn]'));
    const image = section.querySelector<HTMLElement>('[data-hero-image]');
    const nav = document.querySelector<HTMLElement>('nav');

    let cancelScramble: (() => void) | undefined;

    gsap.set([nav, label, bio, image], { opacity: 0 });
    gsap.set(nav, { y: -20 });
    gsap.set([label, bio], { y: 16 });
    gsap.set(btns, { opacity: 0, y: 16 });
    gsap.set(image, { y: 20 });
    gsap.set(nameEl, { opacity: 0 });

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl
      .to(nav, { opacity: 1, y: 0, duration: 0.4 })
      .to(label, { opacity: 1, y: 0, duration: 0.3 }, '-=0.1')
      .add(() => {
        gsap.set(nameEl, { opacity: 1 });
        cancelScramble = scramble(nameEl, 900);
      })
      .to(bio, { opacity: 1, y: 0, duration: 0.4 }, '+=0.35')
      .to(btns, { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 }, '-=0.2')
      .to(image, { opacity: 1, y: 0, duration: 0.5 }, '<');

    return () => {
      tl.kill();
      cancelScramble?.();
      gsap.set([nav, label, bio, image, nameEl, ...btns], { clearProps: 'all' });
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
        <h1
          ref={nameRef}
          data-text={HERO_NAME}
          className="text-4xl sm:text-5xl lg:text-6xl font-heading font-semibold tracking-tight text-stone-900 mb-6 leading-[1.1] break-words"
        >
          {HERO_NAME}
        </h1>
        <p data-hero-bio className="text-lg text-stone-600 leading-relaxed font-light mb-10">
          I am a rookie backend developer who enjoys trying new technologies instead of using one tech only. I am passionate about growing my skills and understanding how backend logic connects with reliable infrastructure.
        </p>

        <div className="flex flex-wrap gap-4">
          <a
            data-hero-btn
            href="#projects"
            className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 rounded-md hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            View Projects <ArrowRight size={16} />
          </a>
          <a
            data-hero-btn
            href="mailto:teomeehua@gmail.com"
            className="flex items-center gap-2 px-6 py-3 border border-stone-300 rounded-md hover:bg-stone-200 transition-colors font-medium text-sm text-stone-900"
          >
            <Mail size={16} /> Contact Me
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

      <div data-hero-image className="w-full max-w-[380px] mx-auto lg:mx-0 lg:w-[380px]">
        <PixelTransition
          firstImage="/Profile.webp"
          secondImage="/pointingFlower.jpeg"
          gridSize={14}
          pixelColor="#1c1917"
          animationStepDuration={800}
        />
      </div>
    </section>
  );
}
