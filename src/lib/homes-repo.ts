import type { Home, HomeBadge } from "@/domain/home";
import type { SupabaseClient } from "@supabase/supabase-js";

const HOME_SELECT = `
  id,
  slug,
  name,
  type,
  city,
  region,
  country,
  beds,
  baths,
  guests,
  nightly_rate_paise,
  rating,
  review_count,
  savings_paise,
  badges,
  description,
  home_photos ( src, alt, sort_order ),
  home_amenities ( amenity ),
  home_categories ( category_id )
`;

type HomePhotoRow = {
  src: string;
  alt: string;
  sort_order: number;
};

type HomeAmenityRow = {
  amenity: string;
};

type HomeCategoryRow = {
  category_id: string;
};

export type HomeRow = {
  id: string;
  slug: string;
  name: string;
  type: string;
  city: string;
  region: string;
  country: string;
  beds: number;
  baths: number;
  guests: number;
  nightly_rate_paise: number;
  rating: number;
  review_count: number;
  savings_paise: number;
  badges: string[];
  description: string;
  home_photos: HomePhotoRow[];
  home_amenities: HomeAmenityRow[];
  home_categories: HomeCategoryRow[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`home row ${field} must be a string`);
  }
  return value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  throw new Error(`home row ${field} must be a number`);
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`home row ${field} must be a string array`);
  }
  return value;
}

function parseBadge(value: string): HomeBadge {
  switch (value) {
    case "luxury":
    case "iconic":
    case "new":
      return value;
    default:
      throw new Error(`unknown home badge: ${value}`);
  }
}

function parsePhoto(value: unknown): HomePhotoRow {
  if (!isRecord(value)) {
    throw new Error("home photo must be an object");
  }
  return {
    src: asString(value.src, "photo.src"),
    alt: asString(value.alt, "photo.alt"),
    sort_order: asNumber(value.sort_order, "photo.sort_order"),
  };
}

function parseAmenity(value: unknown): HomeAmenityRow {
  if (!isRecord(value)) {
    throw new Error("home amenity must be an object");
  }
  return { amenity: asString(value.amenity, "amenity") };
}

function parseCategory(value: unknown): HomeCategoryRow {
  if (!isRecord(value)) {
    throw new Error("home category must be an object");
  }
  return { category_id: asString(value.category_id, "category_id") };
}

export function parseHome(row: unknown): Home {
  if (!isRecord(row)) {
    throw new Error("home row must be an object");
  }
  const photos = Array.isArray(row.home_photos) ? row.home_photos.map(parsePhoto) : [];
  photos.sort((left, right) => left.sort_order - right.sort_order);
  const amenities = Array.isArray(row.home_amenities) ? row.home_amenities.map(parseAmenity) : [];
  const categories = Array.isArray(row.home_categories) ? row.home_categories.map(parseCategory) : [];
  return {
    id: asString(row.id, "id"),
    slug: asString(row.slug, "slug"),
    name: asString(row.name, "name"),
    type: asString(row.type, "type"),
    location: {
      city: asString(row.city, "city"),
      region: asString(row.region, "region"),
      country: asString(row.country, "country"),
    },
    beds: asNumber(row.beds, "beds"),
    baths: asNumber(row.baths, "baths"),
    guests: asNumber(row.guests, "guests"),
    nightlyRatePaise: asNumber(row.nightly_rate_paise, "nightly_rate_paise"),
    rating: asNumber(row.rating, "rating"),
    reviewCount: asNumber(row.review_count, "review_count"),
    savingsPaise: asNumber(row.savings_paise, "savings_paise"),
    badges: asStringArray(row.badges, "badges").map(parseBadge),
    categoryIds: categories.map((item) => item.category_id),
    photos: photos.map((photo) => ({ src: photo.src, alt: photo.alt })),
    amenities: amenities.map((item) => item.amenity),
    description: asString(row.description, "description"),
  };
}

async function loadHomeRows(client: SupabaseClient, slug?: string): Promise<Home[]> {
  let query = client.from("homes").select(HOME_SELECT).order("sort_order");
  if (slug) {
    query = query.eq("slug", slug);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(parseHome);
}

export async function listHomes(client: SupabaseClient): Promise<Home[]> {
  return loadHomeRows(client);
}

export async function getHomeBySlug(client: SupabaseClient, slug: string): Promise<Home | undefined> {
  const homes = await loadHomeRows(client, slug);
  return homes[0];
}

export async function homesByCategory(client: SupabaseClient, categoryId: string): Promise<Home[]> {
  const homes = await listHomes(client);
  return homes.filter((home) => home.categoryIds.includes(categoryId));
}
