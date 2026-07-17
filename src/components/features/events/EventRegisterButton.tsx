"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, CreditCard, Landmark, Phone, Wallet } from "lucide-react";
import { Pricing, getPriceForTier, formatPrice } from "@/lib/event-utils";

interface EventRegisterButtonProps {
  eventId: string;
  eventTitle: string;
  eventDate?: string;
  userTier?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  pricing: Pricing | null;
  remainingSpots: number | null;
  isAlreadyRegistered: boolean;
  isPastEvent?: boolean;
  className?: string;
}

type PaymentOption = "BANK_TRANSFER" | "WAVE" | "ORANGE_MONEY" | "PAY_ON_SITE";

export function EventRegisterButton({
  eventId,
  eventTitle,
  eventDate,
  userTier,
  userEmail,
  userName,
  pricing,
  remainingSpots,
  isAlreadyRegistered,
  isPastEvent,
  className,
}: EventRegisterButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [providerPhone, setProviderPhone] = useState("");
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("BANK_TRANSFER");
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{
    payOnSite: boolean;
    provider?: string | null;
    amountPaid?: number | null;
  } | null>(null);

  const isMember = !!userEmail;
  const isFull = remainingSpots !== null && remainingSpots <= 0;

  // Compute calculated price
  const calculatedPrice = isMember
    ? getPriceForTier(pricing, userTier || "AFFRANCHI")
    : (pricing?.visitor ?? null);

  const formattedPrice = formatPrice(calculatedPrice);

  const handleOpen = () => {
    if (isAlreadyRegistered || isFull) return;
    setSuccessData(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetEmail = isMember ? userEmail : emailInput.trim();
    if (!targetEmail) {
      toast.error("Veuillez saisir votre adresse email.");
      return;
    }

    setLoading(true);
    try {
      const payOnSite = paymentOption === "PAY_ON_SITE";
      const provider = payOnSite ? null : paymentOption;

      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          payOnSite,
          provider,
          providerPhone: (paymentOption === "WAVE" || paymentOption === "ORANGE_MONEY") ? providerPhone : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'inscription");
      }

      toast.success("Inscription enregistrée avec succès !");
      setSuccessData({
        payOnSite,
        provider,
        amountPaid: data.registration?.amountPaid,
      });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {isAlreadyRegistered ? (
        <Button disabled variant="outline" className={className}>
          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
          Déjà inscrit
        </Button>
      ) : isPastEvent ? (
        <Button disabled variant="secondary" className={className}>
          Événement terminé
        </Button>
      ) : isFull ? (
        <Button disabled variant="secondary" className={className}>
          Complet
        </Button>
      ) : (
        <Button onClick={handleOpen} className={className}>
          S'inscrire à l'événement
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Inscription à l'événement</DialogTitle>
            <DialogDescription>
              {eventTitle} {eventDate ? `• ${eventDate}` : ""}
            </DialogDescription>
          </DialogHeader>

          {successData ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Votre inscription est confirmée !
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Un email de confirmation vous a été adressé.
                </p>
              </div>

              {calculatedPrice !== null && calculatedPrice > 0 && (
                <>
                  {successData.payOnSite ? (
                    <div className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      <p className="font-medium">Information paiement sur place :</p>
                      <p className="mt-1 text-xs">
                        Présentez-vous à l'accueil de l'événement pour vous acquitter du tarif d'entrée ({formattedPrice}). Notez que la priorité est donnée aux règlements préalables.
                      </p>
                    </div>
                  ) : successData.provider === "BANK_TRANSFER" ? (
                    <div className="rounded-md bg-muted p-4 text-sm space-y-2 border">
                      <p className="font-semibold flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-primary" />
                        Instructions pour le Virement Bancaire :
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Merci d'effectuer votre virement du montant de <strong>{formattedPrice}</strong> vers le compte IBC avec la référence de paiement <code>EVT-{eventId}</code>.
                      </p>
                    </div>
                  ) : successData.provider === "WAVE" || successData.provider === "ORANGE_MONEY" ? (
                    <div className="rounded-md bg-muted p-4 text-sm space-y-2 border">
                      <p className="font-semibold flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        Instructions Mobile Money ({successData.provider === "WAVE" ? "Wave" : "Orange Money"}) :
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Effectuez le transfert de <strong>{formattedPrice}</strong> vers le numéro officiel IBC <strong>+225 07 00 00 00 00</strong> avec pour motif <code>EVT-{eventId}</code>.
                      </p>
                    </div>
                  ) : null}
                </>
              )}

              <DialogFooter className="mt-4">
                <Button onClick={() => setIsOpen(false)} variant="default">
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Profil / User Info */}
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Statut :</span>
                  {isMember ? (
                    <Badge variant="outline" className="font-semibold">
                      Membre {userTier || "AFFRANCHI"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Visiteur</Badge>
                  )}
                </div>

                {isMember ? (
                  <div className="space-y-1 text-sm pt-1">
                    <p><span className="text-muted-foreground">Nom :</span> {userName || "Membre IBC"}</p>
                    <p><span className="text-muted-foreground">Email :</span> {userEmail}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="visitor-email">Votre adresse email *</Label>
                    <Input
                      id="visitor-email"
                      type="email"
                      required
                      placeholder="exemple@domaine.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex justify-between items-center text-sm border-t pt-2 mt-2">
                  <span className="font-medium">Tarif applicable :</span>
                  <span className="font-bold text-primary text-base">{formattedPrice}</span>
                </div>
              </div>

              {calculatedPrice !== null && calculatedPrice > 0 && (
                <>
                  {/* Mode de paiement */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mode de règlement</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentOption("BANK_TRANSFER")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                          paymentOption === "BANK_TRANSFER"
                            ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                            : "border-input bg-background hover:bg-accent"
                        }`}
                      >
                        <Landmark className="h-5 w-5 mb-1" />
                        Virement Bancaire
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentOption("WAVE")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                          paymentOption === "WAVE"
                            ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                            : "border-input bg-background hover:bg-accent"
                        }`}
                      >
                        <Wallet className="h-5 w-5 mb-1" />
                        Wave
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentOption("ORANGE_MONEY")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                          paymentOption === "ORANGE_MONEY"
                            ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                            : "border-input bg-background hover:bg-accent"
                        }`}
                      >
                        <Phone className="h-5 w-5 mb-1" />
                        Orange Money
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentOption("PAY_ON_SITE")}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                          paymentOption === "PAY_ON_SITE"
                            ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                            : "border-input bg-background hover:bg-accent"
                        }`}
                      >
                        <CreditCard className="h-5 w-5 mb-1" />
                        Payer sur place
                      </button>
                    </div>
                  </div>

                  {(paymentOption === "WAVE" || paymentOption === "ORANGE_MONEY") && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="provider-phone">Numéro de téléphone Mobile Money *</Label>
                      <Input
                        id="provider-phone"
                        type="tel"
                        required
                        placeholder="+225 07 00 00 00 00"
                        value={providerPhone}
                        onChange={(e) => setProviderPhone(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Message d'avertissement Pay On Site (AC3) */}
                  {paymentOption === "PAY_ON_SITE" && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Attention :</strong> Les places ne sont pas garanties pour le paiement sur place. Pré-inscrivez-vous et réglez au préalable pour garantir votre réservation.
                      </div>
                    </div>
                  )}
                </>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Inscription..." : (calculatedPrice !== null && calculatedPrice > 0 ? "Confirmer l'inscription" : "S'inscrire")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
