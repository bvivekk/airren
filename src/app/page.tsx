import Image from "next/image";
import { Suspense } from "react";
import { HOMES, homesByCategory } from "@/data/homes";
import { PropertyCarousel } from "@/components/PropertyCarousel";
import { SearchPill } from "@/components/SearchPill";
import { parseStayQuery } from "@/lib/query";

const HERO =
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2400&q=80";

export default function HomePage() {
  const query = parseStayQuery({});
  const loved = HOMES.slice(0, 8);
  const fall = homesByCategory("fall");
  const lake = homesByCategory("lake");
  const desert = homesByCategory("desert");

  return (
    <>
      <section
        data-theme="dark"
        className="relative flex h-[calc(100svh-260px)] min-h-[32rem] flex-col justify-center overflow-hidden bg-black"
      >
        <Image
          src={HERO}
          alt=""
          fill
          priority
          className="object-cover object-[50%_70%] lg:object-[50%_62%]"
          sizes="(min-width: 46.5rem) 100vw, 220vw"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div
          data-slot="container"
          className="page-container relative mt-9 flex flex-col items-center gap-4 text-center text-white md:mt-10"
        >
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-[56px] lg:leading-[1.05]">
            Find your happy place
          </h1>
          <p className="max-w-xl text-sm md:text-base">
            Guest-first travel. Only the best homes. 24/7 concierge. No fees or markups.
          </p>
          <div className="mt-2 w-full max-w-[720px] lg:hidden">
            <Suspense>
              <SearchPill />
            </Suspense>
          </div>
        </div>
      </section>
      <main id="landing" className="relative">
        <div className="page-container pb-16">
          <PropertyCarousel title="Homes our guests love" homes={loved} query={query} flush />
          <PropertyCarousel title="Fall colors" homes={fall} query={query} />
          <PropertyCarousel title="Lakefront life" homes={lake} query={query} />
          <PropertyCarousel title="Desert hideaways" homes={desert} query={query} />
        </div>
      </main>
    </>
  );
}
