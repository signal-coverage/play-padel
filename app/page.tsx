import {
  LandingAbout,
  LandingCtaBanner,
  LandingEvents,
  LandingFeatures,
  LandingFooter,
  LandingHeader,
  LandingHero,
  LandingTestimonials,
  LandingTrusted,
} from "@/app/_components";

export default function HomePage() {
  return (
    <div className="theme-light font-(family-name:--font-jakarta) bg-white">
      <LandingHeader />
      <LandingHero />
      <LandingTrusted />
      <LandingAbout />
      <LandingFeatures />
      <LandingEvents />
      <LandingTestimonials />
      <LandingCtaBanner />
      <LandingFooter />
    </div>
  );
}
