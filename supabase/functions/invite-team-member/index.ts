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

    // Generate a temporary password
    const tempPassword = crypto.randomUUID();

    // Create the user
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      throw createUserError;
    }

    console.log("User created successfully:", userData.user.id);

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

    console.log("Profile updated successfully");

    // Send password reset email so user can set their own password
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${req.headers.get("origin")}/auth`,
      },
    });

    if (resetError) {
      console.error("Error sending reset email:", resetError);
      // Don't throw - user is created, just log the error
    }

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
