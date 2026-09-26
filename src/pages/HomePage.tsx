import Navbar from '@/components/layout/Navbar';
import HeroSection from '@/components/home/HeroSection';
import LeetCodeSection from '@/components/home/LeetCodeSection';
import ProjectsSection from '@/components/home/ProjectsSection';
import JourneySection from '@/components/home/JourneySection';
import Footer from '@/components/layout/Footer';

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
