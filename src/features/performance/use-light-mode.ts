"use client";

import { useEffect, useState } from "react";
import { detectLightMode, LIGHT_MODE_EVENT } from "./light-mode";

export function useLightMode(): boolean {
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    const sync = () => setLightMode(detectLightMode());
    sync();
    window.addEventListener(LIGHT_MODE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(LIGHT_MODE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return lightMode;
}
