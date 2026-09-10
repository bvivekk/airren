"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListingPhotoUploader } from "@/components/ListingPhotoUploader";
import { PublishPanel, publishErrorMessage } from "@/components/PublishPanel";
import type { DraftContent, ListingOptions, ListingSnapshot } from "@/domain/listing";
import { listingStatusLabel } from "@/domain/listing";
import {
  attachListingPhoto,
  publishListing,
  saveListingDraft,
  unlistListing,
} from "@/lib/host-listings-repo";
import { useSupabaseClient } from "@/lib/supabase/browser";

function draftFromSnapshot(snapshot: ListingSnapshot): DraftContent {
  const { content } = snapshot.listing;
  return {
    name: content.name,
    type: content.type,
    location: {
      city: content.location.city,
      region: content.location.region,
      country: content.location.country,
    },
    beds: content.beds,
    baths: content.baths,
    guests: content.guests,
    nightlyRatePaise: content.nightlyRatePaise,
    description: content.description,
    amenities: content.amenities,
    photos: content.photos,
  };
}

function fieldClassName() {
  return "mt-2 w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none";
}

export function ListingEditor({
  initial,
  options,
}: {
  initial: ListingSnapshot;
  options: ListingOptions;
}) {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [draft, setDraft] = useState<DraftContent>(() => draftFromSnapshot(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const nightlyRupees = draft.nightlyRatePaise === null ? "" : String(draft.nightlyRatePaise / 100);

  async function persist(next: ListingSnapshot) {
    setSnapshot(next);
    setDraft(draftFromSnapshot(next));
    setError("");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form
        className="space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          void (async () => {
            setPending(true);
            setError("");
            try {
              const next = await saveListingDraft(supabase, snapshot.listing.id, {
                name: draft.name ?? "",
                type: draft.type ?? "",
                city: draft.location.city ?? "",
                region: draft.location.region ?? "",
                country: draft.location.country ?? "",
                beds: draft.beds ?? 0,
                baths: draft.baths ?? 0,
                guests: draft.guests ?? 0,
                nightlyRatePaise: draft.nightlyRatePaise ?? 0,
                description: draft.description ?? "",
                amenities: draft.amenities,
              });
              await persist(next);
            } catch (saveError) {
              setError(saveError instanceof Error ? saveError.message : "Could not save.");
            } finally {
              setPending(false);
            }
          })();
        }}
      >
        <section className="rounded-3xl border border-line bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {listingStatusLabel(snapshot.listing.status)}
          </p>
          <label className="mt-4 block text-sm font-medium">
            Name
            <input
              value={draft.name ?? ""}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className={fieldClassName()}
              placeholder="Cedar Ridge Cabin"
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Type
            <select
              value={draft.type ?? ""}
              onChange={(event) => setDraft({ ...draft, type: event.target.value || null })}
              className={fieldClassName()}
            >
              <option value="">Choose a type</option>
              {options.types.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">Location</h2>
          <label className="mt-4 block text-sm font-medium">
            City
            <input
              value={draft.location.city ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, location: { ...draft.location, city: event.target.value } })
              }
              className={fieldClassName()}
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Region
            <input
              value={draft.location.region ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, location: { ...draft.location, region: event.target.value } })
              }
              className={fieldClassName()}
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Country
            <input
              value={draft.location.country ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, location: { ...draft.location, country: event.target.value } })
              }
              className={fieldClassName()}
            />
          </label>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">Capacity and price</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium">
              Beds
              <input
                type="number"
                min={0}
                max={50}
                value={draft.beds ?? 0}
                onChange={(event) => setDraft({ ...draft, beds: Number(event.target.value) })}
                className={fieldClassName()}
              />
            </label>
            <label className="block text-sm font-medium">
              Baths
              <input
                type="number"
                min={0}
                max={50}
                value={draft.baths ?? 0}
                onChange={(event) => setDraft({ ...draft, baths: Number(event.target.value) })}
                className={fieldClassName()}
              />
            </label>
            <label className="block text-sm font-medium">
              Guests
              <input
                type="number"
                min={0}
                max={50}
                value={draft.guests ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    guests: event.target.value === "" ? null : Number(event.target.value),
                  })
                }
                className={fieldClassName()}
              />
            </label>
          </div>
          <label className="mt-4 block text-sm font-medium">
            Nightly rate (₹)
            <input
              type="number"
              min={0}
              value={nightlyRupees}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  nightlyRatePaise: event.target.value === "" ? null : Number(event.target.value) * 100,
                })
              }
              className={fieldClassName()}
            />
          </label>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5">
          <label className="block text-sm font-medium">
            Description
            <textarea
              value={draft.description ?? ""}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              rows={5}
              className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none"
            />
          </label>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">Amenities</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {options.amenities.map((option) => {
              const checked = draft.amenities.includes(option.value);
              return (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setDraft({
                        ...draft,
                        amenities: checked
                          ? draft.amenities.filter((item) => item !== option.value)
                          : [...draft.amenities, option.value],
                      });
                    }}
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5">
          <ListingPhotoUploader
            photos={snapshot.listing.content.photos}
            pending={pending}
            onUpload={(file) => {
              void (async () => {
                setPending(true);
                setError("");
                try {
                  const next = await attachListingPhoto(supabase, snapshot.listing.id, file, draft.name ?? "Photo");
                  await persist(next);
                } catch (uploadError) {
                  setError(uploadError instanceof Error ? uploadError.message : "Could not upload photo.");
                } finally {
                  setPending(false);
                }
              })();
            }}
            onChange={(photos) => {
              void (async () => {
                setPending(true);
                setError("");
                try {
                  const next = await saveListingDraft(supabase, snapshot.listing.id, { photos });
                  await persist(next);
                } catch (photoError) {
                  setError(photoError instanceof Error ? photoError.message : "Could not update photos.");
                } finally {
                  setPending(false);
                }
              })();
            }}
          />
        </section>

        {error ? <p className="text-sm text-muted">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          Save
        </button>
      </form>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <PublishPanel
          snapshot={snapshot}
          pending={pending}
          error=""
          onPublish={() => {
            void (async () => {
              setPending(true);
              setError("");
              try {
                const outcome = await publishListing(supabase, snapshot.listing.id);
                if (!outcome.published) {
                  setError(publishErrorMessage(outcome));
                  return;
                }
                await persist(outcome.snapshot);
                router.push(`/homes/${outcome.snapshot.listing.slug}`);
              } catch (publishError) {
                setError(publishError instanceof Error ? publishError.message : "Could not publish.");
              } finally {
                setPending(false);
              }
            })();
          }}
          onUnlist={() => {
            void (async () => {
              setPending(true);
              setError("");
              try {
                await persist(await unlistListing(supabase, snapshot.listing.id));
              } catch (unlistError) {
                setError(unlistError instanceof Error ? unlistError.message : "Could not unlist.");
              } finally {
                setPending(false);
              }
            })();
          }}
        />
      </div>
    </div>
  );
}
