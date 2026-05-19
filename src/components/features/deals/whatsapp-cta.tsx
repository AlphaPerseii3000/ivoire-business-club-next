import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { buildWhatsAppSupportLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type WhatsAppCTAProps = {
  phoneNumber?: string | null;
  prefilledMessage: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function WhatsAppCTA({ phoneNumber, prefilledMessage, className, size = "md" }: WhatsAppCTAProps) {
  const href = buildWhatsAppSupportLink({ phoneNumber, message: prefilledMessage });
  const sizeClass = size === "lg" ? "min-h-11 px-4 py-3" : size === "sm" ? "min-h-10 px-3 py-2 text-xs" : "min-h-11 px-4 py-2";
  const baseClassName = cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2",
    sizeClass,
    className,
  );

  if (!href) {
    return (
      <div className="space-y-1">
        <button type="button" className={cn(baseClassName, "cursor-not-allowed opacity-60 hover:brightness-100")} disabled>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Contacter sur WhatsApp
        </button>
        <p className="text-xs text-muted-foreground">Le numéro WhatsApp n&apos;est pas renseigné.</p>
      </div>
    );
  }

  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className={baseClassName} aria-label="Contacter le porteur sur WhatsApp">
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      Contacter sur WhatsApp
    </Link>
  );
}
