import ContactButton from '../components/ContactButton'
import FadeIn from '../components/FadeIn'

const NAV_LINKS = [
  { label: '作品', href: '#projects' },
  { label: '联系', href: '#contact' },
]

export default function HeroSection() {
  return (
    <section className="relative h-[46vh] min-h-[340px] flex flex-col overflow-x-clip">
      {/* Navbar */}
      <FadeIn
        as="nav"
        y={-20}
        delay={0}
        className="flex justify-between items-center px-6 md:px-10 pt-6 md:pt-8"
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-[#D7E2EA] font-medium tracking-wider text-sm md:text-lg hover:opacity-70 transition-opacity duration-200"
          >
            {link.label}
          </a>
        ))}
      </FadeIn>

      {/* Hero Heading */}
      <div className="overflow-hidden">
        <FadeIn
          as="h1"
          y={40}
          delay={0.15}
          className="hero-heading font-black tracking-tight leading-none whitespace-nowrap w-full text-[13vw] sm:text-[14vw] md:text-[15vw] lg:text-[16vw] mt-4"
        >
          你好，我是 xiaofeng
        </FadeIn>
      </div>

      {/* Bottom bar */}
      <div className="mt-auto flex justify-between items-end pb-6 sm:pb-8 px-6 md:px-10">
        <FadeIn
          as="p"
          y={20}
          delay={0.35}
          className="text-[#D7E2EA] font-light tracking-wide leading-snug max-w-[200px] sm:max-w-[280px] md:max-w-[340px]"
        >
          <span style={{ fontSize: 'clamp(0.8rem, 1.4vw, 1.4rem)' }}>
            独立开发者 · 打造人们喜爱的原生 macOS 应用
          </span>
        </FadeIn>
        <FadeIn y={20} delay={0.5}>
          <ContactButton />
        </FadeIn>
      </div>
    </section>
  )
}
