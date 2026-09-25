import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { gsap } from 'gsap';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

type CardNavLink = {
  label: string;
  href: string;
  ariaLabel: string;
};

export type CardNavItem = {
  label: string;
  /** Shown beside the label when this item is the current page. */
  icon?: LucideIcon;
  bgColor: string;
  textColor: string;
  links: CardNavLink[];
};

export interface CardNavProps {
  /** The page currently being viewed, shown opposite the menu. */
  currentLabel?: string;
  items: CardNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  /** Controls at the right end of the bar, such as the theme toggle. */
  actions?: React.ReactNode;
  /** Take no space in the page, so the content starts under the bar. */
  floating?: boolean;
}

/** How far down the page the bar starts tucking away on a downward scroll. */
const HIDE_AFTER = 80;

/** Scroll movement below this is jitter or rubber-banding, not intent. */
const SCROLL_NOISE = 4;

/** External links leave the app, so they keep a plain anchor. */
const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

const CardNav: React.FC<CardNavProps> = ({
  currentLabel,
  items,
  className = '',
  ease = 'power3.out',
  baseColor = '#fff',
  menuColor,
  actions,
  floating = false
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const lastScrollY = useRef(0);
  const [scrolledPast, setScrolledPast] = useState(false);
  const reducedMotion = useReducedMotion();
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const { pathname } = useLocation();
  const CurrentIcon = items.find((item) => item.label === currentLabel)?.icon;

  // The bar floats narrower than the content columns, so leaving it in place
  // would let text slide past in the gutters. It tucks away on the way down
  // and comes back the moment you scroll up.
  useEffect(() => {
    lastScrollY.current = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastScrollY.current;
        if (Math.abs(delta) > SCROLL_NOISE) {
          setScrolledPast(y > HIDE_AFTER && delta > 0);
          lastScrollY.current = y;
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 260;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const contentEl = navEl.querySelector('.card-nav-content') as HTMLElement;
      if (contentEl) {
        const wasVisible = contentEl.style.visibility;
        const wasPointerEvents = contentEl.style.pointerEvents;
        const wasPosition = contentEl.style.position;
        const wasHeight = contentEl.style.height;

        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';

        contentEl.offsetHeight;

        const topBar = 60;
        const padding = 16;
        const contentHeight = contentEl.scrollHeight;

        contentEl.style.visibility = wasVisible;
        contentEl.style.pointerEvents = wasPointerEvents;
        contentEl.style.position = wasPosition;
        contentEl.style.height = wasHeight;

        return topBar + contentHeight + padding;
      }
    }
    return 260;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 60, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: 50, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease
    });

    if (scrimRef.current) {
      gsap.set(scrimRef.current, { opacity: 0 });
      tl.to(scrimRef.current, { opacity: 1, duration: 0.3, ease }, 0);
    }

    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });

        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          tlRef.current = newTl;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  const closeMenu = () => {
    const tl = tlRef.current;
    if (!tl || !isExpanded) return;
    setIsHamburgerOpen(false);
    tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
    tl.reverse();
  };

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      closeMenu();
    }
  };

  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef.current[i] = el;
  };

  const hidden = scrolledPast && !isExpanded;

  return (
    <>
      {/* Pulls focus to the open menu by blurring the page behind it. Sits
          outside the nav container, whose transform would otherwise make it
          the containing block for this fixed element. */}
      <div
        ref={scrimRef}
        aria-hidden="true"
        onClick={closeMenu}
        className={`card-nav-scrim fixed inset-0 z-[98] bg-stone-50/40 dark:bg-stone-950/40 backdrop-blur-md ${
          isExpanded ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
        style={{ opacity: 0 }}
      />

      <div
        className={`card-nav-container sticky top-4 z-[99] mx-auto mt-[1.2em] md:mt-[2em] ${
          floating ? 'mb-[calc(-60px-1.2em)] md:mb-[calc(-60px-2em)]' : ''
        } w-[90%] max-w-[800px] transition-transform ${
          reducedMotion ? 'duration-0' : 'duration-300'
        } ease-out ${hidden ? '-translate-y-[calc(100%+1.5rem)]' : 'translate-y-0'} ${className}`}
        onFocusCapture={() => setScrolledPast(false)}
      >
        <nav
          ref={navRef}
          aria-label="Main"
          className={`card-nav ${isExpanded ? 'open' : ''} block h-[60px] p-0 rounded-xl shadow-md relative overflow-hidden will-change-[height]`}
          style={{ backgroundColor: baseColor }}
        >
          <div className="card-nav-top absolute inset-x-0 top-0 h-[60px] flex items-center justify-between p-2 pl-[1.1rem] z-[2]">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <div
                className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''} group h-full flex flex-col items-center justify-center cursor-pointer gap-[6px]`}
                onClick={toggleMenu}
                onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleMenu();
                  }
                }}
                role="button"
                aria-label={isExpanded ? 'Close menu' : 'Open menu'}
                aria-expanded={isExpanded}
                tabIndex={0}
                style={{ color: menuColor || '#000' }}
              >
                <div
                  className={`hamburger-line w-[30px] h-[2px] bg-current transition-[transform,opacity,margin] duration-300 ease-linear [transform-origin:50%_50%] ${
                    isHamburgerOpen ? 'translate-y-[4px] rotate-45' : ''
                  } group-hover:opacity-75`}
                />
                <div
                  className={`hamburger-line w-[30px] h-[2px] bg-current transition-[transform,opacity,margin] duration-300 ease-linear [transform-origin:50%_50%] ${
                    isHamburgerOpen ? '-translate-y-[4px] -rotate-45' : ''
                  } group-hover:opacity-75`}
                />
              </div>
            </div>

            {currentLabel && (
              <span
                className="absolute left-1/2 -translate-x-1/2 inline-flex items-center gap-2 font-heading text-xl md:text-2xl font-bold tracking-tight"
                style={{ color: menuColor || '#000' }}
              >
                {CurrentIcon && <CurrentIcon className="size-5 md:size-6 shrink-0" aria-hidden="true" />}
                {currentLabel}
              </span>
            )}

            {actions}
          </div>

          <div
            className={`card-nav-content absolute left-0 right-0 top-[60px] bottom-0 p-2 flex flex-col items-stretch gap-2 justify-start z-[1] ${
              isExpanded ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
            } md:flex-row md:items-end md:gap-[12px]`}
            aria-hidden={!isExpanded}
          >
            {(items || []).slice(0, 3).map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                className="nav-card select-none relative flex flex-col gap-2 p-[12px_16px] rounded-[calc(0.75rem-0.2rem)] min-w-0 flex-[1_1_auto] h-auto min-h-[60px] md:h-full md:min-h-0 md:flex-[1_1_0%]"
                ref={setCardRef(idx)}
                style={{ backgroundColor: item.bgColor, color: item.textColor }}
              >
                <div className="nav-card-label font-normal tracking-[-0.5px] text-[18px] md:text-[22px]">
                  {item.label}
                </div>
                <div className="nav-card-links mt-auto flex flex-col gap-[2px]">
                  {item.links?.map((lnk, i) => {
                    const className =
                      'nav-card-link inline-flex items-center gap-[6px] no-underline cursor-pointer transition-opacity duration-300 hover:opacity-75 text-[15px] md:text-[16px]';
                    const icon = <ArrowUpRight size={16} className="nav-card-link-icon shrink-0" aria-hidden="true" />;
                    const key = `${lnk.label}-${i}`;

                    if (isExternal(lnk.href)) {
                      return (
                        <a
                          key={key}
                          className={className}
                          href={lnk.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={lnk.ariaLabel}
                        >
                          {icon}
                          {lnk.label}
                        </a>
                      );
                    }

                    return (
                      <Link
                        key={key}
                        className={className}
                        to={lnk.href}
                        aria-label={lnk.ariaLabel}
                        aria-current={lnk.href === pathname ? 'page' : undefined}
                        onClick={closeMenu}
                      >
                        {icon}
                        {lnk.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default CardNav;
