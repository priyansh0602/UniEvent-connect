// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { eventTitle, studentName, studentEmail } = await req.json()

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    const SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@unieventconnect.com'

    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is not set.")
    }

    const payload = {
      sender: { name: "UniEvent Connect", email: SENDER_EMAIL },
      to: [{ email: studentEmail, name: studentName }],
      subject: `Registration Confirmed: ${eventTitle}`,
      htmlContent: `<html><body>
        <p>Hello ${studentName},</p>
        <p>You have successfully registered for <strong>"${eventTitle}"</strong>.</p>
        <p>Please check your Student Dashboard for more details and keep your ticket ready at the venue.</p>
        <br/>
        <p>Thanks,<br/>UniEvent Connect Team</p>
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
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
