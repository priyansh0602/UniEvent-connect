import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount } = await req.json() as { amount?: number }
    const requestedAmount = amount || 99;
    const amountInPaise = requestedAmount * 100;

    const data = {
      id: `mock_order_${crypto.randomUUID()}`,
      entity: 'order',
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${crypto.randomUUID().substring(0, 8)}`,
      status: 'created',
      created_at: Date.now(),
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
