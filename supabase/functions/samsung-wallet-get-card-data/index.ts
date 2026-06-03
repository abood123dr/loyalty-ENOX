import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
};

const SAMSUNG_CARD_ID = Deno.env.get('SAMSUNG_WALLET_CARD_ID') || '3j6bs57krbpg0';
const APP_ORIGIN = Deno.env.get('PUBLIC_APP_ORIGIN') || 'https://loyalty-enox.vercel.app';

const uuidFromRefId = (refId: string) => {
  const clean = refId.replace(/[^a-fA-F0-9]/g, '').slice(0, 32);
  if (clean.length !== 32) return refId;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
};

const imageUrl = (store: Record<string, unknown>) => {
  const logo = String(store.card_logo_url || store.logo_url || '');
  if (/^https?:\/\//i.test(logo)) return logo;
  return `${APP_ORIGIN}/wallet/stamp-tiers/preview.png`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const cardsIndex = parts.lastIndexOf('cards');
    const cardId = cardsIndex >= 0 ? parts[cardsIndex + 1] : parts.at(-2);
    const refId = cardsIndex >= 0 ? parts[cardsIndex + 2] : parts.at(-1);

    if (!cardId || !refId) {
      return Response.json({ error: 'cardId and refId are required' }, { status: 400, headers: corsHeaders });
    }
    if (cardId !== SAMSUNG_CARD_ID) {
      return Response.json({ error: 'Unknown Samsung Wallet cardId' }, { status: 404, headers: corsHeaders });
    }

    const customerId = uuidFromRefId(refId);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!);

    const { data: customer, error: customerError } = await supabase
      .from('store_customers')
      .select('id,store_id,full_name,phone,current_stamps,total_stamps_earned,is_active,created_at,updated_at')
      .eq('id', customerId)
      .single();
    if (customerError) throw customerError;
    if (!customer?.is_active) {
      return Response.json({ error: 'Customer is inactive' }, { status: 404, headers: corsHeaders });
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id,name,slug,description,stamps_required,reward_description,card_bg_color,card_text_color,logo_url,card_logo_url,updated_at')
      .eq('id', customer.store_id)
      .single();
    if (storeError) throw storeError;

    const total = Number(store.stamps_required || 10);
    const current = Number(customer.current_stamps || 0);
    const cardUrl = `${APP_ORIGIN}/card/${store.slug}/${customer.id}`;
    const createdAt = new Date(customer.created_at || Date.now()).getTime();
    const updatedAt = new Date(customer.updated_at || store.updated_at || Date.now()).getTime();

    const payload = {
      card: {
        type: 'loyalty',
        subType: 'others',
        data: [
          {
            refId,
            createdAt,
            updatedAt,
            language: 'en',
            attributes: {
              title: `${String(store.name || 'ENOX').slice(0, 24)} Loyalty`,
              subtitle1: `${current}/${total} stamps`,
              logoImage: imageUrl(store),
              'logoImage.lightUrl': imageUrl(store),
              'logoImage.darkUrl': imageUrl(store),
              providerName: String(store.name || 'ENOX').slice(0, 32),
              noticeDesc: `<ul><li>${String(store.reward_description || `Collect ${total} stamps to unlock your reward.`).replace(/[<>]/g, '')}</li></ul>`,
              appLinkLogo: imageUrl(store),
              appLinkName: 'Open ENOX Card',
              appLinkData: cardUrl,
              bgColor: String(store.card_bg_color || '#7C3AED').slice(0, 8),
              fontColor: 'light',
              'barcode.value': cardUrl,
              'barcode.serialType': 'QRCODE',
              'barcode.ptFormat': 'QRCODE',
              'barcode.ptSubFormat': 'QR_CODE',
              amount: `${customer.total_stamps_earned || current}P`,
              balance: `${current}/${total}`,
              summaryUrl: cardUrl,
              user: String(customer.full_name || '').slice(0, 64),
              merchantName: String(store.name || 'ENOX').slice(0, 32),
            },
          },
        ],
      },
      account: {
        type: 'phoneNumber',
        value: String(customer.phone || customer.id).slice(0, 64),
      },
    };

    return Response.json(payload, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500, headers: corsHeaders });
  }
});
