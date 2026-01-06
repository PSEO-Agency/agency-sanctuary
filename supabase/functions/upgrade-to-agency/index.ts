import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpgradeRequest {
  userId: string;
  agencyName: string;
  agencySlug: string;
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

    // Verify user is super_admin
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "super_admin") {
      throw new Error("Only super admins can upgrade users to agency");
    }

    const { userId, agencyName, agencySlug }: UpgradeRequest = await req.json();

    console.log("Upgrading user to agency:", { userId, agencyName, agencySlug });

    // Get the target user's current profile including their original subaccount
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*, sub_account_id")
      .eq("id", userId)
      .single();

    if (profileError || !targetProfile) {
      throw new Error("User not found");
    }

    const originalSubaccountId = targetProfile.sub_account_id;
    console.log("Original subaccount ID:", originalSubaccountId);

    // Create the new agency
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from("agencies")
      .insert({
        name: agencyName,
        slug: agencySlug,
        owner_user_id: userId,
      })
      .select()
      .single();

    if (agencyError) {
      console.error("Error creating agency:", agencyError);
      throw agencyError;
    }

    console.log("Agency created:", agency.id);

    // If user had a subaccount, transfer it to the new agency
    if (originalSubaccountId) {
      const { error: transferError } = await supabaseAdmin
        .from("subaccounts")
        .update({ agency_id: agency.id })
        .eq("id", originalSubaccountId);

      if (transferError) {
        console.error("Error transferring subaccount to new agency:", transferError);
        // Continue anyway, subaccount will remain with old agency
      } else {
        console.log("Subaccount transferred to new agency:", originalSubaccountId);
      }

      // Add/upsert sub_account_user role for the original subaccount
      const { error: subRoleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({
          user_id: userId,
          role: "sub_account_user",
          context_type: "subaccount",
          context_id: originalSubaccountId,
        }, {
          onConflict: "user_id,role,context_id",
          ignoreDuplicates: true,
        });

      if (subRoleError) {
        console.error("Error creating sub_account_user role:", subRoleError);
        // Don't throw, continue with upgrade
      } else {
        console.log("sub_account_user role preserved for:", originalSubaccountId);
      }
    }

    // Update the user's profile - keep sub_account_id for dual access, add new agency_id
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        agency_id: agency.id,
        role: "agency_admin", // Primary role becomes agency_admin
      })
      .eq("id", userId);

    if (updateProfileError) {
      console.error("Error updating profile:", updateProfileError);
      throw updateProfileError;
    }

    // Add agency_admin role to user_roles
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "agency_admin",
        context_type: "agency",
        context_id: agency.id,
      });

    if (roleError) {
      console.error("Error creating agency_admin role:", roleError);
      // Don't throw, profile role is sufficient
    }

    console.log("User upgraded to agency successfully with subaccount access preserved");

    return new Response(
      JSON.stringify({
        success: true,
        agencyId: agency.id,
        message: `User upgraded to agency "${agencyName}" successfully`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in upgrade-to-agency:", error);
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
