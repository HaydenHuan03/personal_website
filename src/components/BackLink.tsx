import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

interface BackLinkProps {
  to?: string;
  onClick?: () => void;
  children: ReactNode;
}

const STYLE =
  'inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors text-sm font-medium';

export default function BackLink({ to, onClick, children }: BackLinkProps) {
  return (
    <div className="px-4 md:px-6 pt-12 md:pt-20 mb-10">
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
