import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useHoverCapable } from '../hooks/useHoverCapable';
import { useReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/** Sections of the home page, in the order they appear on it. */
const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'leetcode', label: 'LeetCode' },
  { id: 'projects', label: 'Projects' },
  { id: 'journey', label: 'Journey' },
] as const;

interface NavPage {
  to: string;
  label: string;
  /** Sections within this page, offered as a dropdown. */
  sections?: readonly { id: string; label: string }[];
  /** Extra path prefixes that still count as being on this page. */
  owns?: readonly string[];
}

/**
 * The nav is page-level: one entry per page, not per section. A page that has
 * sections offers them in a dropdown under its own entry, so the bar means the
 * same thing everywhere rather than listing anchors that only resolve on one
 * page.
 */
const PAGES: readonly NavPage[] = [
  // Project case studies are reached from the home page's Projects section and
  // have no nav entry of their own, so they keep Home marked as current.
  { to: '/', label: 'Home', sections: SECTIONS, owns: ['/projects'] },
  { to: '/leetcode', label: 'LeetCode' },
  { to: '/gallery', label: 'Gallery' },
];

function isCurrent(page: NavPage, pathname: string): boolean {
  if (page.to === '/') {
    return pathname === '/' || (page.owns ?? []).some((prefix) => pathname.startsWith(prefix));
  }
  return pathname === page.to || pathname.startsWith(`${page.to}/`);
}

export default function Navbar() {
  const location = useLocation();
  const { pathname } = location;
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const pendingFocus = useRef(false);
  const hoverCapable = useHoverCapable();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(document.documentElement.scrollTop > 8);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The indicator marks the current page now, so it moves on navigation rather
  // than on scroll.
  useEffect(() => {
    const indicator = indicatorRef.current;
    const container = containerRef.current;
    if (!indicator || !container) return;

    const current = PAGES.find((page) => isCurrent(page, pathname));
    const target = current
      ? container.querySelector<HTMLElement>(`[data-nav-page="${current.to}"]`)
      : null;

    if (!target) {
      gsap.to(indicator, { opacity: 0, duration: reducedMotion ? 0 : 0.2 });
      return;
    }
    // Measured against the container: each entry sits in its own positioned
    // wrapper (for the dropdown), so offsetLeft would be relative to that.
    const origin = container.getBoundingClientRect().left;
    const box = target.getBoundingClientRect();
    gsap.to(indicator, {
      x: box.left - origin,
      width: box.width,
      opacity: 1,
      duration: reducedMotion ? 0 : 0.3,
      ease: 'power2.out',
    });
  }, [pathname, reducedMotion]);

  // Scroll-spy still runs, but only to mark which section you are in inside
  // the dropdown - the sections exist on the home page alone.
  useEffect(() => {
    if (pathname !== '/') {
      setActiveSection(null);
      return;
    }
    const triggers: ScrollTrigger[] = [];
    for (const { id } of SECTIONS) {
      const section = document.getElementById(id);
      if (!section) continue;
      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => setActiveSection(id),
          onEnterBack: () => setActiveSection(id),
        })
      );
    }
    return () => triggers.forEach((t) => t.kill());
  }, [pathname]);

  // Any navigation closes the menu, including a hash link within this page.
  useEffect(() => setOpenMenu(null), [location]);

  const focusItem = useCallback((menu: string, index: number) => {
    const items = containerRef.current?.querySelectorAll<HTMLElement>(
      `[data-menu="${menu}"] [role="menuitem"]`
    );
    if (!items?.length) return;
    const wrapped = (index + items.length) % items.length;
    items[wrapped]?.focus();
  }, []);

  useEffect(() => {
    if (!openMenu || !pendingFocus.current) return;
    pendingFocus.current = false;
    focusItem(openMenu, 0);
  }, [openMenu, focusItem]);

  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [openMenu]);

  return (
    <nav
      aria-label="Main"
      className={`sticky top-0 z-50 bg-stone-50/80 backdrop-blur-sm transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_1px_0_0_rgba(28,25,23,0.08)]' : ''
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-5 flex justify-center items-center">
        <div
          ref={containerRef}
          className="relative flex gap-6 text-sm font-medium text-stone-600 pb-1"
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || !openMenu) return;
            const toggle = containerRef.current?.querySelector<HTMLElement>(
              `[data-menu-toggle="${openMenu}"]`
            );
            setOpenMenu(null);
            toggle?.focus();
          }}
        >
          {PAGES.map((page) => {
            const current = isCurrent(page, pathname);
            const open = openMenu === page.to;
            const menuId = `nav-menu-${page.label.toLowerCase()}`;

            return (
              <div
                key={page.to}
                className="relative"
                onMouseEnter={() => hoverCapable && page.sections && setOpenMenu(page.to)}
                onMouseLeave={() => hoverCapable && setOpenMenu(null)}
              >
                <span className="inline-flex items-center gap-1">
                  <Link
                    to={page.to}
                    data-nav-page={page.to}
                    aria-current={current ? 'page' : undefined}
                    className={`transition-colors hover:text-stone-900 ${
                      current ? 'text-stone-900' : ''
                    }`}
                  >
                    {page.label}
                  </Link>

                  {page.sections && (
                    <button
                      type="button"
                      data-menu-toggle={page.to}
                      aria-haspopup="menu"
                      aria-expanded={open}
                      aria-controls={menuId}
                      aria-label={`${page.label} sections`}
                      onClick={() => setOpenMenu(open ? null : page.to)}
                      onKeyDown={(event) => {
                        if (event.key !== 'ArrowDown') return;
                        event.preventDefault();
                        pendingFocus.current = true;
                        setOpenMenu(page.to);
                      }}
                      className="text-stone-400 hover:text-stone-900 transition-colors"
                    >
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </span>

                {page.sections && open && (
                  <div
                    id={menuId}
                    data-menu={page.to}
                    role="menu"
                    aria-label={`${page.label} sections`}
                    className="absolute left-0 top-full pt-3 min-w-[9rem]"
                  >
                    <div className="rounded-lg border border-stone-200 bg-stone-50 py-1.5 shadow-lg">
                      {page.sections.map((section, index) => (
                        <Link
                          key={section.id}
                          role="menuitem"
                          to={`${page.to}#${section.id}`}
                          aria-current={activeSection === section.id ? 'true' : undefined}
                          onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                              event.preventDefault();
                              focusItem(page.to, index + 1);
                            } else if (event.key === 'ArrowUp') {
                              event.preventDefault();
                              focusItem(page.to, index - 1);
                            }
                          }}
                          className={`block px-4 py-1.5 hover:bg-stone-100 hover:text-stone-900 transition-colors ${
                            activeSection === section.id ? 'text-stone-900' : ''
                          }`}
                        >
                          {section.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <span
            ref={indicatorRef}
            className="absolute bottom-0 left-0 h-[2px] bg-stone-900 rounded-full pointer-events-none"
            style={{ width: 0, opacity: 0 }}
          />
        </div>
      </div>
    </nav>
  );
}
