import Loader from "@/components/Loader";
import Nav from "@/components/nav/Nav";
import UnmaskHero from "@/components/unmask/UnmaskHero";
import Hero from "@/components/hero/Hero";
import Marquee from "@/components/Marquee";
import About from "@/components/about/About";
import RaceLog from "@/components/racelog/RaceLog";
import Garage from "@/components/garage/Garage";
import Telemetry from "@/components/telemetry/Telemetry";
import TeamRadio from "@/components/radio/TeamRadio";
import OffTrack from "@/components/offtrack/OffTrack";
import Contact from "@/components/contact/Contact";
import Footer from "@/components/footer/Footer";
import NoiseDivider from "@/components/NoiseDivider";
import Hud from "@/components/hud/Hud";

export default function Home() {
  return (
    <>
      <Loader />
      <Nav />
      <main>
        <UnmaskHero />
        <Hero />
        <Marquee />
        <About />
        <NoiseDivider top="paper" bottom="asphalt" seed={3} />
        <RaceLog />
        <NoiseDivider top="asphalt" bottom="paper" seed={7} />
        <Garage />
        <NoiseDivider top="paper" bottom="asphalt" seed={11} />
        <Telemetry />
        <TeamRadio />
        <OffTrack />
        <NoiseDivider top="paper" bottom="asphalt" seed={19} />
        <Contact />
      </main>
      <Footer />
      <Hud />
    </>
  );
}
