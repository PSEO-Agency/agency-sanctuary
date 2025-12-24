import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateAgencyInviteRequest {
  email?: string;
  agencyName?: string;
  expiresInDays?: number;
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
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      throw new Error("Only super admins can create agency invites");
    }

    const { email, agencyName, expiresInDays = 7 }: CreateAgencyInviteRequest = await req.json();

    // Generate unique token
    const token_value = crypto.randomUUID() + "-" + crypto.randomUUID();
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create the invite record
    const { data: invite, error: insertError } = await supabaseAdmin
      .from("agency_invites")
      .insert({
        token: token_value,
        invite_type: "agency",
        inviting_user_id: user.id,
        email: email || null,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating invite:", insertError);
      throw insertError;
    }

    console.log("Agency invite created:", invite.id);

    // Build the invite URL
    const origin = req.headers.get("origin") || supabaseUrl.replace("supabase.co", "lovableproject.com");
    const inviteUrl = `${origin}/auth/agency-invite?token=${token_value}`;

    return new Response(
      JSON.stringify({
        success: true,
        inviteId: invite.id,
        inviteUrl,
        expiresAt: invite.expires_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-agency-invite:", error);
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
