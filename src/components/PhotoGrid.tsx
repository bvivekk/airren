"use client";

import Image from "next/image";
import { useState } from "react";
import type { HomePhoto } from "@/domain/home";

export function PhotoGrid({ photos, name }: { photos: HomePhoto[]; name: string }) {
  const [open, setOpen] = useState(false);
  const main = photos[0];
  const rest = photos.slice(1, 5);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:grid-rows-2 md:h-[460px]">
        <button
          type="button"
          className="relative min-h-[240px] overflow-hidden rounded-3xl md:col-span-2 md:row-span-2 md:min-h-0"
          onClick={() => setOpen(true)}
        >
          {main ? (
            <Image src={main.src} alt={main.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 66vw" priority />
          ) : null}
        </button>
        {rest.map((photo, index) => (
          <button
            key={photo.src}
            type="button"
            className="relative hidden overflow-hidden rounded-3xl md:block"
            onClick={() => setOpen(true)}
          >
            <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes="33vw" />
            {index === 2 ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-sm font-medium text-white">
                Watch the tour
              </span>
            ) : null}
            {index === 3 ? (
              <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1.5 text-xs font-medium">
                Show all photos
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-6">
          <div className="mx-auto max-w-5xl">
            <button
              type="button"
              className="rounded-full bg-pill px-4 py-2 text-sm"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
            <h2 className="mt-4 text-2xl font-semibold">{name}</h2>
            <div className="mt-6 grid gap-3">
              {photos.map((photo) => (
                <div key={photo.src} className="relative aspect-[16/10] overflow-hidden rounded-3xl">
                  <Image src={photo.src} alt={photo.alt} fill className="object-cover" sizes="100vw" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
