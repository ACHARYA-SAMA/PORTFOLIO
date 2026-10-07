import RadioPanel from "./RadioPanel";
import FlyerWall from "./FlyerWall";
import StackedCards from "./StackedCards";
import SectionHead from "@/components/ui/SectionHead";
import { RADIO, chapterNo } from "@/lib/content";
import s from "./radio.module.css";

export default function TeamRadio() {
  const [squad, literati] = RADIO;
  return (
    <section id="radio" className={s.radio} data-theme="red" aria-labelledby="radio-title">
      <div className={s.wrap}>
        <SectionHead
          index={chapterNo("radio")}
          kicker="Leadership & design"
          meta="Work"
          title={["Team", "radio"]}
          titleClassName={s.title}
          titleId="radio-title"
        />
        <StackedCards>
          <RadioPanel {...squad} />
          <FlyerWall />
          <RadioPanel {...literati} />
        </StackedCards>
      </div>
    </section>
  );
}
