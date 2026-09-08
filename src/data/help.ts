export type HelpCollection = {
  slug: string;
  title: string;
  blurb: string;
};

export type HelpArticle = {
  slug: string;
  collection: string;
  title: string;
  body: string;
};

export const HELP_COLLECTIONS: HelpCollection[] = [
  { slug: "home-manual", title: "Home Manual", blurb: "How the house works once you have the keys." },
  { slug: "payments", title: "Payments, pricing, and refunds", blurb: "What you pay, when, and how refunds move." },
  { slug: "searching", title: "Searching and booking", blurb: "Dates, guests, and how a hold is placed." },
  { slug: "account", title: "Account", blurb: "Sign in, saved homes, and trip details." },
  { slug: "your-trip", title: "Your trip", blurb: "Arrival, concierge, and what happens at checkout." },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "wifi",
    collection: "home-manual",
    title: "Wi-Fi and the house tablet",
    body: "The network name and password sit on the tablet home screen. If the tablet is asleep, tap it. Concierge can text a backup code.",
  },
  {
    slug: "checkout",
    collection: "home-manual",
    title: "Checkout with no chores",
    body: "Leave dishes in the sink. Leave towels. Lock the door. That is the list. Cleaning is on us.",
  },
  {
    slug: "how-pricing-works",
    collection: "payments",
    title: "How a stay is priced",
    body: "Nightly rate times nights, plus a cleaning fee and a 5% service fee. Airren does not add a guest markup on top of the listed rate.",
  },
  {
    slug: "refunds",
    collection: "payments",
    title: "Refunds on a demo hold",
    body: "This site does not charge a card. A demo hold can be dropped anytime. Live refunds will follow the listing policy.",
  },
  {
    slug: "search-tips",
    collection: "searching",
    title: "Find a home that fits",
    body: "Where matches city or region. Who is compared to the max guest count. Dates change the night count and the stay total.",
  },
  {
    slug: "demo-reserve",
    collection: "searching",
    title: "What Reserve does here",
    body: "Reserve writes a confirmation page. No payment is taken. You can screenshot it or start over with new dates.",
  },
  {
    slug: "sign-in",
    collection: "account",
    title: "Demo sign in",
    body: "Sign in stores a name on this browser. There is no password vendor. Clearing site data signs you out.",
  },
  {
    slug: "saved-homes",
    collection: "account",
    title: "Hearts and saved homes",
    body: "The heart saves a slug in local storage. Reload keeps it. Another browser will not see it.",
  },
  {
    slug: "concierge",
    collection: "your-trip",
    title: "24/7 concierge chat",
    body: "The bubble in the corner answers a small set of questions. For a real stay, a person would take it from there.",
  },
  {
    slug: "arrival",
    collection: "your-trip",
    title: "Arrival window",
    body: "Doors unlock at 4pm local unless the listing says otherwise. Early bags can sit with concierge when the house is still turning.",
  },
];

export function articlesIn(collection: string): HelpArticle[] {
  return HELP_ARTICLES.filter((article) => article.collection === collection);
}

export function getArticle(collection: string, slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.collection === collection && article.slug === slug);
}

export function getCollection(slug: string): HelpCollection | undefined {
  return HELP_COLLECTIONS.find((collection) => collection.slug === slug);
}
