"use client";

import { useEffect, useState } from "react";
import { FilmGrain, FlowingGradient, Shader } from "shaders/react";

/**
 * Quiet page field from the Shaders library: a very slow FlowingGradient
 * drift, then a static FilmGrain. Not one of the saved Rolling Shadows shaders.
 * Headlines, buttons, and text are left alone.
 */
export default function PageField() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <Shader aria-hidden className="pointer-events-none fixed inset-0 z-0" colorSpace="srgb" disableTelemetry>
      <FilmGrain animated={false} bias={2} strength={0.025}>
        <FlowingGradient
          colorA="#0E0F11"
          colorB="#131517"
          colorC="#161311"
          colorD="#101216"
          colorSpace="oklch"
          distortion={0.1}
          speed={reduceMotion ? 0 : 0.1}
        />
      </FilmGrain>
    </Shader>
  );
}
