import Image from "next/image";
import { ListApplyForm } from "@/components/ListApplyForm";
import { getHomeBySlug, listHomes } from "@/lib/homes-repo";
import { createServerClient } from "@/lib/supabase/server";

export const metadata = { title: "List on Airren" };
export const dynamic = "force-dynamic";

const STATS = [
  { value: "₹100 Cr+", label: "demo bookings" },
  { value: "18,000+", label: "nights held" },
  { value: "90%+", label: "guest satisfaction" },
  { value: "16", label: "homes in this demo" },
];

export default async function ListPage() {
  const client = createServerClient();
  const home = (await getHomeBySlug(client, "high-desert-mesa")) ?? (await listHomes(client))[0];
  const hero = home?.photos[0];

  return (
    <main className="relative overflow-hidden">
      {hero ? (
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <Image src={hero.src} alt="" fill className="object-cover blur-3xl" />
        </div>
      ) : null}
      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Stand out and earn more.</h1>
        <p className="mx-auto mt-5 max-w-xl text-muted">
          List your vacation home on Airren to reach high-intent travelers, attract better guests, and stand out in a curated marketplace.
        </p>
        <div className="mt-8">
          <ListApplyForm />
        </div>
        {home ? (
          <div className="mx-auto mt-14 overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-5 py-3 text-sm font-semibold">
              Airren
              <span className="text-muted">Menu</span>
            </div>
            <div className="grid gap-2 p-3 md:grid-cols-3">
              <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-2xl">
                <Image src={home.photos[0]?.src ?? ""} alt={home.name} fill className="object-cover" />
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-medium">
                  See why operators list on Airren (2 min)
                </span>
              </div>
              <div className="grid gap-2">
                {home.photos.slice(1, 3).map((photo) => (
                  <div key={photo.src} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                    <Image src={photo.src} alt={photo.alt} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <dl className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="text-2xl font-semibold">{stat.value}</dt>
              <dd className="mt-1 text-sm text-muted">{stat.label}</dd>
            </div>
          ))}
        </dl>
        <section className="mt-20 text-left">
          <h2 className="text-center text-3xl font-semibold">Get started in three steps</h2>
          <ol className="mx-auto mt-8 max-w-xl space-y-4 text-sm">
            <li>1. Apply with an OTA or site link. We import the listing.</li>
            <li>2. We review the home. If it fits, you confirm rates.</li>
            <li>3. Launch. Guests book. You keep operating the house.</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
