"use client";

import { Landmark, Smartphone, Waves } from "lucide-react";

import { getProviderColorClasses, type MobileMoneyProvider } from "@/lib/mobile-money-config";

export type PaymentProvider = "BANK_TRANSFER" | MobileMoneyProvider;

export interface PaymentProviderBadgeProps {
  provider: PaymentProvider;
  providerPhone?: string | null;
  showPhone?: boolean;
}

const PROVIDER_CONFIG: Record<
  PaymentProvider,
  { label: string; icon: typeof Landmark }
> = {
  BANK_TRANSFER: { label: "Virement bancaire", icon: Landmark },
  WAVE: { label: "Wave", icon: Waves },
  ORANGE_MONEY: { label: "Orange Money", icon: Smartphone },
};

export function PaymentProviderBadge({
  provider,
  providerPhone,
  showPhone = false,
}: PaymentProviderBadgeProps) {
  const config = PROVIDER_CONFIG[provider];
  const Icon = config.icon;
  const colors = provider === "BANK_TRANSFER" ? null : getProviderColorClasses(provider as MobileMoneyProvider);
  const showPhoneNumber = showPhone && providerPhone;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
          colors ? colors.badge : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        <Icon className={`size-3.5 ${colors ? colors.text : ""}`} aria-hidden="true" />
        {config.label}
      </span>
      {showPhoneNumber ? (
        <span className="text-xs text-muted-foreground">{providerPhone}</span>
      ) : null}
    </div>
  );
}
