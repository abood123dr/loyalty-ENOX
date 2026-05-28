import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Gift, UserPlus, Star, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const activities = [
  { icon: UserPlus, text: 'عميل جديد: فهد العتيبي', time: 'منذ دقيقتين', color: 'text-success bg-success/10' },
  { icon: CreditCard, text: 'ختم جديد: سارة العمري', time: 'منذ 5 دقائق', color: 'text-primary bg-primary/10' },
  { icon: Gift, text: 'استبدال مكافأة: خالد الحربي', time: 'منذ 12 دقيقة', color: 'text-warning bg-warning/10' },
  { icon: Star, text: 'ترقية VIP: نورة السالم', time: 'منذ 30 دقيقة', color: 'text-chart-5 bg-chart-5/10' },
  { icon: ArrowLeftRight, text: 'إحالة ناجحة: أحمد محمد', time: 'منذ ساعة', color: 'text-chart-2 bg-chart-2/10' },
  { icon: CreditCard, text: '10 نقاط: عبدالله الشهري', time: 'منذ ساعتين', color: 'text-primary bg-primary/10' },
];

export default function LiveActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-card rounded-2xl border border-border p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-foreground">النشاط المباشر</h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
          </span>
          <span className="text-xs text-muted-foreground">مباشر</span>
        </div>
      </div>
      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + idx * 0.05 }}
            className="flex items-center gap-3 py-2"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', activity.color)}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{activity.text}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}