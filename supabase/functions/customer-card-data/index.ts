import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { customerId, storeSlug } = await req.json();

    if (!customerId) {
      return Response.json({ error: 'customerId is required' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!);

    const { data: customer, error: customerError } = await supabase
      .from('store_customers')
      .select(`
        id,
        store_id,
        full_name,
        phone,
        current_stamps,
        total_stamps_earned,
        total_rewards_redeemed,
        wallet_pass_url,
        google_wallet_object_id,
        samsung_wallet_ref_id,
        apple_wallet_serial_number,
        is_active
      `)
      .eq('id', customerId)
      .single();

    if (customerError || !customer?.is_active) {
      return Response.json({ error: 'Card not found' }, { status: 404, headers: corsHeaders });
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        slug,
        logo_url,
        cover_url,
        description,
        phone,
        city,
        is_active,
        card_bg_color,
        card_text_color,
        card_logo_url,
        stamp_active_color,
        stamp_inactive_color,
        stamp_icon,
        stamp_strip_url,
        stamps_required,
        reward_description
      `)
      .eq('id', customer.store_id)
      .single();

    if (storeError || !store?.is_active || (storeSlug && store.slug !== storeSlug)) {
      return Response.json({ error: 'Store not found' }, { status: 404, headers: corsHeaders });
    }

    return Response.json({ customer, store }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error.message || 'Unexpected error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
