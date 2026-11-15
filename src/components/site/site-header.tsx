import { Magnetic } from "@/components/motion/magnetic";
import { TransitionLink } from "@/components/motion/page-transition";

export function SiteHeader() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-(--z-header) bg-bg/80 backdrop-blur-md"
      style={{ viewTransitionName: "site-header" }}
    >
      <nav className="mx-auto flex max-w-page items-center justify-between px-gutter py-4 text-sm text-fg">
        <TransitionLink href="/" direction="back" className="font-medium tracking-tight">
          Studio®
        </TransitionLink>
        <ul className="flex items-center gap-2">
          <li>
            <Magnetic>
              <TransitionLink href="/work" className="block px-3 py-2">
                Work
              </TransitionLink>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <a href="#contact" className="block px-3 py-2">
                Contact
              </a>
            </Magnetic>
          </li>
        </ul>
      </nav>
    </header>
  );
}
