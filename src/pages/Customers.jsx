import db from '@/api/base44Client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Copy,
  ExternalLink,
  Gift,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Smartphone,
  Stamp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const formatDate = (value) => {
  if (!value) return 'لا يوجد';
  return new Intl.DateTimeFormat('ar-SA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
};

const getCardUrl = (customer) => {
  if (customer.wallet_pass_url) return customer.wallet_pass_url;
  return `${window.location.origin}/card/${customer.id}`;
};

function SummaryCard({ title, value, sub, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    muted: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-medium">{title}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function WalletBadges({ customer }) {
  const hasWeb = customer.wallet_type === 'web' || customer.wallet_pass_url?.includes('/card/');
  const hasGoogle = Boolean(customer.google_wallet_object_id);
  const hasSamsung = Boolean(customer.samsung_wallet_ref_id);
  const hasApple = Boolean(customer.apple_wallet_serial_number);

  return (
    <div className="flex flex-wrap gap-1.5">
      {hasWeb && <Badge className="bg-primary/10 text-primary">Web</Badge>}
      {hasGoogle && <Badge className="bg-success/10 text-success">Google</Badge>}
      {hasSamsung && <Badge className="bg-sky-500/10 text-sky-700">Samsung</Badge>}
      {hasApple && <Badge className="bg-zinc-500/10 text-zinc-600">Apple</Badge>}
      {!hasWeb && !hasGoogle && !hasSamsung && !hasApple && <Badge className="bg-muted text-muted-foreground">بدون بطاقة</Badge>}
    </div>
  );
}

export default function Customers() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [notificationForm, setNotificationForm] = useState({ title: '', message: '' });
  const [notificationResult, setNotificationResult] = useState(null);

  const storeFilter = currentStore?.id ? { store_id: currentStore.id } : undefined;

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['store-customers', currentStore?.id],
    queryFn: () => storeFilter
      ? db.entities.StoreCustomer.filter(storeFilter, '-created_at', 500)
      : db.entities.StoreCustomer.list('-created_at', 500),
  });

  const stampsRequired = currentStore?.stamps_required || 10;

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.StoreCustomer.create({
      ...data,
      store_id: currentStore?.id || '',
      current_stamps: 0,
      total_stamps_earned: 0,
      total_rewards_redeemed: 0,
      wallet_type: 'web',
      is_active: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['store-customers', currentStore?.id]);
      setShowAdd(false);
      setForm({ full_name: '', phone: '' });
    },
  });

  const quickStampMutation = useMutation({
    mutationFn: async (customer) => {
      const isReward = (customer.current_stamps || 0) + 1 >= stampsRequired;
      const newStamps = isReward ? 0 : (customer.current_stamps || 0) + 1;

      await db.entities.StampScan.create({
        store_id: currentStore?.id,
        customer_id: customer.id,
        stamps_added: 1,
        is_reward: isReward,
        note: 'manual customer page action',
      });

      const updated = await db.entities.StoreCustomer.update(customer.id, {
        current_stamps: newStamps,
        total_stamps_earned: (customer.total_stamps_earned || 0) + 1,
        total_rewards_redeemed: isReward
          ? (customer.total_rewards_redeemed || 0) + 1
          : customer.total_rewards_redeemed,
        last_stamp_date: new Date().toISOString(),
      });

      return updated;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries(['store-customers', currentStore?.id]);
      queryClient.invalidateQueries(['store-scans', currentStore?.id]);
      setSelectedCustomer(updatedCustomer);
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ customer, title, message }) => {
      if (!currentStore?.id) {
        throw new Error('اختر متجر قبل إرسال الإشعار.');
      }
      if (!customer.google_wallet_object_id) {
        throw new Error('هذا العميل لم يضف البطاقة إلى Google Wallet بعد.');
      }

      const walletResult = await db.integrations.GoogleWallet.sendNotification({
        storeId: currentStore.id,
        customerId: customer.id,
        title,
        message,
      });

      await db.entities.Notification.create({
        store_id: currentStore.id,
        title,
        message,
        type: 'google_wallet',
        target: `customer:${customer.id}`,
        sent_count: walletResult?.sent || 0,
        status: walletResult?.failed ? 'partial' : 'sent',
      });

      return walletResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['notifications', currentStore?.id]);
      setNotificationResult({
        type: result?.failed ? 'warning' : 'success',
        text: `تم إرسال الإشعار إلى ${result?.sent || 0} بطاقة.${result?.failed ? ` فشل ${result.failed}.` : ''}`,
      });
      setNotificationForm({ title: '', message: '' });
    },
    onError: (error) => {
      setNotificationResult({
        type: 'error',
        text: error?.message || 'تعذر إرسال الإشعار.',
      });
    },
  });

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return customers;
    return customers.filter((customer) => (
      customer.full_name?.toLowerCase().includes(value)
      || customer.phone?.includes(value)
      || customer.email?.toLowerCase().includes(value)
    ));
  }, [customers, search]);

  const stats = useMemo(() => {
    const rewardReady = customers.filter((customer) => (customer.current_stamps || 0) >= stampsRequired - 1).length;
    return {
      total: customers.length,
      active: customers.filter((customer) => customer.is_active).length,
      rewardReady,
      walletUsers: customers.filter((customer) => (
        customer.google_wallet_object_id
        || customer.samsung_wallet_ref_id
        || customer.apple_wallet_serial_number
        || customer.wallet_pass_url
        || customer.wallet_type === 'web'
      )).length,
    };
  }, [customers, stampsRequired]);

  const openCard = (customer) => {
    window.open(getCardUrl(customer), '_blank', 'noopener,noreferrer');
  };

  const copyCardLink = async (customer) => {
    await navigator.clipboard?.writeText(getCardUrl(customer));
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setNotificationForm({ title: '', message: '' });
    setNotificationResult(null);
  };

  const handleSendCustomerNotification = () => {
    if (!selectedCustomer || !notificationForm.title.trim() || !notificationForm.message.trim()) return;

    sendNotificationMutation.mutate({
      customer: selectedCustomer,
      title: notificationForm.title.trim(),
      message: notificationForm.message.trim(),
    });
  };

  if (!currentStore) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">اختر متجر أولا</h2>
        <p className="mt-2 text-sm text-muted-foreground">بعد اختيار المتجر ستظهر قائمة العملاء والبطاقات الخاصة بهم.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">العملاء</h2>
          <p className="mt-1 text-sm text-muted-foreground">إدارة العملاء، الطوابع، وروابط البطاقات في {currentStore.name}</p>
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              إضافة عميل
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
            <div className="mt-2 space-y-4">
              <div>
                <Label>الاسم الكامل</Label>
                <Input className="mt-1" placeholder="أحمد محمد" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
              </div>
              <div>
                <Label>رقم الجوال</Label>
                <Input className="mt-1" placeholder="05XXXXXXXX" dir="ltr" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.full_name || !form.phone || createMutation.isPending}
              >
                {createMutation.isPending ? 'جاري الإضافة...' : 'إضافة العميل'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="إجمالي العملاء" value={stats.total.toLocaleString()} sub="داخل المتجر" icon={Users} />
        <SummaryCard title="عملاء نشطون" value={stats.active.toLocaleString()} sub="جاهزون للاستخدام" icon={UserCheck} tone="success" />
        <SummaryCard title="قريبون من المكافأة" value={stats.rewardReady.toLocaleString()} sub="آخر طابع أو مكتمل" icon={Gift} tone="warning" />
        <SummaryCard title="لديهم بطاقة" value={stats.walletUsers.toLocaleString()} sub="Web / Google / Samsung" icon={Wallet} tone="muted" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الجوال..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pr-10"
          />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} عميل</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 border-b border-border bg-muted/30 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>العميل</span>
          <span className="px-4 text-center">الطوابع</span>
          <span className="px-4 text-center">البطاقات</span>
          <span></span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">لا يوجد عملاء مطابقون</p>
          </div>
        ) : (
          filtered.map((customer, index) => {
            const currentStamps = customer.current_stamps || 0;
            const progress = Math.min((currentStamps / stampsRequired) * 100, 100);
            const rewardReady = currentStamps >= stampsRequired - 1;

            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-0 border-b border-border px-5 py-3.5 transition-colors last:border-0 hover:bg-muted/20"
              >
                <button type="button" onClick={() => handleSelectCustomer(customer)} className="flex min-w-0 items-center gap-3 text-right">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {customer.full_name?.[0] || 'ع'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{customer.full_name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </p>
                  </div>
                </button>

                <div className="w-36 px-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={cn('font-medium', rewardReady ? 'text-warning' : 'text-muted-foreground')}>
                      {currentStamps}/{stampsRequired}
                    </span>
                    {rewardReady && <Gift className="h-3.5 w-3.5 text-warning" />}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="px-4">
                  <WalletBadges customer={customer} />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleSelectCustomer(customer)}>
                      <UserCheck className="ml-2 h-4 w-4" />
                      عرض التفاصيل
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openCard(customer)}>
                      <ExternalLink className="ml-2 h-4 w-4" />
                      فتح البطاقة
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => quickStampMutation.mutate(customer)}>
                      <Stamp className="ml-2 h-4 w-4" />
                      إضافة طابع سريع
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            );
          })
        )}
      </div>

      <Dialog open={Boolean(selectedCustomer)} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-lg">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>تفاصيل العميل</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
                    {selectedCustomer.full_name?.[0] || 'ع'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{selectedCustomer.full_name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{selectedCustomer.phone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border p-3 text-center">
                    <p className="text-xl font-bold text-primary">{selectedCustomer.current_stamps || 0}</p>
                    <p className="text-xs text-muted-foreground">طوابع حالية</p>
                  </div>
                  <div className="rounded-xl border border-border p-3 text-center">
                    <p className="text-xl font-bold text-primary">{selectedCustomer.total_stamps_earned || 0}</p>
                    <p className="text-xs text-muted-foreground">إجمالي الطوابع</p>
                  </div>
                  <div className="rounded-xl border border-border p-3 text-center">
                    <p className="text-xl font-bold text-primary">{selectedCustomer.total_rewards_redeemed || 0}</p>
                    <p className="text-xs text-muted-foreground">مكافآت</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">آخر زيارة</span>
                    <span className="text-sm font-medium">{formatDate(selectedCustomer.last_stamp_date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">حالة العميل</span>
                    <Badge className={selectedCustomer.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                      {selectedCustomer.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">البطاقات</span>
                    <WalletBadges customer={selectedCustomer} />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => quickStampMutation.mutate(selectedCustomer)} disabled={quickStampMutation.isPending} className="gap-2">
                    <Stamp className="h-4 w-4" />
                    {quickStampMutation.isPending ? 'جاري الإضافة...' : 'إضافة طابع'}
                  </Button>
                  <Button variant="outline" onClick={() => openCard(selectedCustomer)} className="gap-2">
                    <Smartphone className="h-4 w-4" />
                    فتح البطاقة
                  </Button>
                  <Button variant="outline" onClick={() => copyCardLink(selectedCustomer)} className="gap-2">
                    <Copy className="h-4 w-4" />
                    نسخ الرابط
                  </Button>
                </div>

                <div className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">إرسال إشعار للعميل</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        يصل الإشعار داخل Google Wallet إذا كان العميل أضاف البطاقة.
                      </p>
                    </div>
                  </div>

                  {!selectedCustomer.google_wallet_object_id && (
                    <div className="rounded-xl border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
                      هذا العميل لا يملك بطاقة Google Wallet حاليا. أضف له Google Wallet أولا من صفحة البطاقات الرقمية.
                    </div>
                  )}

                  <div className="grid gap-3">
                    <div>
                      <Label>العنوان</Label>
                      <Input
                        className="mt-1"
                        placeholder="مثال: عرض اليوم"
                        value={notificationForm.title}
                        onChange={(event) => {
                          setNotificationForm({ ...notificationForm, title: event.target.value });
                          setNotificationResult(null);
                        }}
                        disabled={!selectedCustomer.google_wallet_object_id || sendNotificationMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label>الرسالة</Label>
                      <Input
                        className="mt-1"
                        placeholder="مثال: خصم خاص بانتظارك اليوم"
                        value={notificationForm.message}
                        onChange={(event) => {
                          setNotificationForm({ ...notificationForm, message: event.target.value });
                          setNotificationResult(null);
                        }}
                        disabled={!selectedCustomer.google_wallet_object_id || sendNotificationMutation.isPending}
                      />
                    </div>
                  </div>

                  {notificationResult && (
                    <div className={cn(
                      'rounded-xl border p-3 text-xs',
                      notificationResult.type === 'success' && 'border-success/20 bg-success/10 text-success',
                      notificationResult.type === 'warning' && 'border-warning/20 bg-warning/10 text-warning',
                      notificationResult.type === 'error' && 'border-destructive/20 bg-destructive/10 text-destructive',
                    )}>
                      {notificationResult.text}
                    </div>
                  )}

                  <Button
                    onClick={handleSendCustomerNotification}
                    disabled={
                      !selectedCustomer.google_wallet_object_id
                      || !notificationForm.title.trim()
                      || !notificationForm.message.trim()
                      || sendNotificationMutation.isPending
                    }
                    className="w-full gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {sendNotificationMutation.isPending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
                  </Button>
                </div>

                {(selectedCustomer.current_stamps || 0) >= stampsRequired - 1 && (
                  <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3 text-warning">
                    <CheckCircle className="h-4 w-4" />
                    <p className="text-sm font-medium">هذا العميل قريب من المكافأة أو جاهز لصرفها.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
