import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPER_ADMIN_EMAIL = Deno.env.get('SUPER_ADMIN_EMAIL') || 'lamhatc1@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ isSuperAdmin: false }, { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    const user = authData?.user;

    if (authError || !user) {
      return Response.json({ isSuperAdmin: false }, { status: 401, headers: corsHeaders });
    }

    const email = String(user.email || '').trim().toLowerCase();
    const metadataRole = String(
      user.app_metadata?.role || user.user_metadata?.role || '',
    ).toLowerCase();

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle();

    const isSuperAdmin = Boolean(profile?.is_super_admin)
      || email === SUPER_ADMIN_EMAIL.toLowerCase()
      || ['admin', 'super_admin'].includes(metadataRole);

    return Response.json({ isSuperAdmin }, { headers: corsHeaders });
  } catch (_error) {
    return Response.json({ isSuperAdmin: false }, { status: 500, headers: corsHeaders });
  }
});
