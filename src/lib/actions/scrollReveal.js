// $lib/actions/scrollReveal.js
import { gsap } from "gsap";

/**
 * Svelte action: fade + translateY reveal on scroll.
 * Usage: <section use:scrollReveal>
 * Replay on every scroll: <section use:scrollReveal={{ once: false }}>
 */
export function scrollReveal(node, options = {}) {
  const {
    y = 30,
    duration = 1,
    delay = 0,
    ease = "power2.out",
    threshold = 0.2,
    once = true,
    exitDuration = 0.4 // durée de la "sortie" quand once=false
  } = options;

  gsap.set(node, { opacity: 0, y });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          gsap.to(node, {
            opacity: 1,
            y: 0,
            duration,
            delay,
            ease,
            overwrite: true
          });
          if (once) observer.unobserve(node);
        } else if (!once) {
          // Sortie douce plutôt qu'un reset instantané
          gsap.to(node, {
            opacity: 0,
            y,
            duration: exitDuration,
            ease: "power1.in",
            overwrite: true
          });
        }
      });
    },
    { threshold }
  );

  observer.observe(node);

  return {
    update(newOptions = {}) {
      Object.assign(options, newOptions);
    },
    destroy() {
      observer.disconnect();
    }
  };
}