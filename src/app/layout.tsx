import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { CSPostHogProvider, PostHogIdentitySync, PostHogPageView } from "@/components/providers/posthog-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import BetaChatWidget from "@/components/features/chat/beta-chat-widget";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.ivoire-business-club.com'),
  title: {
    default: "Ivoire Business Club — Bâtir son futur en Afrique",
    template: "%s | Ivoire Business Club",
  },
  description: "Accède aux meilleures opportunités business en Côte d'Ivoire et en Europe. Networking, investissements, partenariats.",
  keywords: ["business", "Côte d'Ivoire", "Afrique", "investissement", "networking", "entrepreneuriat", "IBC"],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Ivoire Business Club — Bâtir son futur en Afrique",
    description: "Accède aux meilleures opportunités business en Côte d'Ivoire et en Europe.",
    siteName: "Ivoire Business Club",
    type: "website",
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ivoire Business Club",
    description: "Bâtir son futur en Afrique",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/favicon-ibc.webp?v=2",
    apple: "/logo-ibc.webp?v=2",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <CSPostHogProvider>
              <PostHogIdentitySync />
              <PostHogPageView />
              <TooltipProvider>
                {children}
                <Toaster richColors />
                <BetaChatWidget />
              </TooltipProvider>
            </CSPostHogProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
