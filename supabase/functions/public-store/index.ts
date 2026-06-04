import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const publicStoreFields = `
  id,
  name,
  slug,
  logo_url,
  cover_url,
  description,
  card_bg_color,
  card_text_color,
  card_logo_url,
  stamp_active_color,
  stamp_inactive_color,
  stamp_icon,
  stamp_strip_url,
  stamps_required,
  reward_description,
  is_active
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    const { slug } = await req.json();
    const normalizedSlug = String(slug || '').trim().toLowerCase();

    if (!/^[a-z0-9-]{1,80}$/.test(normalizedSlug)) {
      return Response.json({ error: 'Invalid store slug' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    const { data: store, error } = await supabase
      .from('stores')
      .select(publicStoreFields)
      .eq('slug', normalizedSlug)
      .eq('is_active', true)
      .single();

    if (error || !store) {
      return Response.json({ error: 'Store not found' }, { status: 404, headers: corsHeaders });
    }

    const { is_active: _isActive, ...safeStore } = store;
    return Response.json({ store: safeStore }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error.message || 'Unexpected error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
