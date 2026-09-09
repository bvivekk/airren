import Image from "next/image";
import { PropertyCarousel } from "@/components/PropertyCarousel";
import { parseStayQuery } from "@/lib/query";
import { listHomes } from "@/lib/homes-repo";
import { createServerClient } from "@/lib/supabase/server";

const HERO = "/images/homepage-hero.jpg";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const query = parseStayQuery({});
  const homes = await listHomes(createServerClient());
  const loved = homes.slice(0, 8);
  const fall = homesByCategoryFrom(homes, "fall");
  const lake = homesByCategoryFrom(homes, "lake");
  const desert = homesByCategoryFrom(homes, "desert");

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
          className="object-cover object-[50%_42%] lg:object-[50%_38%]"
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
            Guest-first travel. Only the best homes. 24/7 concierge. Transparent stay quotes.
          </p>
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

function homesByCategoryFrom(homes: Awaited<ReturnType<typeof listHomes>>, categoryId: string) {
  return homes.filter((home) => home.categoryIds.includes(categoryId));
}
