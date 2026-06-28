"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import posthog from "posthog-js";

import { buildWhatsAppSupportLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type WhatsAppCTAProps = {
  phoneNumber?: string | null;
  prefilledMessage: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
};

const NO_PHONE_TOOLTIP = "Le numéro WhatsApp n'est pas renseigné.";

export function WhatsAppCTA({ phoneNumber, prefilledMessage, className, size = "md", label = "Contacter sur WhatsApp" }: WhatsAppCTAProps) {
  const href = buildWhatsAppSupportLink({ phoneNumber, message: prefilledMessage });
  const sizeClass = size === "lg" ? "min-h-11 px-4 py-3" : size === "sm" ? "min-h-10 px-3 py-2 text-xs" : "min-h-11 px-4 py-2";
  const baseClassName = cn(
    "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2",
    sizeClass,
    className,
  );

  if (!href) {
    return (
      <Tooltip>
        <TooltipTrigger className={cn(baseClassName, "cursor-not-allowed opacity-60 hover:brightness-100")}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {label}
        </TooltipTrigger>
        <TooltipContent>
          <p>{NO_PHONE_TOOLTIP}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={baseClassName}
      aria-label={label}
      onClick={() => posthog.capture("whatsapp_contact_clicked", { label })}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}