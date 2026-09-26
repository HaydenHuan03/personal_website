import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

interface BackLinkProps {
  to: string;
  children: ReactNode;
}

export default function BackLink({ to, children }: BackLinkProps) {
  return (
    <div className="max-w-[90rem] mx-auto px-6 md:px-12 pt-12 md:pt-20 mb-10">
      <Link
        to={to}
        className="inline-flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} /> {children}
      </Link>
    </div>
  );
}
