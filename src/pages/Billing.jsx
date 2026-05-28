import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, Check, Crown, Zap, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Starter',
    nameAr: 'المبتدئ',
    price: '99',
    features: ['100 عميل', '1 فرع', '3 موظفين', 'بطاقة ولاء واحدة', 'إشعارات فورية', 'تقارير أساسية'],
    color: 'border-border',
    icon: Zap,
    current: false,
  },
  {
    name: 'Pro',
    nameAr: 'الاحترافي',
    price: '249',
    features: ['1,000 عميل', '5 فروع', '15 موظف', 'بطاقات غير محدودة', 'جميع قنوات الإشعارات', 'تحليلات متقدمة', 'مساعد ذكي', 'Apple & Google Wallet', 'API Access'],
    color: 'border-primary shadow-lg shadow-primary/10',
    icon: Crown,
    current: true,
    popular: true,
  },
  {
    name: 'Enterprise',
    nameAr: 'المؤسسات',
    price: '599',
    features: ['عملاء غير محدود', 'فروع غير محدودة', 'موظفين غير محدود', 'كل مميزات Pro', 'White Label', 'دعم مخصص', 'SLA مضمون', 'تكاملات مخصصة', 'مدير حساب مخصص'],
    color: 'border-border',
    icon: Building2,
    current: false,
  },
];

const invoices = [
  { id: 'INV-001', date: '2026-05-01', amount: '249', status: 'paid' },
  { id: 'INV-002', date: '2026-04-01', amount: '249', status: 'paid' },
  { id: 'INV-003', date: '2026-03-01', amount: '249', status: 'paid' },
  { id: 'INV-004', date: '2026-02-01', amount: '199', status: 'paid' },
];

export default function Billing() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">الاشتراك والفواتير</h2>
        <p className="text-muted-foreground text-sm mt-1">إدارة اشتراكك وعرض الفواتير</p>
      </div>

      {/* Current Plan */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-l from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Badge className="bg-primary text-primary-foreground mb-2">الخطة الحالية</Badge>
            <h3 className="text-xl font-bold text-foreground">الخطة الاحترافية (Pro)</h3>
            <p className="text-muted-foreground text-sm mt-1">التجديد التالي: 1 يونيو 2026</p>
          </div>
          <div className="text-left">
            <p className="text-3xl font-bold text-primary">249 <span className="text-sm font-normal text-muted-foreground">ر.س/شهر</span></p>
          </div>
        </div>
      </motion.div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn('bg-card rounded-2xl border-2 p-6 relative', plan.color)}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 right-6 bg-primary text-primary-foreground">الأكثر شعبية</Badge>
            )}
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <plan.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{plan.nameAr}</h3>
            <p className="text-3xl font-bold mt-2 text-foreground">{plan.price} <span className="text-sm font-normal text-muted-foreground">ر.س/شهر</span></p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button className={cn('w-full mt-6', plan.current ? 'bg-muted text-muted-foreground cursor-default' : 'bg-primary hover:bg-primary/90')} disabled={plan.current}>
              {plan.current ? 'خطتك الحالية' : 'ترقية'}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Invoices */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">سجل الفواتير</h3>
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{inv.id}</p>
                  <p className="text-xs text-muted-foreground">{inv.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{inv.amount} ر.س</span>
                <Badge className="bg-success/10 text-success">مدفوعة</Badge>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

