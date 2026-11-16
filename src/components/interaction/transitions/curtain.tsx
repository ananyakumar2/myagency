"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, type ComponentProps, type MouseEvent } from "react";

import { transitionTuning } from "@/lib/interaction/config";
import { ease } from "@/lib/motion/ease";
import { gsap } from "@/lib/motion/gsap";

import { scrambleTo } from "../burst/scramble";
import { playSound } from "../sound/sound";

/*
 * Decision 2 (route changes) and 32 (curtain colour), after Auge: an arched
 * panel in the destination's field colour (or the signature accent) rises
 * over the page on expoInOut while the destination's title scrambles in, the
 * route changes underneath, then the panel travels on up and away while the
 * new page glides up from a shifted position.
 */

type CurtainRequest = { href: string; title: string; color?: string };
let request: ((r: CurtainRequest) => void) | null = null;

export function curtainNavigate(r: CurtainRequest) {
  if (request) request(r);
  else window.location.assign(r.href);
}

export function Curtain() {
  const router = useRouter();
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLSpanElement>(null);
  const pending = useRef<{ resolve: () => void; path: string } | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (pending.current && pathname === pending.current.path) {
      const done = pending.current.resolve;
      pending.current = null;
      requestAnimationFrame(() => requestAnimationFrame(done));
    }
  }, [pathname]);

  useEffect(() => {
    request = (r) => {
      if (busy.current) return;
      const target = new URL(r.href, window.location.href);
      if (target.pathname === window.location.pathname) {
        router.push(r.href);
        return;
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(r.href);
        return;
      }
      busy.current = true;
      const p = transitionTuning.params;
      const el = panel.current!;
      const t = title.current!;
      const arch = `${(p.arch * 100).toFixed(1)}vh`;
      el.style.background = r.color ?? "var(--color-signature)";
      el.style.height = `calc(100% + ${p.arch * 200}vh)`;
      el.style.borderRadius = `50% 50% 0 0 / ${arch} ${arch} 0 0`;
      t.textContent = r.title;
      gsap.set(el, { yPercent: 100, y: 0, visibility: "visible" });
      gsap.set(t, { opacity: 0, yPercent: 30 });
      playSound("whoosh");
      document.documentElement.classList.remove("mirror-on");

      const tl = gsap.timeline();
      tl.to(el, { yPercent: 0, y: () => -window.innerHeight * p.arch, duration: p.cover, ease: ease("in-out") })
        .to(t, { opacity: 1, yPercent: 0, duration: 0.6, ease: ease("out") }, p.cover * 0.45)
        .add(() => {
          scrambleTo(t, r.title, { duration: p.titleScramble, onChurn: throttledTick() });
        }, p.cover * 0.45)
        .add(() => {
          new Promise<void>((resolve) => {
            pending.current = { resolve, path: target.pathname };
            router.push(r.href);
          }).then(() => {
            // Swap the arch to the trailing edge while the screen is covered.
            el.style.borderRadius = `0 0 50% 50% / 0 0 ${arch} ${arch}`;
            gsap.set(el, { y: 0 });
            const main = document.getElementById("main");
            const out = gsap.timeline({
              delay: p.hold,
              onComplete: () => {
                gsap.set(el, { visibility: "hidden" });
                busy.current = false;
              },
            });
            out
              .to(t, { yPercent: -40, opacity: 0, duration: 0.5, ease: ease("in-out") })
              .to(el, { yPercent: -100, y: () => -window.innerHeight * p.arch, duration: p.exit, ease: ease("in-out") }, 0.1);
            if (main) {
              // A relative offset, not a transform: a transformed #main would become the
              // containing block for the mirror's fixed canvas and stretch it to the page.
              main.style.position = "relative";
              out.fromTo(main, { top: () => window.innerHeight * 0.08 }, { top: 0, duration: p.exit + 0.4, ease: ease("out"), clearProps: "top,position" }, 0.15);
            }
          });
        });
    };
    return () => {
      request = null;
    };
  }, [router]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-(--z-curtain) overflow-hidden">
      <div
        ref={panel}
        className="invisible absolute inset-x-0 top-0 flex items-center justify-center"
        style={{ height: `calc(100% + ${transitionTuning.defaults.arch * 200}vh)` }}
      >
        <span ref={title} className="text-4xl font-medium tracking-tight text-ink uppercase" />
      </div>
    </div>
  );
}

function throttledTick() {
  let last = 0;
  return () => {
    const now = performance.now();
    if (now - last < 200) return;
    last = now;
    playSound("scramble");
  };
}

type CurtainLinkProps = ComponentProps<typeof Link> & {
  /** The word that scrambles on the curtain. */
  curtainTitle: string;
  /** Destination field colour; defaults to the signature accent. */
  curtainColor?: string;
};

/** A link that navigates behind the route curtain. Modified clicks behave normally. */
export function CurtainLink({ curtainTitle, curtainColor, onClick, href, ...props }: CurtainLinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    curtainNavigate({ href: String(href), title: curtainTitle, color: curtainColor });
  };
  return <Link href={href} onClick={handle} {...props} />;
}
