import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isHostRoute = createRouteMatcher(["/host(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isHostRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Keep crawl files off Clerk so /robots.txt and /sitemap.xml cannot 500 with auth.
    "/((?!_next|robots\\.txt|sitemap\\.xml|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
