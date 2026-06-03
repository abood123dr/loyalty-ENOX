import db from '@/api/base44Client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Info,
  MonitorSmartphone,
  RefreshCw,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/useStore';

const toneClass = (tone) => {
  if (tone === 'success') return 'bg-success/10 text-success';
  if (tone === 'warning') return 'bg-warning/10 text-warning';
  if (tone === 'muted') return 'bg-muted text-muted-foreground';
  return 'bg-primary/10 text-primary';
};

export default function WalletPasses() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(null);

  const { data: customers = [] } = useQuery({
    queryKey: ['store-customers', currentStore?.id],
    queryFn: () => currentStore
      ? db.entities.StoreCustomer.filter({ store_id: currentStore.id }, '-created_at', 500)
      : db.entities.StoreCustomer.list('-created_at', 500),
  });

  const createWebCardMutation = useMutation({
    mutationFn: async (customer) => {
      const url = `${window.location.origin}/card/${customer.id}`;
      await db.entities.StoreCustomer.update(customer.id, {
        wallet_pass_url: url,
        wallet_type: 'web',
      });
      return url;
    },
    onSuccess: async (url) => {
      await queryClient.invalidateQueries({ queryKey: ['store-customers', currentStore?.id] });
      setMessage({ type: 'success', text: `تم تجهيز رابط البطاقة: ${url}` });
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error?.message || 'تعذر تجهيز رابط البطاقة.' });
    },
  });

  const googleWalletMutation = useMutation({
    mutationFn: (customer) => db.integrations.GoogleWallet.createPass({
      storeId: currentStore.id,
      customerId: customer.id,
    }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['store-customers', currentStore?.id] });
      window.open(result.saveUrl, '_blank');
      setMessage({ type: 'success', text: 'تم تجهيز رابط Google Wallet.' });
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error?.message || 'تعذر تجهيز Google Wallet.' });
    },
  });

  const samsungWalletMutation = useMutation({
    mutationFn: (customer) => db.integrations.SamsungWallet.createPass({
      storeId: currentStore.id,
      customerId: customer.id,
    }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['store-customers', currentStore?.id] });
      window.open(result.saveUrl, '_blank');
      setMessage({ type: 'success', text: 'تم تجهيز رابط Samsung Wallet.' });
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error?.message || 'تعذر تجهيز Samsung Wallet.' });
    },
  });

  const appleWalletMutation = useMutation({
    mutationFn: (customer) => db.integrations.AppleWallet.createPass({
      storeId: currentStore.id,
      customerId: customer.id,
    }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['store-customers', currentStore?.id] });
      if (result?.configured && result?.passUrl) {
        window.open(result.passUrl, '_blank');
      }
      setMessage({
        type: 'success',
        text: result?.configured
          ? 'تم تجهيز رابط Apple Wallet.'
          : `تم تجهيز بيانات Apple Wallet. المتبقي إضافة شهادة Apple في Supabase.${result?.missingSecrets?.length ? ` الحقول الناقصة: ${result.missingSecrets.join(', ')}` : ''}`,
      });
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error?.message || 'تعذر تجهيز Apple Wallet.' });
    },
  });

  const syncGoogleWalletMutation = useMutation({
    mutationFn: () => db.integrations.GoogleWallet.syncPass({ storeId: currentStore.id }),
    onSuccess: (result) => {
      setMessage({ type: 'success', text: `تم تحديث ${result?.updated || 0} بطاقة Google Wallet. قد يتأخر ظهور التحديث على الجوال قليلا.` });
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error?.message || 'تعذر مزامنة Google Wallet.' });
    },
  });

  const copyLink = async (url) => {
    await navigator.clipboard.writeText(url);
    setMessage({ type: 'success', text: 'تم نسخ رابط البطاقة.' });
  };

  const webCount = customers.filter((customer) => (
    customer.wallet_type === 'web' || customer.wallet_pass_url?.includes('/card/')
  )).length;
  const googleCount = customers.filter((customer) => customer.google_wallet_object_id).length;
  const samsungCount = customers.filter((customer) => (
    customer.wallet_type === 'samsung' || customer.samsung_wallet_ref_id
  )).length;
  const appleCount = customers.filter((customer) => customer.apple_wallet_serial_number).length;
  const withoutCard = customers.filter((customer) => (
    !customer.wallet_pass_url?.includes('/card/')
    && !customer.google_wallet_object_id
    && !customer.samsung_wallet_ref_id
    && !customer.apple_wallet_serial_number
    && (!customer.wallet_type || customer.wallet_type === 'none')
  )).length;

  const walletStatusCards = [
    {
      title: 'Google Wallet',
      count: googleCount,
      icon: CheckCircle,
      status: 'جاهز',
      description: 'الإصدار والمزامنة والإشعارات اليدوية وموقع المتجر مفعلة.',
      tone: 'success',
    },
    {
      title: 'Samsung Wallet',
      count: samsungCount,
      icon: Clock,
      status: 'بانتظار الاعتماد',
      description: 'الروابط والدوال جاهزة، والتشغيل الكامل ينتظر موافقة Samsung.',
      tone: 'warning',
    },
    {
      title: 'Apple Wallet',
      count: appleCount,
      icon: Smartphone,
      status: 'قيد التجهيز',
      description: 'تم تجهيز الحقول والدالة المبدئية. التشغيل الكامل يحتاج Pass Type ID وشهادة Apple.',
      tone: 'warning',
    },
    {
      title: 'Web Card',
      count: webCount,
      icon: MonitorSmartphone,
      status: 'مفعل',
      description: 'رابط بطاقة مباشر لكل عميل ويعمل بدون تطبيق محفظة.',
      tone: 'primary',
    },
  ];

  const summaryStats = [
    { label: 'بطاقات داخلية', count: webCount, icon: MonitorSmartphone },
    { label: 'Google Wallet', count: googleCount, icon: Wallet },
    { label: 'Samsung Wallet', count: samsungCount, icon: Wallet },
    { label: 'Apple Wallet', count: appleCount, icon: Smartphone },
    { label: 'بدون بطاقة', count: withoutCard, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">البطاقات الرقمية</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          إدارة بطاقات الطوابع وروابط Google Wallet وSamsung Wallet وApple Wallet.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!currentStore || syncGoogleWalletMutation.isPending} onClick={() => syncGoogleWalletMutation.mutate()}>
          <RefreshCw className={`ml-2 h-4 w-4 ${syncGoogleWalletMutation.isPending ? 'animate-spin' : ''}`} />
          {syncGoogleWalletMutation.isPending ? 'جاري المزامنة...' : 'مزامنة Google Wallet'}
        </Button>
      </div>

      {message && (
        <div className={`rounded-xl border p-3 text-sm ${
          message.type === 'error'
            ? 'border-destructive/20 bg-destructive/10 text-destructive'
            : 'border-success/20 bg-success/10 text-success'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        {walletStatusCards.map((item) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass(item.tone)}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <Badge variant="outline">{item.status}</Badge>
            </div>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-3xl font-bold">{item.count}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Info className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">ملاحظات التشغيل</p>
          <p className="text-sm text-muted-foreground">
            Google Wallet جاهز للتحديثات والإشعارات. Samsung Wallet ينتظر الموافقة. Apple Wallet تم تجهيز بنيته، ويحتاج شهادة Apple قبل إصدار ملفات pkpass.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {summaryStats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{stat.count}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold">العملاء وبطاقاتهم</h3>
        </div>

        {customers.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">لا يوجد عملاء بعد</div>
        ) : (
          customers.slice(0, 100).map((customer) => {
            const url = customer.wallet_pass_url?.includes('/card/')
              ? customer.wallet_pass_url
              : `${window.location.origin}/card/${customer.id}`;
            const hasWebCard = customer.wallet_type === 'web' || customer.wallet_pass_url?.includes('/card/');

            return (
              <div key={customer.id} className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5 last:border-0 hover:bg-muted/20">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {customer.full_name?.[0] || 'ع'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{customer.full_name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{customer.phone}</p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Badge className={hasWebCard ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                    {hasWebCard ? 'Web Card' : 'لا يوجد'}
                  </Badge>
                  {customer.google_wallet_object_id && <Badge className="bg-blue-500/10 text-blue-500">Google</Badge>}
                  {customer.samsung_wallet_ref_id && <Badge className="bg-indigo-500/10 text-indigo-500">Samsung</Badge>}
                  {customer.apple_wallet_serial_number && <Badge className="bg-zinc-500/10 text-zinc-600">Apple</Badge>}

                  <Button variant="secondary" size="sm" onClick={() => createWebCardMutation.mutate(customer)}>
                    {hasWebCard ? 'تحديث الرابط' : 'إنشاء بطاقة'}
                  </Button>
                  <Button variant="outline" size="sm" disabled={!currentStore || googleWalletMutation.isPending} onClick={() => googleWalletMutation.mutate(customer)}>
                    Google
                  </Button>
                  <Button variant="outline" size="sm" disabled={!currentStore || samsungWalletMutation.isPending} onClick={() => samsungWalletMutation.mutate(customer)}>
                    Samsung
                  </Button>
                  <Button variant="outline" size="sm" disabled={!currentStore || appleWalletMutation.isPending} onClick={() => appleWalletMutation.mutate(customer)}>
                    Apple
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copyLink(url)} title="نسخ الرابط">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => window.open(url, '_blank')} title="فتح البطاقة">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
