"use client";

import { useEffect, useState } from "react";
import { Aurora, FilmGrain, Shader, Vignette } from "shaders/react";

/**
 * Login-only field. A coral aurora on the site black, with grain and a
 * vignette so the wordmark and the form stay readable. Not a Rolling Shadows
 * shader: no mouse bulge, no gold, no pink.
 */
export default function LoginField() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const still = reduceMotion;

  return (
    <Shader aria-hidden className="pointer-events-none fixed inset-0 z-0" colorSpace="srgb" disableTelemetry>
      <Vignette color="#0E0F11" center={{ x: 0.42, y: 0.42 }} radius={0.62} falloff={0.85} intensity={0.78}>
        <FilmGrain animated={!still} bias={1.2} strength={0.055}>
          <Aurora
            colorA="#140c0b"
            colorB="#FF6B5B"
            colorC="#0E0F11"
            colorSpace="oklch"
            balance={32}
            intensity={still ? 28 : 62}
            curtainCount={3}
            speed={still ? 0 : 2.8}
            waviness={still ? 0 : 120}
            rayDensity={36}
            height={170}
            center={{ x: 0.55, y: 0.08 }}
            seed={4}
          />
        </FilmGrain>
      </Vignette>
    </Shader>
  );
}
