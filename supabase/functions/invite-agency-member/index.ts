import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteAgencyMemberRequest {
  email: string;
  fullName: string;
  role: "agency_admin" | "sub_account_user";
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

    // Get the user's profile to get their agency
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, agency_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "agency_admin" && profile?.role !== "super_admin") {
      throw new Error("Only agency admins can invite team members");
    }

    if (!profile.agency_id) {
      throw new Error("User not associated with an agency");
    }

    const { email, fullName, role }: InviteAgencyMemberRequest = await req.json();

    console.log("Inviting agency member:", { email, fullName, role, agencyId: profile.agency_id });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      console.log("User already exists:", existingUser.id);
      userId = existingUser.id;

      // Update the profile with agency_id
      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          agency_id: profile.agency_id,
          role: role,
          full_name: fullName,
        })
        .eq("id", userId);

      if (updateProfileError) {
        console.error("Error updating profile:", updateProfileError);
        throw updateProfileError;
      }
    } else {
      // Invite the user
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

      userId = userData.user.id;
      console.log("User invited:", userId);

      // Wait for profile trigger
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update the profile
      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          agency_id: profile.agency_id,
          role: role,
          full_name: fullName,
        })
        .eq("id", userId);

      if (updateProfileError) {
        console.error("Error updating profile:", updateProfileError);
        throw updateProfileError;
      }
    }

    // Add user_role entry
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: role,
        context_type: "agency",
        context_id: profile.agency_id,
      });

    if (roleError) {
      console.error("Error creating user role:", roleError);
      // Don't throw, continue
    }

    console.log("Agency member invited successfully");

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        message: existingUser 
          ? "User added to agency successfully."
          : "User invited successfully. They will receive an email to set their password.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in invite-agency-member:", error);
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
