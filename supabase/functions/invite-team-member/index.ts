import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  fullName: string;
  subaccountId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, fullName, subaccountId }: InviteRequest = await req.json();

    console.log("Inviting user:", { email, fullName, subaccountId });

    // Use inviteUserByEmail which sends an invitation email automatically
    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${req.headers.get("origin")}/auth`,
        data: {
          full_name: fullName,
        },
      }
    );

    if (inviteError) {
      console.error("Error inviting user:", inviteError);
      throw inviteError;
    }

    console.log("User invited successfully:", userData.user.id);

    // Wait a moment for the profile to be created by the trigger
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update the profile with subaccount_id
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        sub_account_id: subaccountId,
        full_name: fullName,
      })
      .eq("id", userData.user.id);

    if (updateProfileError) {
      console.error("Error updating profile:", updateProfileError);
      throw updateProfileError;
    }

    console.log("Profile updated with subaccount_id successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User invited successfully. They will receive an email to set their password.",
        userId: userData.user.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in invite-team-member function:", error);
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
