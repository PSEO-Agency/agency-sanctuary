import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const ghlPurchaseUrl = Deno.env.get("GHL_PURCHASE_WEBHOOK_URL");
    const ghlCancellationUrl = Deno.env.get("GHL_CANCELLATION_WEBHOOK_URL");

    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    if (!ghlPurchaseUrl || !ghlCancellationUrl) {
      throw new Error("Missing GHL webhook URLs");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      logStep("ERROR: No Stripe signature found");
      return new Response(JSON.stringify({ error: "No signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { eventType: event.type });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Webhook signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle the events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout.session.completed", { sessionId: session.id });

      const customerEmail = session.customer_email || session.customer_details?.email;
      if (!customerEmail) {
        logStep("ERROR: No customer email found in session");
        return new Response(JSON.stringify({ error: "No customer email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Lookup user profile
      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("id, email, full_name, sub_account_id")
        .eq("email", customerEmail)
        .single();

      if (profileError) {
        logStep("Warning: Could not find profile", { email: customerEmail, error: profileError.message });
      }

      // Get subaccount info if available
      let businessName = "";
      let subaccountId = "";
      
      if (profile?.sub_account_id) {
        const { data: subaccount } = await supabaseClient
          .from("subaccounts")
          .select("id, name, business_settings")
          .eq("id", profile.sub_account_id)
          .single();
        
        if (subaccount) {
          subaccountId = subaccount.id;
          const businessSettings = subaccount.business_settings as Record<string, any> | null;
          businessName = businessSettings?.business_name || subaccount.name || "";
        }
      }

      // Parse name
      const fullName = profile?.full_name || customerEmail.split("@")[0] || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Build GHL payload
      const ghlPayload = {
        email: customerEmail,
        name: fullName,
        firstName,
        lastName,
        phone: "",
        companyName: businessName,
        website: "",
        city: "",
        country: "",
        customField: {
          subaccount_id: subaccountId,
          purchase_date: new Date().toISOString(),
          subscription_id: session.subscription || "",
        },
        source: "Stripe Purchase",
      };

      logStep("Sending purchase webhook to GHL", { email: customerEmail });

      const ghlResponse = await fetch(ghlPurchaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ghlPayload),
      });

      logStep("GHL purchase response", { status: ghlResponse.status });

    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });

      // Get customer email from Stripe
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      const customerEmail = (customer as Stripe.Customer).email;

      if (!customerEmail) {
        logStep("ERROR: No customer email found");
        return new Response(JSON.stringify({ error: "No customer email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Lookup user profile
      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("id, email, full_name, sub_account_id")
        .eq("email", customerEmail)
        .single();

      if (profileError) {
        logStep("Warning: Could not find profile", { email: customerEmail, error: profileError.message });
      }

      // Get subaccount info if available
      let businessName = "";
      let subaccountId = "";
      
      if (profile?.sub_account_id) {
        const { data: subaccount } = await supabaseClient
          .from("subaccounts")
          .select("id, name, business_settings")
          .eq("id", profile.sub_account_id)
          .single();
        
        if (subaccount) {
          subaccountId = subaccount.id;
          const businessSettings = subaccount.business_settings as Record<string, any> | null;
          businessName = businessSettings?.business_name || subaccount.name || "";
        }
      }

      // Parse name
      const fullName = profile?.full_name || customerEmail.split("@")[0] || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Build GHL payload
      const ghlPayload = {
        email: customerEmail,
        name: fullName,
        firstName,
        lastName,
        phone: "",
        companyName: businessName,
        website: "",
        city: "",
        country: "",
        customField: {
          subaccount_id: subaccountId,
          cancellation_date: new Date().toISOString(),
          subscription_id: subscription.id,
        },
        source: "Stripe Cancellation",
      };

      logStep("Sending cancellation webhook to GHL", { email: customerEmail });

      const ghlResponse = await fetch(ghlCancellationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ghlPayload),
      });

      logStep("GHL cancellation response", { status: ghlResponse.status });

    } else {
      logStep("Ignoring unhandled event type", { eventType: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
