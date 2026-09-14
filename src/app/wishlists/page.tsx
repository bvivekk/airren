import { MobileWishlistScreen } from "@/features/mobile-explore/MobileWishlistScreen";
import { parseStayQuery } from "@/lib/query";
import { listHomes } from "@/lib/homes-repo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wishlists" };

export default async function WishlistsPage() {
  const query = parseStayQuery({});
  const homes = await listHomes(createServerClient());
  return <MobileWishlistScreen homes={homes} query={query} />;
}
