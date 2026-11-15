import Link from "next/link";
import { ViewTransition, type ComponentProps, type ReactNode } from "react";

/**
 * Page transitions use React's <ViewTransition> (native View Transitions API),
 * so they need no JS animation runtime and degrade to an instant swap in
 * browsers without support. Animations live in globals.css (.page-forward /
 * .page-back) and are zeroed out under prefers-reduced-motion.
 *
 * Wrap each page's content (not the layout: layouts persist, so they never
 * enter/exit) and navigate with <TransitionLink>.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const map = { "page-forward": "page-forward", "page-back": "page-back", default: "none" };
  return (
    <ViewTransition enter={map} exit={map} default="none">
      {children}
    </ViewTransition>
  );
}

type TransitionLinkProps = ComponentProps<typeof Link> & {
  direction?: "forward" | "back";
};

export function TransitionLink({ direction = "forward", ...props }: TransitionLinkProps) {
  return <Link transitionTypes={[`page-${direction}`]} {...props} />;
}
