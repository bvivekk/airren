import type { HomeLocation } from "@/domain/home";

export type ListingId = string;
export type PhotoId = string;

export const LISTING_STATUSES = ["draft", "published", "unlisted"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export type ListingOptionKind = "type" | "amenity";
export type ListingOption = { kind: ListingOptionKind; value: string; label: string };
export type ListingOptions = {
  types: ListingOption[];
  amenities: ListingOption[];
};

export type ListingPhoto = {
  id: PhotoId;
  src: string;
  alt: string;
};

export type ListingContent = {
  name: string;
  type: string;
  location: HomeLocation;
  beds: number;
  baths: number;
  guests: number;
  nightlyRatePaise: number;
  description: string;
  amenities: string[];
  photos: ListingPhoto[];
};

export type DraftContent = {
  name: string | null;
  type: string | null;
  location: { city: string | null; region: string | null; country: string | null };
  beds: number | null;
  baths: number | null;
  guests: number | null;
  nightlyRatePaise: number | null;
  description: string | null;
  amenities: string[];
  photos: ListingPhoto[];
};

export type ListingField =
  | "name"
  | "type"
  | "city"
  | "region"
  | "country"
  | "beds"
  | "baths"
  | "guests"
  | "nightlyRatePaise"
  | "description"
  | "photos";

export type ListingIssue = { field: ListingField; message: string };

export type PublishReadiness =
  | { ready: true; content: ListingContent }
  | { ready: false; issues: ListingIssue[] };

export type HostListing =
  | {
      status: "draft";
      id: ListingId;
      slug: string;
      content: DraftContent;
      updatedAt: string;
    }
  | {
      status: "published" | "unlisted";
      id: ListingId;
      slug: string;
      content: ListingContent;
      publishedAt: string;
      updatedAt: string;
    };

export type ListingSnapshot = {
  listing: HostListing;
  readiness: PublishReadiness;
};

export type DraftPatch = {
  name?: string;
  type?: string;
  city?: string;
  region?: string;
  country?: string;
  beds?: number;
  baths?: number;
  guests?: number;
  nightlyRatePaise?: number;
  description?: string;
  amenities?: string[];
  photos?: Array<{ id: PhotoId; alt: string }>;
};

export type PublishOutcome =
  | { published: true; snapshot: ListingSnapshot }
  | { published: false; issues: ListingIssue[] };

export function listingStatusLabel(status: ListingStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    case "unlisted":
      return "Unlisted";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}
