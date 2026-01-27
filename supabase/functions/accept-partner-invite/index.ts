import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const { token, email, password, fullName, partnerName, country } = body;

    if (!token || !email || !password || !fullName || !partnerName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the invite token
    const { data: invite, error: inviteError } = await adminClient
      .from("agency_invites")
      .select("*")
      .eq("token", token)
      .eq("invite_type", "partner")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (inviteError || !invite) {
      console.error("Invalid invite:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired invite link" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If invite has email restriction, verify it matches
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "This invite is restricted to a different email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user account
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      console.error("Error creating user:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // Create the country partner record
    const { data: partnerData, error: partnerError } = await adminClient
      .from("country_partners")
      .insert({
        name: partnerName,
        country: country || null,
        owner_user_id: userId,
      })
      .select()
      .single();

    if (partnerError) {
      console.error("Error creating partner:", partnerError);
      // Clean up user if partner creation fails
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create partner record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user profile with country_partner role
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        role: "country_partner",
        onboarding_completed: true,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // Add role to user_roles table
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "country_partner",
        context_type: "country_partner",
        context_id: partnerData.id,
      });

    if (roleError) {
      console.error("Error adding user role:", roleError);
    }

    // Mark invite as accepted
    await adminClient
      .from("agency_invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
      })
      .eq("id", invite.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        partnerId: partnerData.id,
        userId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in accept-partner-invite:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
