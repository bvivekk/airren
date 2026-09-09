export type Category = {
  slug: string;
  name: string;
};

export const CATEGORIES: Category[] = [
  { slug: "beach", name: "Beach" },
  { slug: "mountain", name: "Mountain" },
  { slug: "ski", name: "Ski Season" },
  { slug: "lake", name: "Lake" },
  { slug: "hawaii", name: "Hawaii" },
  { slug: "pet-friendly", name: "Pet-Friendly" },
  { slug: "groups", name: "Groups" },
  { slug: "national-parks", name: "National Parks" },
  { slug: "families", name: "Families" },
  { slug: "forest", name: "Forest" },
  { slug: "city", name: "City" },
  { slug: "desert", name: "Desert" },
  { slug: "pools", name: "Pools" },
  { slug: "summer", name: "Summer spots" },
  { slug: "fall", name: "Fall colors" },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
