import Link from 'next/link';
import { auth } from '@/lib/auth';

export default async function Header() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <header className="hidden md:flex sticky top-0 z-50 border-b border-white/10 bg-[#090D16]/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <img src="/logo-ibc-landing.webp" alt="IBC Logo" className="h-8 w-auto" />
          <span className="hidden sm:inline bg-gradient-to-r from-white to-[#D4A847] bg-clip-text text-transparent font-sans">
            Ivoire Business Club
          </span>
        </Link>
        <nav className="flex gap-6 text-sm items-center">
          <Link href="/" className="text-slate-300 hover:text-white transition-colors">
            Accueil
          </Link>
          <Link href="/#mission" className="text-slate-300 hover:text-white transition-colors">
            Mission
          </Link>
          <Link href="/#pricing" className="text-slate-300 hover:text-white transition-colors">
            Tarifs
          </Link>
          <Link href="/articles" className="text-slate-300 hover:text-white transition-colors">
            Articles
          </Link>
          <Link href="/experts" className="text-slate-300 hover:text-white transition-colors">
            Experts
          </Link>
          <Link href="/partners" className="text-slate-300 hover:text-white transition-colors">
            Partenaires
          </Link>
          <Link href="/events" className="text-slate-300 hover:text-white transition-colors font-medium">
            Événements
          </Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors font-medium">
              Tableau de bord
            </Link>
          ) : (
            <Link href="/auth/signin" className="text-slate-300 hover:text-white transition-colors">
              Connexion
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
