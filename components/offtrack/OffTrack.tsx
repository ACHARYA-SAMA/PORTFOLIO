import StickerBoard from "./StickerBoard";
import SectionHead from "@/components/ui/SectionHead";
import Reveal from "@/components/ui/Reveal";
import { OFF_TRACK_LINE, chapterNo } from "@/lib/content";
import s from "./offtrack.module.css";

export default function OffTrack() {
  return (
    <section id="off-track" className={s.off} data-theme="paper" aria-labelledby="off-title">
      <div className={s.wrap}>
        <SectionHead
          index={chapterNo("off-track")}
          kicker="Fun facts"
          meta="Drag the stickers"
          title={["Off the", "track"]}
          titleClassName={s.title}
          titleId="off-title"
        />
        <div className={s.boardWrap}>
          <StickerBoard />
          <Reveal as="p" type="lines" className={s.corner}>
            {OFF_TRACK_LINE}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
