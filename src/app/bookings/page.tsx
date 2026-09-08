import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { formatInr } from "@/lib/money";
import { listMyBookings } from "@/lib/bookings-repo";
import { createServerClient } from "@/lib/supabase/server";
import type { Booking } from "@/domain/booking";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trips" };

function statusLabel(status: Booking["status"]): string {
  switch (status) {
    case "pending_payment":
      return "Waiting for payment";
    case "confirmed":
      return "Confirmed";
    case "failed":
      return "Failed";
    case "expired":
      return "Expired";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export default async function TripsPage() {
  const session = await auth();
  if (!session.userId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">My trips</h1>
        <p className="mt-4 text-muted">Sign in to see stays you reserved.</p>
      </main>
    );
  }

  const bookings = await listMyBookings(createServerClient());

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">My trips</h1>
      {bookings.length === 0 ? (
        <p className="mt-6 text-muted">No stays yet. Reserve a home to see it here.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Link href={`/bookings/${booking.id}`} className="block rounded-3xl border border-line bg-white px-5 py-4">
                <p className="text-sm font-medium text-savings">{statusLabel(booking.status)}</p>
                <p className="mt-1 text-lg font-semibold">{booking.homeName}</p>
                <p className="mt-1 text-sm text-muted">
                  {booking.checkIn} – {booking.checkOut} · {booking.guests} guests · {formatInr(booking.totalPaise)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
