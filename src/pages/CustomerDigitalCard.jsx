import db from '@/api/base44Client';

import React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Gift, Phone, RotateCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DigitalStampCard from '@/components/wallet/DigitalStampCard';

export default function CustomerDigitalCard() {
  const { customerId } = useParams();
  const [walletError, setWalletError] = React.useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['customer-digital-card', customerId],
    queryFn: async () => {
      const customer = await db.entities.StoreCustomer.get(customerId);
      const store = await db.entities.Store.get(customer.store_id);
      return { customer, store };
    },
    enabled: Boolean(customerId),
  });

  const googleWalletMutation = useMutation({
    mutationFn: () => db.integrations.GoogleWallet.createPass({
      storeId: data.store.id,
      customerId: data.customer.id,
    }),
    onSuccess: (result) => {
      setWalletError('');
      window.open(result.saveUrl, '_blank');
    },
    onError: (err) => setWalletError(err.message || 'تعذر إنشاء بطاقة Google Wallet'),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  if (error || !data?.customer || !data?.store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-white">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-black">البطاقة غير متاحة</h1>
          <p className="mt-2 text-sm text-white/65">تأكد من الرابط أو اطلب من المتجر إعادة إرسال رابط البطاقة.</p>
        </div>
      </div>
    );
  }

  const { customer, store } = data;
  const remaining = Math.max((store.stamps_required || 10) - (customer.current_stamps || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <Button variant="ghost" className="gap-2 text-white hover:bg-white/10 hover:text-white" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            رجوع
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => refetch()} disabled={isFetching}>
            <RotateCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <DigitalStampCard store={store} customer={customer} value={`${window.location.origin}/card/${customer.id}`} />

        <Button
          className="mt-5 w-full gap-2 bg-white text-neutral-950 hover:bg-white/90"
          onClick={() => googleWalletMutation.mutate()}
          disabled={googleWalletMutation.isPending}
        >
          <Smartphone className="h-4 w-4" />
          {googleWalletMutation.isPending ? 'جاري تجهيز Google Wallet...' : 'Add to Google Wallet'}
        </Button>
        {walletError && (
          <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
            {walletError}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-white/60">المتجر</div>
              <div className="font-bold">{store.name}</div>
            </div>
            <div className="text-left">
              <div className="text-sm text-white/60">المتبقي للمكافأة</div>
              <div className="text-2xl font-black">{remaining}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-white/70" dir="ltr">
            <Phone className="h-4 w-4" />
            {customer.phone}
          </div>
          {remaining === 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-sm font-bold text-emerald-200">
              <Gift className="h-4 w-4" />
              مبروك، بطاقتك جاهزة للمكافأة.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
