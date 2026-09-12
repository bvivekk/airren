import { auth } from "@clerk/nextjs/server";
import { PayoutAccountForm } from "@/components/PayoutAccountForm";
import type { HostEarning } from "@/domain/payout";
import { getMyPayoutAccount, listHostEarnings, payoutStatusLabel } from "@/lib/host-earnings-repo";
import { formatInr } from "@/lib/money";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Earnings" };

function earningDetail(earning: HostEarning): string {
  const when = earning.paidAt ? `Paid ${earning.paidAt.slice(0, 10)}` : `Eligible ${earning.eligibleAt.slice(0, 10)}`;
  return `${earning.checkIn} – ${earning.checkOut} · ${earning.nights} nights · ${when}`;
}

export default async function HostEarningsPage() {
  const session = await auth();
  if (!session.userId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Earnings</h1>
        <p className="mt-4 text-muted">Sign in to see payouts for stays you host.</p>
      </main>
    );
  }

  const client = createServerClient();
  const [earnings, account] = await Promise.all([listHostEarnings(client), getMyPayoutAccount(client)]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Earnings</h1>
      <p className="mt-3 text-sm text-muted">Airren keeps 10%. The rest is sent about a day after check-in.</p>
      <div className="mt-8">
        <PayoutAccountForm initial={account} />
      </div>
      {earnings.length === 0 ? (
        <p className="mt-8 text-muted">No confirmed stays yet.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {earnings.map((earning) => (
            <li key={earning.bookingId} className="rounded-3xl border border-line bg-white px-5 py-4">
              <p className="text-sm font-medium text-savings">{payoutStatusLabel(earning.payoutStatus)}</p>
              <p className="mt-1 text-lg font-semibold">{earning.homeName}</p>
              <p className="mt-1 text-sm text-muted">{earningDetail(earning)}</p>
              <p className="mt-3 text-sm">
                {formatInr(earning.hostNetPaise)} after {formatInr(earning.commissionPaise)} commission
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
