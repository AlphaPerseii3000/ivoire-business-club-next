"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";

export function AdminMemberSearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue ?? "");

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const trimmed = value.trim();
      const nextParams = new URLSearchParams(searchParams.toString());
      if (trimmed) {
        nextParams.set("q", trimmed);
      } else {
        nextParams.delete("q");
      }
      nextParams.delete("page");
      const nextUrl = `${pathname}?${nextParams.toString()}`;
      startTransition(() => {
        router.replace(nextUrl);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, searchParams, pathname, router]);

  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Rechercher par nom ou email..."
      aria-label="Rechercher un membre par nom ou email"
      data-pending={isPending || undefined}
      className="w-full sm:max-w-sm"
    />
  );
}
