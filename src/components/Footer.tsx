import { Mail, Github, Instagram, ArrowUpRight } from 'lucide-react';
import { useMagnetic } from '../hooks/useMagnetic';

const SOCIALS = [
  { href: 'mailto:teomeehua@gmail.com', label: 'Email', icon: Mail, external: false },
  { href: 'https://github.com/HaydenHuan03', label: 'GitHub', icon: Github, external: true },
  { href: 'https://www.instagram.com/hayden_1729/', label: 'Instagram', icon: Instagram, external: true },
] as const;

function SocialLink({ href, label, icon: Icon, external }: (typeof SOCIALS)[number]) {
  const magnetic = useMagnetic<HTMLAnchorElement>(0.35);
  return (
    <a
      ref={magnetic.ref}
      onMouseMove={magnetic.onMouseMove}
      onMouseLeave={magnetic.onMouseLeave}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      aria-label={label}
      className="magnetic flex items-center justify-center w-11 h-11 rounded-full border border-stone-700 text-stone-400 hover:text-stone-50 hover:border-stone-500 transition-colors"
    >
      <Icon size={18} />
    </a>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();
  const contactMagnetic = useMagnetic<HTMLAnchorElement>(0.2);

  return (
    <footer className="bg-stone-900 text-stone-400 pt-16 pb-10">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-stone-800">
          <div>
            <p className="text-stone-500 text-sm uppercase tracking-wide mb-3">Get in touch</p>
            <a
              ref={contactMagnetic.ref}
              onMouseMove={contactMagnetic.onMouseMove}
              onMouseLeave={contactMagnetic.onMouseLeave}
              href="mailto:teomeehua@gmail.com"
              className="magnetic inline-flex items-center gap-3 font-heading font-semibold text-3xl sm:text-4xl text-stone-50 hover:text-accent transition-colors"
            >
              teomeehua@gmail.com
              <ArrowUpRight size={28} className="text-accent flex-shrink-0" />
            </a>
          </div>
          <div className="flex items-center gap-3">
            {SOCIALS.map((s) => (
              <SocialLink key={s.label} {...s} />
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 text-sm">
          <p className="font-light">© {year} Hayden Huan Kee Jiun. All rights reserved.</p>
          <p className="font-light text-stone-500">Built with React, Tailwind, and GSAP.</p>
        </div>
      </div>
    </footer>
  );
}
