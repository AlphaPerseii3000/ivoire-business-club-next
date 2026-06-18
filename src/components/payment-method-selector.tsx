"use client";

import { useMemo, useState } from "react";
import { Landmark, Smartphone, Waves, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProviderColorClasses, getSupportedCountriesSentence, isSupportedMobileMoneyPrefix, type MobileMoneyProvider } from "@/lib/mobile-money-config";

export type PaymentProvider = "BANK_TRANSFER" | MobileMoneyProvider;

export interface PaymentMethodSelectorProps {
  defaultProvider?: PaymentProvider;
  onSubmit?: (provider: PaymentProvider, phone?: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const PAYMENT_OPTIONS: { value: PaymentProvider; label: string; description: string; icon: typeof Landmark }[] = [
  {
    value: "BANK_TRANSFER",
    label: "Virement bancaire",
    description: "RIB KS Investment (EUR / XOF)",
    icon: Landmark,
  },
  {
    value: "WAVE",
    label: "Wave",
    description: "Paiement mobile Côte d'Ivoire, Sénégal, etc.",
    icon: Waves,
  },
  {
    value: "ORANGE_MONEY",
    label: "Orange Money",
    description: "Paiement mobile Afrique de l'Ouest",
    icon: Smartphone,
  },
];

export function formatPhoneForInput(phone: string): string {
  return phone.replace(/[^\d+]/g, "").slice(0, 18);
}

export function PaymentMethodSelector({
  defaultProvider = "BANK_TRANSFER",
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
}: PaymentMethodSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(defaultProvider);
  const [phone, setPhone] = useState("");

  const isMobileMoney = selectedProvider === "WAVE" || selectedProvider === "ORANGE_MONEY";
  const showPhoneField = isMobileMoney;
  const isPhoneRequired = isMobileMoney;
  const isPhoneLengthValid = phone.length >= 8 && phone.startsWith("+");
  const isPhonePrefixSupported = !isMobileMoney || isSupportedMobileMoneyPrefix(phone);
  const canSubmit = !isMobileMoney || (isPhoneLengthValid && isPhonePrefixSupported);
  const showPrefixError = isMobileMoney && phone.length > 0 && isPhoneLengthValid && !isPhonePrefixSupported;

  const providerColors = useMemo(() => {
    if (selectedProvider === "WAVE" || selectedProvider === "ORANGE_MONEY") {
      return getProviderColorClasses(selectedProvider as MobileMoneyProvider);
    }
    return null;
  }, [selectedProvider]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || isLoading) return;

    if (selectedProvider === "BANK_TRANSFER") {
      onSubmit?.("BANK_TRANSFER");
      return;
    }

    onSubmit?.(selectedProvider, phone);
  }

  return (
    <form onSubmit={handleSubmit} data-testid="payment-method-selector" className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-foreground">Choisis ton moyen de paiement</legend>
        <div role="radiogroup" aria-label="Moyen de paiement" className="grid gap-3 md:grid-cols-3">
          {PAYMENT_OPTIONS.map((option) => {
            const isSelected = selectedProvider === option.value;
            const Icon = option.icon;
            const isMobile = option.value === "WAVE" || option.value === "ORANGE_MONEY";
            const colors = isMobile ? getProviderColorClasses(option.value as MobileMoneyProvider) : null;

            return (
              <div
                key={option.value}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                data-testid={`payment-option-${option.value}`}
                onClick={() => setSelectedProvider(option.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedProvider(option.value);
                  }
                }}
                className={`
                  cursor-pointer rounded-xl border p-4 transition-all outline-none
                  focus-visible:ring-3 focus-visible:ring-ring/50
                  ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:bg-muted/50"}
                  ${colors ? `${colors.border} ${colors.bg}` : "bg-card"}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg border p-2 ${colors?.badge ?? "bg-muted"}`}>
                    <Icon className={`size-5 ${colors?.text ?? "text-foreground"}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      {showPhoneField ? (
        <Card className={`${providerColors?.border ?? ""} ${providerColors?.bg ?? ""}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Numéro mobile money</CardTitle>
            <CardDescription className="text-xs">
              Saisis le numéro depuis lequel tu effectueras le paiement. Format international obligatoire.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="provider-phone">Numéro de téléphone</Label>
              <Input
                id="provider-phone"
                data-testid="provider-phone-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+225 01 23 45 67 89"
                value={phone}
                onChange={(e) => setPhone(formatPhoneForInput(e.target.value))}
                required={isPhoneRequired}
                aria-invalid={phone.length > 0 && !phone.startsWith("+") ? "true" : "false"}
                aria-describedby="provider-phone-help"
              />
              <p id="provider-phone-help" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="size-3.5" aria-hidden="true" />
                Pays supportés : {getSupportedCountriesSentence()}
              </p>
              {showPrefixError ? (
                <p className="text-xs text-destructive">
                  Indicatif non supporté. Utilise un numéro mobile money des pays listés ci-dessus.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        {onCancel ? (
          <Button type="button" variant="ghost" className="min-h-11 flex-1" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
        ) : null}
        <Button
          type="submit"
          data-testid="payment-method-submit"
          className="min-h-11 flex-1"
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? "Validation..." : "Continuer"}
        </Button>
      </div>
    </form>
  );
}

export default PaymentMethodSelector;
