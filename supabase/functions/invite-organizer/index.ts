import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, universityId, invitedBy, universityName, siteUrl } = await req.json()

    if (!email || !universityId || !invitedBy) {
      throw new Error("Missing required fields: email, universityId, invitedBy")
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    const SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@unieventconnect.com'
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY is not set.")
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env vars missing.")

    // Use service role client to bypass RLS for insert
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Generate a secure token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID()

    // Check if invitation already exists for this email + university
    const { data: existing } = await supabaseAdmin
      .from('organizer_invitations')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .eq('university_id', universityId)
      .maybeSingle()

    if (existing && existing.status === 'accepted') {
      throw new Error("This organizer has already accepted the invitation.")
    }

    if (existing) {
      // Update existing pending invitation with new token
      await supabaseAdmin
        .from('organizer_invitations')
        .update({ token, created_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      // Insert new invitation
      const { error: insertError } = await supabaseAdmin
        .from('organizer_invitations')
        .insert({
          email: email.toLowerCase(),
          university_id: universityId,
          invited_by: invitedBy,
          token,
          status: 'pending'
        })

      if (insertError) throw insertError
    }

    // Build the invite link
    const baseUrl = siteUrl || 'https://unievent-connect.vercel.app'
    const inviteLink = `${baseUrl}/organizer-invite?token=${token}&email=${encodeURIComponent(email.toLowerCase())}`

    // Send email via Brevo
    const payload = {
      sender: { name: "UniEvent Connect", email: SENDER_EMAIL },
      to: [{ email: email.toLowerCase(), name: email.split('@')[0] }],
      subject: `You're Invited as an Organizer – ${universityName || 'UniEvent Connect'}`,
      htmlContent: `<html><body style="font-family: system-ui, sans-serif; background: #09090b; color: #fff; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #b91c1c, #dc2626); padding: 24px 28px;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #fff;">🎓 Organizer Invitation</h1>
            <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">${universityName || 'UniEvent Connect'}</p>
          </div>
          <div style="padding: 28px;">
            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6;">
              You have been invited to join as an <strong style="color: #fff;">Event Organizer</strong>. 
              Click the button below to set up your account and start managing events.
            </p>
            <a href="${inviteLink}" style="display: block; text-align: center; background: linear-gradient(135deg, #b91c1c, #dc2626); color: #fff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 24px 0;">
              Accept Invitation →
            </a>
            <p style="color: #71717a; font-size: 12px; margin-top: 20px; line-height: 1.5;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <span style="color: #a1a1aa; word-break: break-all;">${inviteLink}</span>
            </p>
          </div>
          <div style="border-top: 1px solid #27272a; padding: 16px 28px; text-align: center;">
            <p style="color: #52525b; font-size: 11px; margin: 0;">© 2026 UniEvent Connect. All rights reserved.</p>
          </div>
        </div>
      </body></html>`
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Brevo API Error: ${res.status} ${errorText}`)
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, ...data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
