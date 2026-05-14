import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Ivoire Business Club — Bâtir son futur en Afrique",
    template: "%s | Ivoire Business Club",
  },
  description: "Accède aux meilleures opportunités business en Côte d'Ivoire et en Europe. Networking, investissements, partenariats.",
  keywords: ["business", "Côte d'Ivoire", "Afrique", "investissement", "networking", "entrepreneuriat", "IBC"],
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
