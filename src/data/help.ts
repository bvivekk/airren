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
  { slug: "searching", title: "Searching and booking", blurb: "Dates, guests, and how a stay is reserved." },
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
    body: "Nightly rate times nights. That is the guest total. Airren keeps a 10% host commission and pays the rest to the host after check-in.",
  },
  {
    slug: "refunds",
    collection: "payments",
    title: "Refunds after a captured payment",
    body: "A stay is confirmed only after Razorpay captures payment. Listings default to Flexible: a full refund if you cancel at least 24 hours before 3:00 pm IST on check-in day, otherwise none. A listing can override to Strict: half back if you cancel at least 14 days before that same instant, otherwise none. If the host cancels, you get a full refund.",
  },
  {
    slug: "upi-apps",
    collection: "payments",
    title: "Google Pay and PhonePe",
    body: "On a phone, Razorpay Checkout lists Google Pay and PhonePe first. Tapping one opens that app with the stay total filled in. On a computer, scan the UPI QR instead. Cards and other UPI still work.",
  },
  {
    slug: "search-tips",
    collection: "searching",
    title: "Find a home that fits",
    body: "Where matches city or region. Who is compared to the max guest count. Dates change the night count and the stay total.",
  },
  {
    slug: "reserve",
    collection: "searching",
    title: "What Reserve does here",
    body: "Reserve opens Razorpay Checkout in INR. On a phone you can pay in Google Pay or PhonePe. The stay is confirmed only after payment.captured matches the quoted total.",
  },
  {
    slug: "sign-in",
    collection: "account",
    title: "Sign in",
    body: "Sign in with a phone OTP or email. Favorites stay in this browser even after you sign out.",
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
