import Link from "next/link";
import { LogoWordmark } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="@container relative w-full bg-surface-secondary py-12 text-foreground">
      <div className="page-container flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <LogoWordmark />
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-muted">
          <Link href="/about">About</Link>
          <Link href="/list">List on Airren</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/os">AirrenOS</Link>
          <Link href="/help">Help</Link>
          <Link href="/download">Download</Link>
          <Link href="/locations">Locations</Link>
          <Link href="/legal">Legal</Link>
        </div>
      </div>
    </footer>
  );
}
