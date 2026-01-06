import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Pro plan product ID
const PRO_PRODUCT_ID = "prod_ShiZWV4a0V3VbR";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { subaccountId } = await req.json();
    logStep("Checking subscription for subaccount", { subaccountId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(
        JSON.stringify({
          subscribed: false,
          isTrialing: false,
          trialEndsAt: null,
          subscriptionEnd: null,
          productId: null,
          status: "none",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get all subscriptions (including trialing)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    // Find active or trialing subscription
    const activeSubscription = subscriptions.data.find(
      (sub: { status: string }) => sub.status === "active" || sub.status === "trialing"
    );

    if (!activeSubscription) {
      logStep("No active subscription found");
      
      // Update database to reflect no subscription
      await supabaseClient
        .from("subaccount_subscriptions")
        .update({
          is_trial: false,
          stripe_subscription_id: null,
          payment_method_added: false,
        })
        .eq("subaccount_id", subaccountId);

      return new Response(
        JSON.stringify({
          subscribed: false,
          isTrialing: false,
          trialEndsAt: null,
          subscriptionEnd: null,
          productId: null,
          status: "none",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const isTrialing = activeSubscription.status === "trialing";
    const trialEndsAt = activeSubscription.trial_end
      ? new Date(activeSubscription.trial_end * 1000).toISOString()
      : null;
    const subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
    const productId = activeSubscription.items.data[0]?.price?.product as string;

    logStep("Found subscription", {
      status: activeSubscription.status,
      isTrialing,
      trialEndsAt,
      subscriptionEnd,
      productId,
    });

    // Update database with subscription info
    const updateData: Record<string, unknown> = {
      stripe_customer_id: customerId,
      stripe_subscription_id: activeSubscription.id,
      is_trial: isTrialing,
      payment_method_added: true,
      billing_period_end: subscriptionEnd,
    };

    if (isTrialing && trialEndsAt) {
      updateData.trial_started_at = new Date(activeSubscription.start_date * 1000).toISOString();
      updateData.trial_ends_at = trialEndsAt;
    }

    // Find Pro plan ID from database
    const { data: proPlan } = await supabaseClient
      .from("subscription_plans")
      .select("id")
      .eq("name", "Pro")
      .single();

    if (proPlan) {
      updateData.plan_id = proPlan.id;
    }

    await supabaseClient
      .from("subaccount_subscriptions")
      .update(updateData)
      .eq("subaccount_id", subaccountId);

    logStep("Updated subscription in database");

    return new Response(
      JSON.stringify({
        subscribed: true,
        isTrialing,
        trialEndsAt,
        subscriptionEnd,
        productId,
        status: activeSubscription.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
