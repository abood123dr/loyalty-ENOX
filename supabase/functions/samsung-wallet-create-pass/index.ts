import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAMSUNG_PARTNER_ID = Deno.env.get('SAMSUNG_WALLET_PARTNER_ID') || '4150099841899138496';
const SAMSUNG_CARD_ID = Deno.env.get('SAMSUNG_WALLET_CARD_ID') || '3j6bs57krbpg0';
const SAMSUNG_CERTIFICATE_ID = Deno.env.get('SAMSUNG_WALLET_CERTIFICATE_ID') || '';

const refIdForCustomer = (customerId: string) => customerId.replaceAll('-', '').slice(0, 32);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { storeId, customerId } = await req.json();
    if (!storeId || !customerId) {
      return Response.json({ error: 'storeId and customerId are required' }, { status: 400, headers: corsHeaders });
    }
    if (!SAMSUNG_CERTIFICATE_ID) {
      return Response.json({
        error: 'SAMSUNG_WALLET_CERTIFICATE_ID is required before Samsung Wallet links can be generated.',
      }, { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!);
    const { data: customer, error: customerError } = await supabase
      .from('store_customers')
      .select('id,store_id,is_active')
      .eq('id', customerId)
      .eq('store_id', storeId)
      .single();
    if (customerError) throw customerError;
    if (!customer?.is_active) {
      return Response.json({ error: 'Customer is inactive' }, { status: 400, headers: corsHeaders });
    }

    const refId = refIdForCustomer(customer.id);
    const saveUrl = `https://a.swallet.link/atw/v3/${encodeURIComponent(SAMSUNG_CERTIFICATE_ID)}/${encodeURIComponent(SAMSUNG_CARD_ID)}#Clip?pdata=${encodeURIComponent(refId)}`;

    await supabase
      .from('store_customers')
      .update({
        samsung_wallet_ref_id: refId,
        samsung_wallet_save_url: saveUrl,
        wallet_type: 'samsung',
      })
      .eq('id', customer.id);

    return Response.json({
      saveUrl,
      refId,
      cardId: SAMSUNG_CARD_ID,
      partnerId: SAMSUNG_PARTNER_ID,
      certificateId: SAMSUNG_CERTIFICATE_ID,
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
