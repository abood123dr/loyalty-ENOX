import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

const topCustomers = [
  { name: 'أحمد محمد', points: 2450, visits: 48, tier: 'platinum' },
  { name: 'سارة العمري', points: 1890, visits: 36, tier: 'gold' },
  { name: 'خالد الحربي', points: 1520, visits: 29, tier: 'gold' },
  { name: 'نورة السالم', points: 1200, visits: 24, tier: 'silver' },
  { name: 'عبدالله الشهري', points: 980, visits: 19, tier: 'silver' },
];

const tierColors = {
  platinum: 'bg-primary/10 text-primary border-primary/20',
  gold: 'bg-warning/10 text-warning border-warning/20',
  silver: 'bg-muted text-muted-foreground border-border',
  bronze: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
};

const tierLabels = {
  platinum: 'بلاتيني',
  gold: 'ذهبي',
  silver: 'فضي',
  bronze: 'برونزي',
};

export default function TopCustomers() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-2xl border border-border p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-foreground">أفضل العملاء</h3>
        <Crown className="w-5 h-5 text-warning" />
      </div>
      <div className="space-y-3">
        {topCustomers.map((customer, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + idx * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
              {idx + 1}
            </div>
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
                {customer.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{customer.name}</p>
              <p className="text-xs text-muted-foreground">{customer.visits} زيارة • {customer.points} نقطة</p>
            </div>
            <Badge variant="outline" className={tierColors[customer.tier]}>
              {tierLabels[customer.tier]}
            </Badge>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

