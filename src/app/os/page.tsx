import Image from "next/image";
import Link from "next/link";
import { getHomeBySlug, listHomes } from "@/lib/homes-repo";
import { createServerClient } from "@/lib/supabase/server";

export const metadata = { title: "AirrenOS" };
export const dynamic = "force-dynamic";

export default async function OsPage() {
  const client = createServerClient();
  const home = (await getHomeBySlug(client, "pacific-glass")) ?? (await listHomes(client))[0];
  const hero = home?.photos[0];

  return (
    <main className="relative overflow-hidden">
      {hero ? (
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <Image src={hero.src} alt="" fill className="object-cover blur-3xl" />
        </div>
      ) : null}
      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Supercharge your direct bookings.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-muted">
          AirrenOS is the all-in-one platform for direct bookings — a conversion-optimized website, automated guest marketing, and distribution next to the Airren marketplace.
        </p>
        <Link
          href="/list"
          className="mt-8 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-white"
        >
          Try AirrenOS for free
        </Link>
        {home ? (
          <div className="mx-auto mt-14 overflow-hidden rounded-[28px] bg-white p-4 shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
            <p className="mb-3 text-left text-sm font-semibold">Desert Retreats</p>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-2xl">
                <Image src={home.photos[0]?.src ?? ""} alt={home.name} fill className="object-cover" />
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-medium">
                  See AirrenOS in action | 4 min
                </span>
              </div>
              <div className="grid gap-2">
                {home.photos.slice(1, 4).map((photo) => (
                  <div key={photo.src} className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                    <Image src={photo.src} alt={photo.alt} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
