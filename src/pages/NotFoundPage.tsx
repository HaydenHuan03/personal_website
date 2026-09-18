import { Link } from 'react-router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function NotFoundPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="max-w-3xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20 text-center">
        <p className="font-mono text-sm text-stone-400 mb-4">404</p>
        <h1 className="text-3xl font-heading font-semibold text-stone-900 mb-4 text-balance">
          Page not found
        </h1>
        <p className="text-stone-600 mb-8">
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 text-stone-50 rounded-md hover:bg-stone-800 transition-colors font-medium text-sm"
        >
          Return to Portfolio
        </Link>
      </main>
      <Footer />
    </>
  );
}
