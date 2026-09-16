import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import SkillsSection from '../components/SkillsSection';
import LeetCodeSection from '../components/LeetCodeSection';
import ProjectsSection from '../components/ProjectsSection';
import JourneySection from '../components/JourneySection';
import Footer from '../components/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 md:px-12 pb-24">
        <HeroSection />
        <SkillsSection />
        <LeetCodeSection />
        <ProjectsSection />
        <JourneySection />
      </main>
      <Footer />
    </>
  );
}
