import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { AppUIProvider } from "@/components/Providers";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAAF Hisāb — Event Transparency",
  description:
    "Event-based chanda & kharcha transparency — UPI, cash, receipts, per-event dashboard. Made by ROUSHAN KUMAR.",
  authors: [{ name: "ROUSHAN KUMAR" }],
  creator: "ROUSHAN KUMAR",
  publisher: "ROUSHAN KUMAR",
  applicationName: "SAAF Hisāb",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SAAF Hisab",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a3d33",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <body className={`${outfit.variable} ${fraunces.variable} antialiased`}>
        <AppUIProvider>
          <div className="shell">
            {children}
            <SiteFooter />
          </div>
        </AppUIProvider>
      </body>
    </html>
  );
}
