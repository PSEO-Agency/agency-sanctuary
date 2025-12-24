import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HandleTransferRequest {
  requestId: string;
  action: "accept" | "reject";
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

    // Get the user's profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, agency_id")
      .eq("id", user.id)
      .single();

    const { requestId, action }: HandleTransferRequest = await req.json();

    // Get the transfer request
    const { data: transferRequest, error: requestError } = await supabaseAdmin
      .from("transfer_requests")
      .select("*, subaccount:subaccounts(name)")
      .eq("id", requestId)
      .eq("status", "pending")
      .single();

    if (requestError || !transferRequest) {
      throw new Error("Transfer request not found or already processed");
    }

    // Verify the user can handle this request (must be admin of target agency or super_admin)
    if (profile?.role !== "super_admin" && transferRequest.to_agency_id !== profile?.agency_id) {
      throw new Error("You can only handle transfer requests to your agency");
    }

    if (action === "accept") {
      // Transfer the subaccount
      const { error: transferError } = await supabaseAdmin
        .from("subaccounts")
        .update({ agency_id: transferRequest.to_agency_id })
        .eq("id", transferRequest.subaccount_id);

      if (transferError) {
        console.error("Error transferring subaccount:", transferError);
        throw transferError;
      }

      // Update users associated with this subaccount
      const { error: updateUsersError } = await supabaseAdmin
        .from("profiles")
        .update({ agency_id: transferRequest.to_agency_id })
        .eq("sub_account_id", transferRequest.subaccount_id);

      if (updateUsersError) {
        console.error("Error updating user profiles:", updateUsersError);
      }
    }

    // Update the transfer request status
    const { error: updateError } = await supabaseAdmin
      .from("transfer_requests")
      .update({
        status: action === "accept" ? "accepted" : "rejected",
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating transfer request:", updateError);
      throw updateError;
    }

    console.log(`Transfer request ${action}ed:`, requestId);

    return new Response(
      JSON.stringify({
        success: true,
        message: action === "accept" 
          ? "Subaccount transferred successfully" 
          : "Transfer request rejected",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in handle-transfer-request:", error);
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
