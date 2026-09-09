import { LogoMark } from "@/components/Logo";

export const metadata = { title: "Download the app" };

function StoreRow({ label }: { label: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <button type="button" className="rounded-full bg-pill px-4 py-2 text-sm">
          Scan QR
        </button>
        <button type="button" className="rounded-full bg-pill px-4 py-2 text-sm">
          Open store
        </button>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-foreground text-white">
        <LogoMark className="h-10 w-10" />
      </div>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight">Download the app</h1>
      <p className="mt-3 text-muted">
        Download the Airren app to manage trips, get support, and unlock a smoother travel experience.
      </p>
      <div className="mt-12">
        <p className="text-sm font-semibold">Mobile app</p>
        <StoreRow label="iOS" />
        <StoreRow label="Android" />
      </div>
    </main>
  );
}
