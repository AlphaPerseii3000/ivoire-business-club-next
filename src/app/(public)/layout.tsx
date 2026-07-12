import Header from '@/components/landing/header';
import LandingMobileNav from '@/components/landing/mobile-nav';
import { Footer } from '@/components/landing/footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#090D16] min-h-screen text-slate-300 flex flex-col font-sans">
      <LandingMobileNav />
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
    </div>
  );
}

