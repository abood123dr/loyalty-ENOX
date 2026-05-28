import db from '@/api/base44Client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import { Users, Stamp, Gift, QrCode, Store } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const weekData = [
  { day: 'السبت', scans: 14 },
  { day: 'الأحد', scans: 22 },
  { day: 'الاثنين', scans: 18 },
  { day: 'الثلاثاء', scans: 30 },
  { day: 'الأربعاء', scans: 25 },
  { day: 'الخميس', scans: 41 },
  { day: 'الجمعة', scans: 35 },
];

function StatCard({ title, value, sub, icon, color, index }) {
  const Icon = icon;
  const colors = {
    purple: 'bg-primary/10 text-primary',
    green: 'bg-success/10 text-success',
    blue: 'bg-chart-2/10 text-chart-2',
    orange: 'bg-warning/10 text-warning',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

export default function Dashboard() {
  const { currentStore, isSuperAdmin, allStores } = useStore();

  const storeFilter = currentStore ? { store_id: currentStore.id } : undefined;

  const { data: customers = [] } = useQuery({
    queryKey: ['store-customers', currentStore?.id],
    queryFn: () => storeFilter
      ? db.entities.StoreCustomer.filter(storeFilter, '-created_date', 1000)
      : db.entities.StoreCustomer.list('-created_date', 1000),
    enabled: true,
  });

  const { data: scans = [] } = useQuery({
    queryKey: ['store-scans', currentStore?.id],
    queryFn: () => storeFilter
      ? db.entities.StampScan.filter(storeFilter, '-created_date', 1000)
      : db.entities.StampScan.list('-created_date', 1000),
    enabled: true,
  });

  const todayScans = scans.filter(s => {
    const d = new Date(s.created_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const rewards = scans.filter(s => s.is_reward).length;

  const stats = [
    { title: 'إجمالي العملاء', value: customers.length.toLocaleString(), sub: 'عبر المتجر', icon: Users, color: 'purple' },
    { title: 'طوابع اليوم', value: todayScans.toLocaleString(), sub: 'عدد السكانات اليوم', icon: QrCode, color: 'blue' },
    { title: 'إجمالي السكانات', value: scans.length.toLocaleString(), sub: 'منذ البداية', icon: Stamp, color: 'green' },
    { title: 'مكافآت مُستردّة', value: rewards.toLocaleString(), sub: 'بطاقات اكتملت', icon: Gift, color: 'orange' },
    ...(isSuperAdmin ? [{ title: 'المتاجر المشتركة', value: allStores.length.toLocaleString(), sub: `${allStores.filter(s => s.subscription_status === 'active').length} نشط`, icon: Store, color: 'purple' }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {currentStore ? `لوحة تحكم — ${currentStore.name}` : isSuperAdmin ? 'لوحة إدارة المنصة' : 'لوحة التحكم'}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على أداء نظام الطوابع</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} index={i} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="font-semibold text-foreground mb-1">السكانات هذا الأسبوع</h3>
          <p className="text-xs text-muted-foreground mb-5">عدد مرات مسح QR يومياً</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="سكانات" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Customers */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="font-semibold text-foreground mb-1">أكثر العملاء نشاطاً</h3>
          <p className="text-xs text-muted-foreground mb-4">بناءً على الطوابع المجموعة</p>
          {customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">لا يوجد عملاء بعد</div>
          ) : (
            <div className="space-y-3">
              {[...customers]
                .sort((a, b) => (b.total_stamps_earned || 0) - (a.total_stamps_earned || 0))
                .slice(0, 5)
                .map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {c.full_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{c.full_name}</p>
                        <p className="text-[11px] text-muted-foreground" dir="ltr">{c.phone}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-primary">{c.current_stamps || 0}</p>
                      <p className="text-[10px] text-muted-foreground">طابع</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}


