import { notFound } from "next/navigation";
import { BookingStatus } from "@/components/BookingStatus";
import { createServerClient } from "@/lib/supabase/server";
import { getTripById } from "@/lib/trips-repo";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTripById(createServerClient(), id);
  if (!trip) {
    notFound();
  }
  return <BookingStatus initial={trip} />;
}
