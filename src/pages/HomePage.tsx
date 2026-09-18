import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import LeetCodeSection from '../components/LeetCodeSection';
import ProjectsSection from '../components/ProjectsSection';
import JourneySection from '../components/JourneySection';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="max-w-5xl mx-auto px-6 md:px-12 pb-24">
        <HeroSection />
        <LeetCodeSection />
        <ProjectsSection />
        <JourneySection />
      </main>
      <Footer />
    </>
  );
}
