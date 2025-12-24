import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TransferRequest {
  subaccountId: string;
  targetAgencyId: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get auth header to verify the requesting user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get the user's profile to verify they're an agency admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, agency_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "agency_admin" && profile?.role !== "super_admin") {
      throw new Error("Only agency admins can create transfer requests");
    }

    const { subaccountId, targetAgencyId, notes }: TransferRequest = await req.json();

    // Get the subaccount to verify ownership
    const { data: subaccount, error: subaccountError } = await supabaseAdmin
      .from("subaccounts")
      .select("agency_id, name")
      .eq("id", subaccountId)
      .single();

    if (subaccountError || !subaccount) {
      throw new Error("Subaccount not found");
    }

    // Verify the requesting user owns this subaccount (unless super_admin)
    if (profile?.role !== "super_admin" && subaccount.agency_id !== profile?.agency_id) {
      throw new Error("You can only transfer subaccounts from your own agency");
    }

    // Can't transfer to the same agency
    if (subaccount.agency_id === targetAgencyId) {
      throw new Error("Cannot transfer to the same agency");
    }

    // Check if there's already a pending transfer request for this subaccount
    const { data: existingRequest } = await supabaseAdmin
      .from("transfer_requests")
      .select("id")
      .eq("subaccount_id", subaccountId)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      throw new Error("There's already a pending transfer request for this subaccount");
    }

    // Create the transfer request
    const { data: transferRequest, error: insertError } = await supabaseAdmin
      .from("transfer_requests")
      .insert({
        subaccount_id: subaccountId,
        from_agency_id: subaccount.agency_id,
        to_agency_id: targetAgencyId,
        requested_by: user.id,
        notes: notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating transfer request:", insertError);
      throw insertError;
    }

    console.log("Transfer request created:", transferRequest.id);

    return new Response(
      JSON.stringify({
        success: true,
        requestId: transferRequest.id,
        message: "Transfer request created. Waiting for target agency approval.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-transfer-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
