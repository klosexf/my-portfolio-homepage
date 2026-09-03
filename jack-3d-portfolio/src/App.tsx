import HeroSection from './sections/HeroSection'
import ProjectsSection from './sections/ProjectsSection'

export default function App() {
  return (
    <main className="bg-[#0C0C0C] min-h-screen" style={{ overflowX: 'clip' }}>
      <HeroSection />
      <ProjectsSection />
    </main>
  )
}
