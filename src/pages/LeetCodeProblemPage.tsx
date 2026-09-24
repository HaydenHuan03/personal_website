import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackLink from '../components/BackLink';
import ProblemDetail from '../components/leetcode/ProblemDetail';
import type { DescriptionMap, SolutionsSnapshot } from '../types/leetcode';
import snapshotJson from '../data/leetcode-solutions.json';
import descriptionsJson from '../data/leetcode-descriptions.json';

const PROBLEMS = (snapshotJson as unknown as SolutionsSnapshot).problems;
const DESCRIPTIONS = descriptionsJson as DescriptionMap;

export default function LeetCodeProblemPage() {
  const { slug } = useParams<{ slug: string }>();
  const problem = PROBLEMS.find((p) => p.slug === slug);

  useEffect(() => {
    if (problem) document.title = `${problem.title} - Hayden Huan`;
    return () => {
      document.title = 'Hayden Huan - Backend Engineer & Infrastructure Developer';
    };
  }, [problem]);

  if (!problem) {
    return (
      <>
        <Navbar />
        <main id="main-content" className="max-w-3xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20">
          <h1 className="text-3xl font-heading font-semibold text-stone-900 dark:text-stone-50 mb-4">Problem not found</h1>
          <Link to="/leetcode" className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 underline">
            Back to all solutions
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <BackLink to="/leetcode">All Solutions</BackLink>
      <main id="main-content" className="max-w-[90rem] mx-auto px-6 md:px-12 pb-24">
        <ProblemDetail problem={problem} descriptionHtml={DESCRIPTIONS[problem.slug] ?? null} />
      </main>
      <Footer />
    </>
  );
}
