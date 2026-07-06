"use client";

import { useEffect } from "react";

const VP_WIDTHS: Record<string, number> = { mobile: 390, tablet: 768 };

export default function DevViewportFrame({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Skip CSS constraint when running inside the /preview iframe — the
    // iframe already has the correct viewport width, no need to clamp further.
    if (window.self !== window.top) return;
    const vp = localStorage.getItem("dev_viewport");
    if (!vp) return;
    const el = document.getElementById("dev-viewport-frame");
    const width = VP_WIDTHS[vp];
    if (el && width) {
      el.style.maxWidth = `${width}px`;
      el.style.margin = "0 auto";
      el.style.boxShadow = "0 0 0 1px rgba(99,102,241,0.25), 0 8px 40px rgba(0,0,0,0.12)";
      el.style.minHeight = "100dvh";
    }
    document.documentElement.dataset.devViewport = vp;
  }, []);

  return <div id="dev-viewport-frame">{children}</div>;
}
