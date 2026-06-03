import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

const SAMSUNG_CARD_ID = Deno.env.get('SAMSUNG_WALLET_CARD_ID') || '3j6bs57krbpg0';

const uuidFromRefId = (refId: string) => {
  const clean = refId.replace(/[^a-fA-F0-9]/g, '').slice(0, 32);
  if (clean.length !== 32) return refId;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const cardsIndex = parts.lastIndexOf('cards');
    const cardId = cardsIndex >= 0 ? parts[cardsIndex + 1] : parts.at(-2);
    const refId = cardsIndex >= 0 ? parts[cardsIndex + 2] : parts.at(-1);
    const event = url.searchParams.get('event') || 'UNKNOWN';
    const cc2 = url.searchParams.get('cc2') || '';

    if (!cardId || !refId) {
      return Response.json({ error: 'cardId and refId are required' }, { status: 400, headers: corsHeaders });
    }
    if (cardId !== SAMSUNG_CARD_ID) {
      return Response.json({ error: 'Unknown Samsung Wallet cardId' }, { status: 404, headers: corsHeaders });
    }

    await req.json().catch(() => ({}));
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!);
    await supabase
      .from('store_customers')
      .update({
        wallet_type: event === 'DELETED' ? 'web' : 'samsung',
      })
      .eq('id', uuidFromRefId(refId));

    return Response.json({ ok: true, cardId, refId, event, cc2 }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
