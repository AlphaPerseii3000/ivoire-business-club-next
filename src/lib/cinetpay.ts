// CinetPay integration — placeholder for production
// API docs: https://docs.cinetpay.com/api/1.0-en

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY ?? "";
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID ?? "";
const CINETPAY_BASE_URL = "https://api-checkout.cinetpay.com/v2/payment";

interface CinetPayCheckoutParams {
  transactionId: string;
  amount: number;
  currency: string; // XOF
  description: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  returnUrl: string;
  notifyUrl: string;
}

export async function createCinetPayCheckout(params: CinetPayCheckoutParams) {
  const response = await fetch(CINETPAY_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      customer_id: params.customerId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
      channels: "MOBILE_MONEY,CARD,WALLET",
    }),
  });

  return response.json();
}

export function verifyCinetPaySignature(data: Record<string, string>, apiKey: string): boolean {
  // CinetPay signature verification logic
  // In production, verify the HMAC signature from the webhook
  return true; // Placeholder
}

// CFA prices for each plan
export const CINETPAY_PRICES = {
  AFFRANCHI: { monthly: 10000, annual: 100000 },
  GRAND_FRERE: { monthly: 25000, annual: 250000 },
  BOSS: { monthly: 50000, annual: 500000 },
} as const;
