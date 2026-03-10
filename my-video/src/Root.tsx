import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { TermsConfusion } from "./components/TermsConfusion";
import { IntroScene } from "./components/IntroScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="TermsConfusion"
        component={TermsConfusion}
        durationInFrames={210}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="Intro"
        component={IntroScene}
        durationInFrames={420}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
