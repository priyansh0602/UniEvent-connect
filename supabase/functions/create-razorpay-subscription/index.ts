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
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')
    const RAZORPAY_PLAN_ID = Deno.env.get('RAZORPAY_PLAN_ID') // NEW: Needs to be set in Supabase Secrets

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay keys are missing from Supabase Secrets")
    }

    if (!RAZORPAY_PLAN_ID) {
        throw new Error("Razorpay Plan ID is missing from Supabase Secrets")
    }

    // Basic Auth string for Razorpay
    const base64Auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // Create a subscription instead of an order
    const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id: RAZORPAY_PLAN_ID,
        total_count: 120, // 10 years of monthly billing, or 12 for 1 year, etc.
        customer_notify: 1 // Razorpay will send email to customer
      })
    });

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Razorpay API Error: ${res.status} ${errorText}`)
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
