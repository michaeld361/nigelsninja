"use client";

import { FilmGrain, Shader, SolidColor } from "shaders/react";

/**
 * Login-only field. A flat site black with heavier static grain than the
 * rest of the site. No colour wash and no moving graphic.
 */
export default function LoginField() {
  return (
    <Shader aria-hidden className="pointer-events-none fixed inset-0 z-0" colorSpace="srgb" disableTelemetry>
      <FilmGrain animated={false} bias={0} strength={0.1}>
        <SolidColor color="#0E0F11" />
      </FilmGrain>
    </Shader>
  );
}
