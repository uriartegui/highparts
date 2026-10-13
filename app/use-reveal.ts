"use client";
import { useEffect } from "react";

// Fades `.hp-reveal` elements in as they enter the viewport, including ones
// rendered later (async data). Elements are only hidden once this runs
// (`html.hp-motion`), so content stays visible if JavaScript fails. Without
// IntersectionObserver, or with reduced motion, everything shows immediately.
export function useReveal() {
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduced) return;
    document.documentElement.classList.add("hp-motion");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    const scan = () =>
      document.querySelectorAll<HTMLElement>(".hp-reveal:not(.is-visible):not([data-hp-watched])").forEach((item) => {
        item.dataset.hpWatched = "1";
        observer.observe(item);
      });
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      observer.disconnect();
      document.documentElement.classList.remove("hp-motion");
    };
  }, []);
}
