import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

interface BackLinkProps {
  to?: string;
  onClick?: () => void;
  children: ReactNode;
}

const STYLE =
  'inline-flex items-center gap-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 transition-colors text-sm font-medium';

export default function BackLink({ to, onClick, children }: BackLinkProps) {
  return (
    <div className="max-w-[90rem] mx-auto px-6 md:px-12 pt-12 md:pt-20 mb-10">
      {to ? (
        <Link to={to} className={STYLE}>
          <ArrowLeft size={16} /> {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={STYLE}>
          <ArrowLeft size={16} /> {children}
        </button>
      )}
    </div>
  );
}
