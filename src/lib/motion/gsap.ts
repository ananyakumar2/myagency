"use client";

import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

import { registerTokenEases } from "./ease";

let registered = false;

if (typeof window !== "undefined" && !registered) {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);
  registerTokenEases();
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
