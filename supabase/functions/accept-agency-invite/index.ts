import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AcceptAgencyInviteRequest {
  token: string;
  email: string;
  password: string;
  fullName: string;
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

    const { token, email, password, fullName, agencyName, agencySlug }: AcceptAgencyInviteRequest = await req.json();

    console.log("Accepting agency invite:", { token, email, agencyName, agencySlug });

    // Validate the invite token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("agency_invites")
      .select("*")
      .eq("token", token)
      .eq("invite_type", "agency")
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

    // Create the agency
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

    // Update the user's profile with agency_id and role
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        agency_id: agency.id,
        role: "agency_admin",
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
        role: "agency_admin",
        context_type: "agency",
        context_id: agency.id,
      });

    if (roleError) {
      console.error("Error creating user role:", roleError);
      // Don't throw, profile role is sufficient
    }

    // Mark invite as accepted
    const { error: updateInviteError } = await supabaseAdmin
      .from("agency_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
        target_agency_id: agency.id,
      })
      .eq("id", invite.id);

    if (updateInviteError) {
      console.error("Error updating invite:", updateInviteError);
    }

    console.log("Agency invite accepted successfully");

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        agencyId: agency.id,
        message: "Agency created successfully. You can now log in.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in accept-agency-invite:", error);
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
