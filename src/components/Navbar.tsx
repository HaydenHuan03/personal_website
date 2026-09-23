import { useLocation } from 'react-router';
import { CodeXml, Globe, House } from 'lucide-react';
import CardNav, { type CardNavItem } from './CardNav';

const ITEMS: CardNavItem[] = [
  {
    label: 'Home',
    icon: House,
    bgColor: '#1c1917',
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
    bgColor: '#292524',
    textColor: '#fafaf9',
    links: [
      { label: 'All solutions', href: '/leetcode', ariaLabel: 'All LeetCode solutions' },
      {
        label: 'Profile',
        href: 'https://leetcode.com/u/teomeehua/',
        ariaLabel: 'LeetCode profile',
      },
      {
        label: 'Source',
        href: 'https://github.com/HaydenHuan03/Leetcode',
        ariaLabel: 'LeetCode solutions on GitHub',
      },
    ],
  },
  {
    label: 'Gallery',
    icon: Globe,
    bgColor: '#44403c',
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

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <CardNav
      items={ITEMS}
      currentLabel={currentLabel(pathname)}
      baseColor="#ffffff"
      menuColor="#1c1917"
    />
  );
}
