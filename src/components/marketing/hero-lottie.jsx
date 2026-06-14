"use client";

import { DotLottieReact, setWasmUrl } from "@lottiefiles/dotlottie-react";

setWasmUrl("/dotlottie-player.wasm");

/** Hero animation — expects /public/cat-launch.lottie */
export function HeroLottie({ className }) {
  return (
    <div className={className}>
      <DotLottieReact
        src="/cat-launch.lottie"
        loop
        autoplay
        className="h-64 w-64 md:h-80 md:w-80"
      />
    </div>
  );
}
