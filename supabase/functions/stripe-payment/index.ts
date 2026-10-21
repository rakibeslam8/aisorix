import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCharge } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

interface PaymentRequest {
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  billingCycle: 'monthly' | 'yearly';
  origin: string;
  couponCode?: string | null;
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

    if (!STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Stripe is not configured. Please add your Stripe API key." 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: PaymentRequest = await req.json();
    const { userId, planId, planName, customerName, customerEmail, billingCycle, origin, couponCode } = body;

    // Validate userId matches authenticated user
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prices are defined server-side in BDT only.
    const currencyCode = "bdt";

    // Persist trusted intent BEFORE creating the Stripe session. The webhook will
    // verify the Stripe session and cross-check against this server-side row.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Never trust the client's plan price / amount: recompute it on the server.
    const charge = await resolveCharge(admin, planId, billingCycle, couponCode);
    if (!charge.ok) {
      return new Response(
        JSON.stringify({ success: false, error: charge.error }),
        { status: charge.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const amount = charge.amount;
    // Stripe uses the smallest currency unit
    const amountInCents = Math.round(amount * 100);
    const tranId = `SORIX_STRIPE_${planId.toUpperCase()}_${Date.now()}`;
    const { error: intentErr } = await admin.from('payment_intents').insert({
      gateway: 'stripe',
      external_id: tranId,
      user_id: user.id,
      plan_id: planId,
      amount,
      currency: currencyCode.toUpperCase(),
      billing_cycle: billingCycle,
      status: 'pending',
      metadata: { plan_name: planName, base_amount: charge.baseAmount, discount: charge.discount, coupon_code: charge.couponCode },
    });
    if (intentErr) {
      console.error('Failed to persist Stripe payment intent:', intentErr);
      return new Response(
        JSON.stringify({ success: false, error: "Could not initialize payment" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Creating Stripe checkout session:", { tranId, planId, amount, currency: currencyCode });

    // Create Stripe Checkout Session
    const sessionResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "payment",
        "payment_method_types[0]": "card",
        "line_items[0][price_data][currency]": currencyCode,
        "line_items[0][price_data][product_data][name]": `${planName} - ${billingCycle} subscription`,
        "line_items[0][price_data][product_data][description]": `Sorix AI ${planName} plan (${billingCycle})`,
        "line_items[0][price_data][unit_amount]": amountInCents.toString(),
        "line_items[0][quantity]": "1",
        "customer_email": customerEmail,
        "client_reference_id": tranId,
        "metadata[user_id]": userId,
        "metadata[plan_id]": planId,
        "metadata[billing_cycle]": billingCycle,
        "metadata[tran_id]": tranId,
        "metadata[amount]": amount.toString(),
        "success_url": `${origin}/payment/success?tran_id=${tranId}&gateway=stripe&session_id={CHECKOUT_SESSION_ID}&plan_id=${planId}&billing_cycle=${billingCycle}&amount=${amount}&currency=${currencyCode.toUpperCase()}`,
        "cancel_url": `${origin}/payment/cancel?tran_id=${tranId}&gateway=stripe`,
      }).toString(),
    });

    const session = await sessionResponse.json();
    console.log("Stripe session response:", session);

    if (session.error) {
      console.error("Stripe error:", session.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: session.error.message || "Failed to create checkout session" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (session.url) {
      // Do NOT call webhook here - the user hasn't paid yet.
      // Payment will be verified when user returns to success page
      // by calling the webhook with the stripe_session_id for verification.
      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl: session.url,
          sessionId: session.id,
          tranId: tranId,
          // Pass metadata for the success page to call webhook after payment
          userId,
          planId,
          billingCycle,
          amount,
          currency: currencyCode.toUpperCase(),
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to create checkout session" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Stripe payment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
