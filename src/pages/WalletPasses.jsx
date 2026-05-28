import db from '@/api/base44Client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import { Wallet, Apple, Smartphone, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function WalletPasses() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['store-customers', currentStore?.id],
    queryFn: () => currentStore
      ? db.entities.StoreCustomer.filter({ store_id: currentStore.id }, '-created_at', 500)
      : db.entities.StoreCustomer.list('-created_at', 500),
  });

  const issuePassMutation = useMutation({
    mutationFn: (customerId) => db.integrations.PassKit.createMemberPass({
      storeId: currentStore.id,
      customerId,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store-customers', currentStore?.id] }),
  });

  const passkitReady = Boolean(currentStore?.passkit_enabled && currentStore?.passkit_program_id);
  const appleCount = customers.filter(c => c.wallet_type === 'apple' || c.wallet_type === 'both').length;
  const googleCount = customers.filter(c => c.wallet_type === 'google' || c.wallet_type === 'both').length;
  const noneCount = customers.filter(c => c.wallet_type === 'none' || !c.wallet_type).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Wallet Passes</h2>
        <p className="text-sm text-muted-foreground mt-1">إدارة بطاقات Apple Wallet و Google Wallet عبر PassKit</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-1">تكامل PassKit</p>
          <p className="text-sm text-muted-foreground mb-3">
            {passkitReady
              ? 'PassKit مفعّل لهذا المتجر. يمكنك إصدار بطاقة Wallet لكل عميل من القائمة أدناه.'
              : 'فعّل PassKit من لوحة السوبر أدمن وأدخل Program ID لهذا المتجر قبل إصدار البطاقات.'}
          </p>
          <Badge className={passkitReady ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
            {passkitReady ? 'متصل' : 'غير متصل'}
          </Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Apple Wallet', count: appleCount, icon: Apple, color: 'text-foreground', bg: 'bg-muted' },
          { label: 'Google Wallet', count: googleCount, icon: Smartphone, color: 'text-chart-2', bg: 'bg-chart-2/10' },
          { label: 'بدون بطاقة', count: noneCount, icon: Wallet, color: 'text-muted-foreground', bg: 'bg-muted' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-card border border-border rounded-2xl p-5">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">العملاء وبطاقاتهم</h3>
        </div>
        {customers.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">لا يوجد عملاء بعد</div>
        ) : (
          customers.slice(0, 20).map((c) => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{c.full_name?.[0]}</div>
                <div>
                  <p className="text-sm font-medium">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{c.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={
                  c.wallet_type === 'apple' ? 'bg-muted text-foreground' :
                  c.wallet_type === 'google' ? 'bg-chart-2/10 text-chart-2' :
                  c.wallet_type === 'both' ? 'bg-primary/10 text-primary' :
                  'bg-muted text-muted-foreground'
                }>
                  {c.wallet_type === 'apple' ? 'Apple' :
                   c.wallet_type === 'google' ? 'Google' :
                   c.wallet_type === 'both' ? 'Apple + Google' : 'لا يوجد'}
                </Badge>
                {c.wallet_pass_url ? (
                  <Button variant="ghost" size="sm" onClick={() => window.open(c.wallet_pass_url, '_blank')}>
                    فتح البطاقة
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!passkitReady || issuePassMutation.isPending}
                    onClick={() => issuePassMutation.mutate(c.id)}
                  >
                    إصدار بطاقة
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
