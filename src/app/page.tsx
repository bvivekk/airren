import { Suspense } from "react";
import { SearchPill } from "@/components/SearchPill";

export default function HomePage() {
  return (
    <section
      data-theme="dark"
      className="relative flex min-h-[80vh] flex-col justify-center overflow-hidden bg-neutral-950"
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="page-container relative flex flex-col items-center gap-4 text-center text-white">
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Airren</h1>
        <p className="max-w-xl text-sm md:text-base">Guest-first stays. Search when you are ready.</p>
        <div className="mt-2 w-full max-w-[720px] lg:hidden">
          <Suspense>
            <SearchPill />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
