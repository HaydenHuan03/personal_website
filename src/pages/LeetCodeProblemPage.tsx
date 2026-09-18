import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
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
        <main id="main-content" className="max-w-3xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20 text-center">
          <h1 className="text-3xl font-heading font-semibold text-stone-900 mb-4">Problem not found</h1>
          <Link to="/leetcode" className="text-stone-600 hover:text-stone-900 underline">
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
      <main id="main-content" className="max-w-6xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20">
        <Link
          to="/leetcode"
          className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-12 text-sm font-medium"
        >
          <ArrowLeft size={16} /> All Solutions
        </Link>
        <ProblemDetail problem={problem} descriptionHtml={DESCRIPTIONS[problem.slug] ?? null} />
      </main>
      <Footer />
    </>
  );
}
