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
  id: string;
  slug: string;
  name: string;
  type: string;
  location: HomeLocation;
  beds: number;
  baths: number;
  guests: number;
  nightlyRatePaise: number;
  rating: number;
  reviewCount: number;
  savingsPaise: number;
  badges: HomeBadge[];
  categoryIds: string[];
  photos: HomePhoto[];
  amenities: string[];
  description: string;
};

export const DATE_FLEX_DAYS = [0, 1, 2, 3, 7] as const;

export type DateFlexDays = (typeof DATE_FLEX_DAYS)[number];

export type FlexibleStayLength = "weekend" | "week";

export type StayWhen =
  | { kind: "dates"; flexibility: DateFlexDays }
  | { kind: "flexible"; stay: FlexibleStayLength; months: string[] };

export type StayQuery = {
  where: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  pets: number;
  when: StayWhen;
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
