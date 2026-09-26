import { useLocation } from 'react-router';
import { CodeXml, House, Images } from 'lucide-react';
import CardNav, { type CardNavItem } from './CardNav';
import ThemeToggle from './ThemeToggle';
import { PROFILE_URL, REPO_URL } from '@/lib/leetcode';

const ITEMS: CardNavItem[] = [
  {
    label: 'Home',
    icon: House,
    bgColor: 'var(--nav-card-1)',
    textColor: '#fafaf9',
    links: [
      { label: 'Overview', href: '/', ariaLabel: 'Home' },
      { label: 'About', href: '/#about', ariaLabel: 'About me' },
      { label: 'LeetCode', href: '/#leetcode', ariaLabel: 'LeetCode section' },
      { label: 'Projects', href: '/#projects', ariaLabel: 'Projects section' },
      { label: 'Journey', href: '/#journey', ariaLabel: 'Journey section' },
    ],
  },
  {
    label: 'LeetCode',
    icon: CodeXml,
    bgColor: 'var(--nav-card-2)',
    textColor: '#fafaf9',
    links: [
      { label: 'All solutions', href: '/leetcode', ariaLabel: 'All LeetCode solutions' },
      { label: 'Profile', href: PROFILE_URL, ariaLabel: 'LeetCode profile' },
      { label: 'Source', href: REPO_URL, ariaLabel: 'LeetCode solutions on GitHub' },
    ],
  },
  {
    label: 'Gallery',
    icon: Images,
    bgColor: 'var(--nav-card-3)',
    textColor: '#fafaf9',
    links: [{ label: 'World map', href: '/gallery', ariaLabel: 'Gallery world map' }],
  },
];

function currentLabel(pathname: string): string | undefined {
  if (pathname === '/' || pathname.startsWith('/projects')) return 'Home';
  if (pathname === '/leetcode' || pathname.startsWith('/leetcode/')) return 'LeetCode';
  if (pathname === '/gallery' || pathname.startsWith('/gallery/')) return 'Gallery';
  return undefined;
}

export default function Navbar({ floating = false }: { floating?: boolean }) {
  const { pathname } = useLocation();

  return (
    <CardNav
      items={ITEMS}
      currentLabel={currentLabel(pathname)}
      baseColor="var(--nav-base)"
      menuColor="var(--nav-menu)"
      actions={<ThemeToggle />}
      floating={floating}
    />
  );
}
