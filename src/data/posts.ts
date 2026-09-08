export const BLOG_CATEGORIES = [
  "All",
  "Announcements",
  "Destinations",
  "Property Management",
  "Travel Guides",
  "Travel Inspiration",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: Exclude<BlogCategory, "All">;
  date: string;
  image: string;
};

export const POSTS: Post[] = [
  {
    slug: "cancellation-policies",
    title: "How to set your cancellation policies",
    excerpt:
      "Set a house rule once and Airren applies it at checkout, per listing or across a whole portfolio.",
    body: "Guests see the policy before they reserve. Operators can change it without a ticket. Flexible, moderate, and strict templates cover most homes. Custom windows are available when a market needs them.",
    category: "Property Management",
    date: "2026-08-17",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "ai-moment-in-travel",
    title: "The AI moment in travel",
    excerpt:
      "Travelers now ask an assistant where to stay. Listings that answer clearly get the booking.",
    body: "Search is no longer only ten blue links. Write titles that name the place. Put the view, the beds, and the house rules in plain language. Airren pages are built so assistants can cite them.",
    category: "Announcements",
    date: "2026-08-12",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "wine-country-summer",
    title: "Your wine country summer list",
    excerpt: "Healdsburg mornings, Dry Creek bikes, and a pool that stays cold after the tasting rooms.",
    body: "Start at Dry Creek Farm. Ride into town before the heat. Book a late table. Come back when the oaks throw shade on the water. That is the whole plan.",
    category: "Travel Inspiration",
    date: "2026-06-19",
    image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "stowe-hiking",
    title: "Three hikes near Sterling Canopy",
    excerpt: "Ridges you can walk from the house, and one that earns the hot tub.",
    body: "Sterling Pond is the short one. Maple Ridge is the midday loop. The long ridgeline is for a clear day and a quiet dinner after. Pack water. The house has the rest.",
    category: "Travel Guides",
    date: "2026-06-19",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "direct-bookings-note",
    title: "Why operators keep a direct site",
    excerpt: "A marketplace sends guests. A site you own keeps them.",
    body: "AirrenOS is the site. Marketing is automated. The guest still belongs to you when they come back next year. That is the point of a direct channel next to the marketplace.",
    category: "Property Management",
    date: "2026-08-05",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "desert-weekend",
    title: "A Joshua Tree weekend, unhurried",
    excerpt: "Arrive Friday. Swim. Watch the rocks change color. Leave Monday with sand in the car.",
    body: "High Desert Mesa is the base. Hike early. Pool at noon. Dinner in town if you want people, or stay in if you do not. Sunday is for doing nothing on the terrace.",
    category: "Destinations",
    date: "2026-05-02",
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=80",
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((post) => post.slug === slug);
}
