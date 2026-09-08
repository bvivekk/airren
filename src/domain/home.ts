export const HOME_BADGES = ["luxury", "iconic", "new"] as const;

export type HomeBadge = (typeof HOME_BADGES)[number];

export type HomeLocation = {
  city: string;
  region: string;
  country: string;
};

export type HomePhoto = {
  src: string;
  alt: string;
};

export type Home = {
  slug: string;
  name: string;
  type: string;
  location: HomeLocation;
  beds: number;
  baths: number;
  guests: number;
  nightlyRateCents: number;
  rating: number;
  reviewCount: number;
  savingsCents: number;
  badges: HomeBadge[];
  categoryIds: string[];
  photos: HomePhoto[];
  amenities: string[];
  description: string;
};

export type StayQuery = {
  where: string;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export function badgeLabel(badge: HomeBadge): string {
  switch (badge) {
    case "luxury":
      return "Luxury";
    case "iconic":
      return "Iconic";
    case "new":
      return "New";
    default: {
      const _never: never = badge;
      return _never;
    }
  }
}
