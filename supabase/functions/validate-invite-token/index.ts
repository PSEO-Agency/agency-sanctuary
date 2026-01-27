import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateTokenRequest {
  token: string;
  inviteType: 'new_agency' | 'subaccount' | 'agency_subaccount' | 'partner';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, inviteType }: ValidateTokenRequest = await req.json();

    if (!token || !inviteType) {
      console.error('Missing required parameters: token or inviteType');
      return new Response(
        JSON.stringify({ error: 'Missing token or invite type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate invite type
    if (!['new_agency', 'subaccount', 'agency_subaccount', 'partner'].includes(inviteType)) {
      console.error('Invalid invite type:', inviteType);
      return new Response(
        JSON.stringify({ error: 'Invalid invite type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to bypass RLS and validate the token securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('Validating invite token for type:', inviteType);

    // Query the invite with service role (bypasses RLS)
    let query = supabaseAdmin
      .from('agency_invites')
      .select('id, email, expires_at, invite_type, status, target_agency_id, agencies:target_agency_id(name)')
      .eq('token', token)
      .eq('invite_type', inviteType)
      .eq('status', 'pending')
      .single();

    const { data: invite, error } = await query;

    if (error || !invite) {
      console.log('Token validation failed: Invalid or not found');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid or expired invite link' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      console.log('Token validation failed: Token expired');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'This invite link has expired' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Token validation successful for invite:', invite.id);

    // Return only non-sensitive data needed for the form
    // Note: We return the email if it was specified in the invite (for pre-filling)
    // but this is the intended behavior - the inviter specified this email
    const response: {
      valid: boolean;
      email?: string;
      agencyName?: string;
    } = {
      valid: true,
    };

    // Only include email if it was set (for pre-filling the form)
    if (invite.email) {
      response.email = invite.email;
    }

    // Include agency name for subaccount invites
    if ((inviteType === 'subaccount' || inviteType === 'agency_subaccount') && invite.agencies) {
      response.agencyName = (invite.agencies as any).name;
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error validating invite token:', err);
    return new Response(
      JSON.stringify({ valid: false, error: 'Failed to validate invite' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
