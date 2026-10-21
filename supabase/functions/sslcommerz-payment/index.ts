import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCharge } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SSLCOMMERZ_STORE_ID = Deno.env.get("SSLCOMMERZ_STORE_ID");
const SSLCOMMERZ_STORE_PASSWORD = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD");
const SSLCOMMERZ_SANDBOX = Deno.env.get("SSLCOMMERZ_SANDBOX") !== "false";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/payment-webhook`;

interface PaymentRequest {
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  billingCycle: 'monthly' | 'yearly';
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

    if (!SSLCOMMERZ_STORE_ID || !SSLCOMMERZ_STORE_PASSWORD) {
      console.error("SSLCommerz credentials not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Payment gateway not configured" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    const { userId, planId, planName, customerName, customerEmail, customerPhone, billingCycle, origin, couponCode } = body;

    // Validate userId matches authenticated user
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Persist trusted payment intent BEFORE redirecting the user. The IPN handler
    // will look this up by tran_id and ignore the user-controlled value_a/value_b fields.
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
    const normalizedCurrency = charge.currency;
    const tranId = `SORIX_${planId.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { error: intentErr } = await admin.from('payment_intents').insert({
      gateway: 'sslcommerz',
      external_id: tranId,
      user_id: user.id,
      plan_id: planId,
      amount,
      currency: normalizedCurrency,
      billing_cycle: billingCycle,
      status: 'pending',
      metadata: { plan_name: planName, base_amount: charge.baseAmount, discount: charge.discount, coupon_code: charge.couponCode },
    });
    if (intentErr) {
      console.error('Failed to persist SSLCommerz payment intent:', intentErr);
      return new Response(
        JSON.stringify({ success: false, error: "Could not initialize payment" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // SSLCommerz API endpoint (sandbox for testing)
    const sslcommerzUrl = SSLCOMMERZ_SANDBOX
      ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
      : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

    const clientOrigin = origin || req.headers.get("origin") || "";

    // Prepare form data for SSLCommerz
    const formData = new URLSearchParams();
    formData.append("store_id", SSLCOMMERZ_STORE_ID);
    formData.append("store_passwd", SSLCOMMERZ_STORE_PASSWORD);
    formData.append("total_amount", amount.toString());
    formData.append("currency", normalizedCurrency);
    formData.append("tran_id", tranId);
    formData.append("success_url", `${clientOrigin}/payment/success?tran_id=${tranId}&gateway=sslcommerz`);
    formData.append("fail_url", `${clientOrigin}/payment/failed?tran_id=${tranId}&gateway=sslcommerz`);
    formData.append("cancel_url", `${clientOrigin}/payment/cancel?tran_id=${tranId}&gateway=sslcommerz`);
    formData.append("ipn_url", WEBHOOK_URL);

    // value_a/b/c/d are still passed for SSLCommerz logging convenience, but the webhook
    // ignores them and trusts only the server-side payment_intents row keyed by tran_id.
    formData.append("value_a", userId);
    formData.append("value_b", planId);
    formData.append("value_c", billingCycle);
    formData.append("value_d", amount.toString());
    formData.append("cus_name", customerName);
    formData.append("cus_email", customerEmail);
    formData.append("cus_phone", customerPhone || "01700000000");
    formData.append("cus_add1", "Dhaka");
    formData.append("cus_city", "Dhaka");
    formData.append("cus_country", "Bangladesh");
    formData.append("shipping_method", "NO");
    formData.append("product_name", `${planName} - ${billingCycle}`);
    formData.append("product_category", "Subscription");
    formData.append("product_profile", "non-physical-goods");

    console.log("Initiating SSLCommerz payment:", { tranId, planId, amount });

    const response = await fetch(sslcommerzUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await response.json();
    console.log("SSLCommerz response:", result);

    if (result.status === "SUCCESS") {
      return new Response(
        JSON.stringify({
          success: true,
          gatewayPageURL: result.GatewayPageURL,
          sessionKey: result.sessionkey,
          tranId: tranId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.failedreason || "Payment initialization failed",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("SSLCommerz payment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
