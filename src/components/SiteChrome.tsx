import { ChatWidget } from "@/components/ChatWidget";
import { ChromeProvider } from "@/components/ChromeProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MenuDrawer } from "@/components/MenuDrawer";
import { MobileChrome } from "@/components/mobile/MobileChrome";
import { SignInModal } from "@/components/SignInModal";
import type { ReactNode } from "react";

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <ChromeProvider>
      <a
        href="#search"
        className="fixed top-2 left-2 z-[100] -translate-y-20 rounded-lg bg-foreground px-4 py-2 font-medium text-white shadow-lg transition-transform focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Skip to search
      </a>
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="hidden md:block">
        <MenuDrawer />
      </div>
      <MobileChrome />
      <SignInModal />
      <div className="mobile-tab-pad flex-1">{children}</div>
      <div className="hidden md:block">
        <Footer />
      </div>
      <div className="hidden md:block">
        <ChatWidget />
      </div>
    </ChromeProvider>
  );
}
