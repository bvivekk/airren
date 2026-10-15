import { notFound } from "next/navigation";
import { BookingStatus } from "@/components/BookingStatus";
import { paymentsConfigured } from "@/lib/payments/config";
import { createServerClient } from "@/lib/supabase/server";
import { getTripById } from "@/lib/trips-repo";

export const dynamic = "force-dynamic";

function paymentResult(value: string | string[] | undefined): "success" | "failed" | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "success" || raw === "failed") {
    return raw;
  }
  return null;
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const trip = await getTripById(createServerClient(), id);
  if (!trip) {
    notFound();
  }
  return (
    <BookingStatus
      initial={trip}
      paymentsEnabled={paymentsConfigured()}
      paymentResult={paymentResult(query.payment)}
    />
  );
}
