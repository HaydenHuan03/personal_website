import { Mail, Github, Instagram } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-stone-900 text-stone-400 py-12">
      <div className="max-w-5xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
        <p className="font-light">© {year} Hayden Huan Kee Jiun. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <a
            href="mailto:teomeehua@gmail.com"
            aria-label="Email"
            className="hover:text-stone-100 transition-colors"
          >
            <Mail size={18} />
          </a>
          <a
            href="https://github.com/HaydenHuan03"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="hover:text-stone-100 transition-colors"
          >
            <Github size={18} />
          </a>
          <a
            href="https://www.instagram.com/hayden_1729/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="hover:text-stone-100 transition-colors"
          >
            <Instagram size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
}
