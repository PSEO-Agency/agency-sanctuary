import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SEND-TO-GHL] ${step}${detailsStr}`);
};

interface GHLContactData {
  email: string;
  name: string;
  businessName: string;
  industry?: string;
  phone?: string;
  website?: string;
  companySize?: string;
  city?: string;
  country?: string;
  marketingConsent: boolean;
  subaccountId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow test requests with special header
  const isTestRequest = req.headers.get("x-test-request") === "true";

  try {
    logStep("Function started");

    const webhookUrl = Deno.env.get("GHL_WEBHOOK_URL");
    if (!webhookUrl) {
      throw new Error("GHL_WEBHOOK_URL is not configured");
    }
    logStep("Webhook URL verified");

    const contactData: GHLContactData = await req.json();
    logStep("Received contact data", { email: contactData.email, businessName: contactData.businessName });

    // Build the payload for GoHighLevel
    const ghlPayload = {
      email: contactData.email,
      name: contactData.name,
      firstName: contactData.name?.split(" ")[0] || "",
      lastName: contactData.name?.split(" ").slice(1).join(" ") || "",
      phone: contactData.phone || "",
      companyName: contactData.businessName,
      website: contactData.website || "",
      city: contactData.city || "",
      country: contactData.country || "",
      tags: [
        "PSEO Trial User",
        contactData.marketingConsent ? "Marketing Opted In" : "Marketing Opted Out",
        contactData.industry ? `Industry: ${contactData.industry}` : "",
        contactData.companySize ? `Size: ${contactData.companySize}` : "",
      ].filter(Boolean),
      customField: {
        industry: contactData.industry || "",
        company_size: contactData.companySize || "",
        marketing_consent: contactData.marketingConsent ? "yes" : "no",
        subaccount_id: contactData.subaccountId,
        signup_date: new Date().toISOString(),
        trial_type: "7-day free trial",
      },
      source: "PSEO Builder Signup",
    };

    logStep("Sending to GHL webhook", { payload: ghlPayload });

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ghlPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("GHL webhook error", { status: response.status, error: errorText });
      throw new Error(`GHL webhook returned ${response.status}: ${errorText}`);
    }

    logStep("Successfully sent to GHL");

    return new Response(
      JSON.stringify({ success: true, message: "Contact sent to GoHighLevel" }),
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
