import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AcceptSubaccountInviteRequest {
  token: string;
  email: string;
  password: string;
  fullName: string;
  businessName: string;
  businessSettings?: Record<string, any>;
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

    const { token, email, password, fullName, businessName, businessSettings = {} }: AcceptSubaccountInviteRequest = await req.json();

    console.log("Accepting subaccount invite:", { token, email, businessName });

    // Validate the invite token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("agency_invites")
      .select("*")
      .eq("token", token)
      .eq("invite_type", "subaccount")
      .eq("status", "pending")
      .single();

    if (inviteError || !invite) {
      throw new Error("Invalid or expired invite token");
    }

    // Check if invite has expired
    if (new Date(invite.expires_at) < new Date()) {
      throw new Error("This invite has expired");
    }

    // If invite has a specific email, verify it matches
    if (invite.email && invite.email !== email) {
      throw new Error("This invite was sent to a different email address");
    }

    if (!invite.target_agency_id) {
      throw new Error("Invalid invite: no agency associated");
    }

    // Create the user
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      throw createUserError;
    }

    const userId = userData.user.id;
    console.log("User created:", userId);

    // Wait for profile trigger
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create the subaccount
    const { data: subaccount, error: subaccountError } = await supabaseAdmin
      .from("subaccounts")
      .insert({
        agency_id: invite.target_agency_id,
        name: businessName,
        business_settings: {
          ...businessSettings,
          email,
        },
      })
      .select()
      .single();

    if (subaccountError) {
      console.error("Error creating subaccount:", subaccountError);
      throw subaccountError;
    }

    console.log("Subaccount created:", subaccount.id);

    // Update the user's profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        agency_id: invite.target_agency_id,
        sub_account_id: subaccount.id,
        role: "sub_account_user",
        full_name: fullName,
        onboarding_completed: true,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      throw profileError;
    }

    // Add user_role entry
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "sub_account_user",
        context_type: "subaccount",
        context_id: subaccount.id,
      });

    if (roleError) {
      console.error("Error creating user role:", roleError);
    }

    // Mark invite as accepted
    const { error: updateInviteError } = await supabaseAdmin
      .from("agency_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq("id", invite.id);

    if (updateInviteError) {
      console.error("Error updating invite:", updateInviteError);
    }

    // Trigger Airtable setup in background
    try {
      await supabaseAdmin.functions.invoke('setup-subaccount-airtable', {
        body: {
          subaccountId: subaccount.id,
          subaccountName: subaccount.name,
        }
      });
    } catch (setupErr) {
      console.error("Airtable setup failed (non-blocking):", setupErr);
    }

    console.log("Subaccount invite accepted successfully");

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        subaccountId: subaccount.id,
        message: "Account created successfully. You can now log in.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in accept-subaccount-invite:", error);
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
