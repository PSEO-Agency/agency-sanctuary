import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TEST-GHL-WEBHOOKS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Test function started");

    const ghlPurchaseUrl = Deno.env.get("GHL_PURCHASE_WEBHOOK_URL");
    const ghlCancellationUrl = Deno.env.get("GHL_CANCELLATION_WEBHOOK_URL");

    if (!ghlPurchaseUrl || !ghlCancellationUrl) {
      throw new Error("Missing GHL webhook URLs");
    }

    const { type } = await req.json();
    logStep("Received request", { type });

    // Test payload matching the signup webhook structure
    const testPayload = {
      email: "test@example.com",
      name: "Test User",
      firstName: "Test",
      lastName: "User",
      phone: "",
      companyName: "Test Business",
      website: "",
      city: "",
      country: "",
      customField: {
        subaccount_id: "test-subaccount-123",
        ...(type === "purchase" 
          ? { purchase_date: new Date().toISOString(), subscription_id: "sub_test123" }
          : { cancellation_date: new Date().toISOString(), subscription_id: "sub_test123" }
        ),
      },
      source: type === "purchase" ? "Stripe Purchase" : "Stripe Cancellation",
    };

    const webhookUrl = type === "purchase" ? ghlPurchaseUrl : ghlCancellationUrl;
    
    logStep("Sending test webhook", { type, url: webhookUrl });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    logStep("GHL response", { status: response.status, body: responseText });

    return new Response(JSON.stringify({ 
      success: true, 
      type,
      payload: testPayload,
      ghlStatus: response.status,
      ghlResponse: responseText 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
