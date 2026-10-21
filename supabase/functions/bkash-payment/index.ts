import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCharge } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BKASH_APP_KEY = Deno.env.get("BKASH_APP_KEY");
const BKASH_APP_SECRET = Deno.env.get("BKASH_APP_SECRET");
const BKASH_USERNAME = Deno.env.get("BKASH_USERNAME");
const BKASH_PASSWORD = Deno.env.get("BKASH_PASSWORD");
const BKASH_SANDBOX = Deno.env.get("BKASH_SANDBOX") !== "false";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/payment-webhook`;
const INTERNAL_WEBHOOK_SECRET = Deno.env.get("INTERNAL_WEBHOOK_SECRET");

interface PaymentRequest {
  couponCode?: string | null;
  action: 'grant_token' | 'create_payment' | 'execute_payment' | 'query_payment';
  userId?: string;
  planId?: string;
  planName?: string;
  amount?: number;
  customerPhone?: string;
  billingCycle?: 'monthly' | 'yearly';
  paymentID?: string;
}

// Get bKash token
async function getGrantToken(): Promise<string | null> {
  if (!BKASH_APP_KEY || !BKASH_APP_SECRET || !BKASH_USERNAME || !BKASH_PASSWORD) {
    console.error("bKash credentials not configured");
    return null;
  }

  const baseUrl = BKASH_SANDBOX
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";

  try {
    const response = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "username": BKASH_USERNAME,
        "password": BKASH_PASSWORD,
      },
      body: JSON.stringify({
        app_key: BKASH_APP_KEY,
        app_secret: BKASH_APP_SECRET,
      }),
    });

    const result = await response.json();
    console.log("bKash token response:", result);
    
    if (result.id_token) {
      return result.id_token;
    }
    return null;
  } catch (error) {
    console.error("bKash token error:", error);
    return null;
  }
}

// Create bKash payment
async function createPayment(
  token: string,
  amount: number,
  planId: string,
  planName: string,
  billingCycle: string,
  userId: string,
  origin: string
): Promise<any> {
  const baseUrl = BKASH_SANDBOX
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";

  const invoiceNumber = `SORIX_${planId.toUpperCase()}_${Date.now()}`;
  const callbackURL = `${origin}/payment/bkash/callback`;

  try {
    const response = await fetch(`${baseUrl}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": token,
        "X-APP-Key": BKASH_APP_KEY!,
      },
      body: JSON.stringify({
        mode: "0011",
        callbackURL: callbackURL,
        amount: amount.toString(),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: invoiceNumber,
      }),
    });

    const result = await response.json();
    console.log("bKash create payment response:", result);
    return result;
  } catch (error) {
    console.error("bKash create payment error:", error);
    throw error;
  }
}

// Execute bKash payment
async function executePayment(token: string, paymentID: string): Promise<any> {
  const baseUrl = BKASH_SANDBOX
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";

  try {
    const response = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": token,
        "X-APP-Key": BKASH_APP_KEY!,
      },
      body: JSON.stringify({ paymentID }),
    });

    const result = await response.json();
    console.log("bKash execute payment response:", result);
    return result;
  } catch (error) {
    console.error("bKash execute payment error:", error);
    throw error;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: PaymentRequest = await req.json();
    const { action, userId, planId, planName, billingCycle, paymentID, couponCode } = body;
    const origin = req.headers.get("origin") || "";

    // Validate userId matches authenticated user
    if (userId && userId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    switch (action) {
      case 'grant_token': {
        const token = await getGrantToken();
        if (token) {
          return new Response(
            JSON.stringify({ success: true, token }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: "Failed to get bKash token" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      case 'create_payment': {
        if (!userId || !planId || !planName || !billingCycle) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing required fields" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Never trust the client's plan price / amount: recompute it on the server.
        const pricingClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const charge = await resolveCharge(pricingClient, planId, billingCycle, couponCode);
        if (!charge.ok) {
          return new Response(
            JSON.stringify({ success: false, error: charge.error }),
            { status: charge.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const token = await getGrantToken();
        if (!token) {
          return new Response(
            JSON.stringify({ success: false, error: "Failed to get bKash token" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const result = await createPayment(token, charge.amount, planId, planName, billingCycle, userId, origin);

        if (result.bkashURL && result.paymentID) {
          // Persist the trusted plan/amount keyed by bKash paymentID so execute_payment
          // cannot be tricked into upgrading the user to a different plan.
          const admin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          );
          const { error: intentErr } = await admin.from('payment_intents').insert({
            gateway: 'bkash',
            external_id: result.paymentID,
            user_id: user.id,
            plan_id: planId,
            amount: charge.amount,
            currency: 'BDT',
            billing_cycle: billingCycle,
            status: 'pending',
            metadata: { plan_name: planName, base_amount: charge.baseAmount, discount: charge.discount, coupon_code: charge.couponCode },
          });
          if (intentErr) {
            console.error('Failed to persist bKash payment intent:', intentErr);
          }

          return new Response(
            JSON.stringify({
              success: true,
              bkashURL: result.bkashURL,
              paymentID: result.paymentID,
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        } else {
          return new Response(
            JSON.stringify({
              success: false,
              error: result.errorMessage || "Payment creation failed",
            }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      case 'execute_payment': {
        if (!paymentID) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing paymentID" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Look up the trusted intent created during create_payment. Never trust the
        // plan_id / amount / billing_cycle the client sends here.
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: intent, error: intentErr } = await admin
          .from('payment_intents')
          .select('user_id, plan_id, amount, billing_cycle, status')
          .eq('gateway', 'bkash')
          .eq('external_id', paymentID)
          .maybeSingle();

        if (intentErr || !intent) {
          return new Response(
            JSON.stringify({ success: false, error: "Unknown payment" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        if (intent.user_id !== user.id) {
          return new Response(
            JSON.stringify({ success: false, error: "Forbidden" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const token = await getGrantToken();
        if (!token) {
          return new Response(
            JSON.stringify({ success: false, error: "Failed to get bKash token" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const result = await executePayment(token, paymentID);

        if (result.transactionStatus === "Completed") {
          // Cross-check the amount returned by bKash against the stored intent.
          const paidAmount = parseFloat(result.amount);
          if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - Number(intent.amount)) > 0.01) {
            console.error('bKash amount mismatch', { paid: result.amount, expected: intent.amount });
            return new Response(
              JSON.stringify({ success: false, error: "Amount mismatch" }),
              { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }

          // Mark intent as paid (idempotent).
          await admin
            .from('payment_intents')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('gateway', 'bkash')
            .eq('external_id', paymentID);

          // Trigger webhook with server-trusted values from the intent.
          try {
            await fetch(WEBHOOK_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                gateway: 'bkash',
                status: 'success',
                tran_id: result.trxID || paymentID,
                amount: Number(intent.amount),
                currency: 'BDT',
                user_id: intent.user_id,
                plan_id: intent.plan_id,
                billing_cycle: intent.billing_cycle,
                payment_method: 'bkash',
                _internal_secret: INTERNAL_WEBHOOK_SECRET,
              }),
            });
          } catch (webhookError) {
            console.error("Failed to call webhook:", webhookError);
          }

          return new Response(
            JSON.stringify({
              success: true,
              transactionId: result.trxID,
              amount: result.amount,
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        } else {
          return new Response(
            JSON.stringify({
              success: false,
              error: result.errorMessage || "Payment execution failed",
            }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
  } catch (error: any) {
    console.error("bKash payment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
