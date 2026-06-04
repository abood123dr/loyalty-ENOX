import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const normalizePhone = (value: unknown) => String(value || '').replace(/[^\d+]/g, '').slice(0, 20);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    const { storeSlug, fullName, phone } = await req.json();
    const normalizedSlug = String(storeSlug || '').trim().toLowerCase();
    const safeFullName = String(fullName || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const safePhone = normalizePhone(phone);

    if (!/^[a-z0-9-]{1,80}$/.test(normalizedSlug)) {
      return Response.json({ error: 'Invalid store slug' }, { status: 400, headers: corsHeaders });
    }

    if (safeFullName.length < 2 || safePhone.length < 8) {
      return Response.json({ error: 'Name and phone are required' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id,slug,is_active')
      .eq('slug', normalizedSlug)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      return Response.json({ error: 'Store not found' }, { status: 404, headers: corsHeaders });
    }

    const customer = {
      id: crypto.randomUUID(),
      store_id: store.id,
      full_name: safeFullName,
      phone: safePhone,
      current_stamps: 0,
      total_stamps_earned: 0,
      total_rewards_redeemed: 0,
      wallet_type: 'web',
      is_active: true,
      wallet_pass_url: `${new URL(req.url).origin}/card/${store.slug}`,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('store_customers')
      .insert(customer)
      .select('id,store_id,full_name,phone,current_stamps,total_stamps_earned,total_rewards_redeemed,wallet_type,is_active,wallet_pass_url')
      .single();

    if (insertError?.code === '23505') {
      return Response.json({ error: 'Phone already registered' }, { status: 409, headers: corsHeaders });
    }

    if (insertError) throw insertError;

    const cardUrl = `${Deno.env.get('PUBLIC_APP_ORIGIN') || 'https://loyalty-enox.vercel.app'}/card/${store.slug}/${inserted.id}`;
    await supabase
      .from('store_customers')
      .update({ wallet_pass_url: cardUrl })
      .eq('id', inserted.id);

    return Response.json({
      customer: { ...inserted, wallet_pass_url: cardUrl },
      cardUrl,
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error.message || 'Unexpected error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
