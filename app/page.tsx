import {
  LandingAbout,
  LandingCtaBanner,
  LandingFeatures,
  LandingFooter,
  LandingHeader,
  LandingHero,
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
      <LandingCtaBanner />
      <LandingFooter />
    </div>
  );
}
