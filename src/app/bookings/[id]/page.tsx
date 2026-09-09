import { notFound } from "next/navigation";
import { BookingStatus } from "@/components/BookingStatus";
import { getBookingById } from "@/lib/bookings-repo";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBookingById(createServerClient(), id);
  if (!booking) {
    notFound();
  }
  return <BookingStatus initial={booking} />;
}
