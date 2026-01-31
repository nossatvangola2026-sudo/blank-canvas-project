import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/home/HeroSection";
import TasksSection from "@/components/home/TasksSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import Footer from "@/components/home/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <TasksSection />
      <HowItWorksSection />
      <Footer />
    </div>
  );
};

export default Index;
