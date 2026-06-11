"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import SignOutButton from "@/components/auth/sign-out-button";
import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface AdminMobileNavProps {
  navItems: NavItem[];
}

export default function AdminMobileNav({ navItems }: AdminMobileNavProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="md:hidden flex h-16 items-center justify-between border-b bg-card px-4 sticky top-0 z-40">
      <Link href="/admin/dashboard" className="text-lg font-bold text-primary">
        IBC Admin
      </Link>
      
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={
          <Button
            variant="ghost"
            className="h-11 w-11 flex items-center justify-center p-0"
            aria-label="Ouvrir le menu de navigation"
          />
        }>
          <Menu className="h-6 w-6" />
        </SheetTrigger>
        <SheetContent side="bottom" className="w-full p-0 flex flex-col bg-card rounded-t-2xl border-t shadow-lg">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">Navigation Admin</SheetTitle>
          </SheetHeader>
          <nav className="flex-1 space-y-1 p-4" aria-label="Menu principal">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted font-medium transition-colors"
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <hr className="my-3 border-border" />
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted font-medium transition-colors"
            >
              <span aria-hidden="true">🔙</span>
              <span>Retour au site</span>
            </Link>
          </nav>
          <div className="border-t p-4">
            <SignOutButton />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
