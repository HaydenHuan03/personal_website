import { Github, Instagram, ArrowUpRight } from 'lucide-react';
import { useMagnetic } from '@/hooks/useMagnetic';

const SOCIALS = [
  { href: 'https://github.com/HaydenHuan03', label: 'GitHub', icon: Github, external: true },
  { href: 'https://www.instagram.com/hayden_1729/', label: 'Instagram', icon: Instagram, external: true },
] as const;

function SocialLink({ href, label, icon: Icon, external, index }: (typeof SOCIALS)[number] & { index: number }) {
  const magnetic = useMagnetic<HTMLAnchorElement>(0.35);
  return (
    <a
      {...magnetic}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      style={{ animationDelay: `${index * 0.4}s` }}
      className="magnetic float inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-stone-50 text-sm font-medium text-stone-900 shadow-lg shadow-black/30 hover:bg-white hover:text-accent"
    >
      <Icon size={16} />
      {label}
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
              {...contactMagnetic}
              href="mailto:teomeehua@gmail.com"
              className="magnetic inline-flex items-center gap-3 font-heading font-semibold text-3xl sm:text-4xl text-stone-50 hover:text-accent transition-colors"
            >
              teomeehua@gmail.com
              <ArrowUpRight size={28} className="text-accent flex-shrink-0" />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {SOCIALS.map((s, i) => (
              <SocialLink key={s.label} {...s} index={i} />
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 text-sm">
          <p className="font-light">© {year} Hayden Huan Kee Jiun. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
