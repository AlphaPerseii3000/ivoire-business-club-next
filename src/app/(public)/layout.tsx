import Header from '@/components/landing/header';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#090D16] min-h-screen text-slate-300 flex flex-col font-sans">
            <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
          </div>
  );
}

