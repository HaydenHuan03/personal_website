import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide';
import { MorphIcon } from 'morphicons/react';

/**
 * Toggles the `.dark` class on <html> and saves the choice. It reads the real
 * theme after mounting, so the icon animation only plays when the user clicks.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = document.documentElement.classList.toggle('dark');
    setDark(next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // Storage blocked: the toggle still works for this visit.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="flex items-center justify-center size-11 rounded-full text-stone-900 dark:text-stone-50 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
    >
      <MorphIcon icon={dark ? Sun : Moon} size={20} spring="snappy" />
    </button>
  );
}
