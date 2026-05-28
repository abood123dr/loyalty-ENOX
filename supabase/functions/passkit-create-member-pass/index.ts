import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const apiBaseByRegion: Record<string, string> = {
  eu: 'https://api.pub1.passkit.io',
  us: 'https://api.pub2.passkit.io',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { storeId, customerId } = await req.json();
    if (!storeId || !customerId) {
      return Response.json({ error: 'storeId and customerId are required' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = Deno.env.get('PASSKIT_API_TOKEN');
    if (!token) {
      return Response.json({ error: 'PASSKIT_API_TOKEN is not configured' }, { status: 500, headers: corsHeaders });
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id,name,slug,stamps_required,reward_description,passkit_program_id,passkit_tier_id,passkit_enabled')
      .eq('id', storeId)
      .single();
    if (storeError) throw storeError;

    const { data: customer, error: customerError } = await supabase
      .from('store_customers')
      .select('*')
      .eq('id', customerId)
      .eq('store_id', storeId)
      .single();
    if (customerError) throw customerError;

    const { data: integration } = await supabase
      .from('passkit_integrations')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    const programId = integration?.program_id || store.passkit_program_id;
    const tierId = integration?.tier_id || store.passkit_tier_id;
    const apiBase = apiBaseByRegion[integration?.region || 'eu'];

    if (!programId) {
      return Response.json({ error: 'PassKit program_id is not configured for this store' }, { status: 400, headers: corsHeaders });
    }

    const externalId = `${store.slug}-${customer.id}`;
    const passkitPayload = {
      programId,
      tierId,
      externalId,
      forename: customer.full_name,
      surname: '',
      mobileNumber: customer.phone,
      emailAddress: customer.email,
      points: customer.current_stamps || 0,
      metaData: {
        storeId,
        customerId,
        currentStamps: String(customer.current_stamps || 0),
        stampsRequired: String(store.stamps_required || 10),
        reward: store.reward_description || '',
        dynamicUrl: `${req.headers.get('origin') || ''}/store/${store.slug}`,
      },
    };

    const passkitResponse = await fetch(`${apiBase}/members/member`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passkitPayload),
    });

    const passkitBody = await passkitResponse.json().catch(() => ({}));
    if (!passkitResponse.ok) {
      return Response.json({ error: 'PassKit request failed', details: passkitBody }, { status: passkitResponse.status, headers: corsHeaders });
    }

    const passId = passkitBody.id || passkitBody.memberId || passkitBody?.response?.id;
    const passUrl = passkitBody.url || passkitBody.passUrl || passkitBody?.response?.url;

    await supabase
      .from('store_customers')
      .update({
        wallet_pass_id: passId,
        wallet_pass_url: passUrl,
        wallet_type: 'both',
      })
      .eq('id', customerId);

    return Response.json({ passId, passUrl, raw: passkitBody }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
