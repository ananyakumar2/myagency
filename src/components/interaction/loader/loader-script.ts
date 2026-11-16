/**
 * Runs in <head> before first paint (no flash, no hydration mismatch): picks
 * the loader version. Decision 17: the full piece once per 24 h for visitors
 * arriving from outside the site, otherwise the 1 s short version. Reduced
 * motion always gets the short one. ?loader=full|short|none overrides, for
 * the lab and recordings.
 */
export const LOADER_SCRIPT = `(function(){var d=document.documentElement;try{var q=new URLSearchParams(location.search).get("loader");if(q==="full"||q==="short"||q==="none"){d.dataset.loader=q;return}var r=matchMedia("(prefers-reduced-motion: reduce)").matches;var last=+(localStorage.getItem("loader:full")||0);var ext=true;try{ext=!document.referrer||new URL(document.referrer).origin!==location.origin}catch(e){}d.dataset.loader=!r&&ext&&Date.now()-last>864e5?"full":"short"}catch(e){d.dataset.loader="short"}})();`;
