import type { Metadata } from "next";
import { Suspense } from "react";

import { CubeLab, type CubeLabOptions } from "@/components/lab/cubes/cube-lab";

export const metadata: Metadata = { title: "Cubes — Lab", robots: { index: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Lab({ searchParams }: { searchParams: PageProps<"/lab/cubes">["searchParams"] }) {
  const q = await searchParams;
  const options: CubeLabOptions = {
    mode: one(q.mode) === "universes" ? "universes" : "words",
    snap: one(q.snap) === "steps" ? "steps" : "off",
    words: one(q.words) ?? "worlds",
  };
  return <CubeLab key={`${options.mode}-${options.words}`} {...options} />;
}

export default function CubesLabPage({ searchParams }: PageProps<"/lab/cubes">) {
  return (
    <Suspense>
      <Lab searchParams={searchParams} />
    </Suspense>
  );
}
