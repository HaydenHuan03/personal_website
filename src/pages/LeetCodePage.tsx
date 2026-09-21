import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FilterBar from '../components/leetcode/FilterBar';
import ProblemRow from '../components/leetcode/ProblemRow';
import type { SolutionsSnapshot } from '../types/leetcode';
import {
  EMPTY_FILTERS,
  groupByPrimaryTopic,
  matchesFilters,
  topicCounts,
  type Filters,
} from '../utils/leetcodeSolutions';
import snapshotJson from '../data/leetcode-solutions.json';

const snapshot = snapshotJson as unknown as SolutionsSnapshot;
const PROBLEMS = snapshot.problems;
const TOPICS = topicCounts(PROBLEMS);
const REPO_URL = 'https://github.com/HaydenHuan03/Leetcode';
const PROFILE_URL = 'https://leetcode.com/u/teomeehua/';

const BUTTON =
  'inline-flex items-center gap-2 px-5 py-2.5 border border-stone-300 rounded-md hover:bg-stone-200 transition-colors font-medium text-sm text-stone-900';

export default function LeetCodePage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    document.title = 'LeetCode Solutions - Hayden Huan';
    return () => {
      document.title = 'Hayden Huan - Backend Engineer & Infrastructure Developer';
    };
  }, []);

  const visible = useMemo(() => PROBLEMS.filter((p) => matchesFilters(p, filters)), [filters]);
  const groups = useMemo(() => groupByPrimaryTopic(visible), [visible]);

  return (
    <>
      <Navbar />
      <main id="main-content" className="max-w-4xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20">
        <Link
          to="/#leetcode"
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-12 text-sm font-medium"
        >
          <ArrowLeft size={16} /> Previous Page
        </Link>

        <header className="mb-10 animate-[fadeInUp_0.5s_ease-out]">
          <h1 className="text-4xl md:text-5xl font-heading font-semibold text-stone-900 mb-4 leading-[1.1] text-balance">
            LeetCode Solutions
          </h1>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href={PROFILE_URL} target="_blank" rel="noopener noreferrer" className={BUTTON}>
              LeetCode Profile <ExternalLink size={16} />
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={BUTTON}>
              Source on GitHub <ExternalLink size={16} />
            </a>
          </div>
        </header>

        {PROBLEMS.length === 0 ? (
          <p className="text-stone-500">
            Solutions are temporarily unavailable. Browse them directly on{' '}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-900">
              GitHub
            </a>
            .
          </p>
        ) : (
          <>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              topics={TOPICS}
              total={PROBLEMS.length}
              visible={visible.length}
            />

            {groups.length === 0 ? (
              <p className="mt-12 text-stone-500">
                No problems match.{' '}
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="underline hover:text-stone-900">
                  Clear filters
                </button>
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.topic} className="mt-12">
                  <h2 className="flex items-baseline gap-3 text-2xl font-heading font-semibold text-stone-900 mb-2">
                    {group.topic}
                    <span className="text-sm font-sans font-normal text-stone-400 tabular-nums">{group.problems.length}</span>
                  </h2>
                  <ul className="border-t border-stone-200">
                    {group.problems.map((p) => (
                      <ProblemRow key={p.id} problem={p} />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
