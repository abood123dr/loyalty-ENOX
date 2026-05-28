import React from 'react';
import { motion } from 'framer-motion';
import { Puzzle, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const integrations = [
  { name: 'Stripe', description: 'بوابة دفع إلكتروني عالمية', status: 'connected', category: 'دفع' },
  { name: 'Moyasar', description: 'بوابة دفع محلية سعودية', status: 'available', category: 'دفع' },
  { name: 'Twilio', description: 'إرسال SMS وإشعارات فورية', status: 'connected', category: 'تواصل' },
  { name: 'WhatsApp API', description: 'رسائل واتساب تجارية', status: 'connected', category: 'تواصل' },
  { name: 'Apple Wallet', description: 'بطاقات Apple Wallet', status: 'connected', category: 'محفظة' },
  { name: 'Google Wallet', description: 'بطاقات Google Wallet', status: 'available', category: 'محفظة' },
  { name: 'Google Maps', description: 'خرائط ومواقع الفروع', status: 'connected', category: 'خرائط' },
  { name: 'Google Reviews', description: 'تقييمات جوجل', status: 'available', category: 'تقييم' },
  { name: 'Zapier', description: 'أتمتة وربط التطبيقات', status: 'available', category: 'أتمتة' },
  { name: 'Make.com', description: 'سيناريوهات أتمتة متقدمة', status: 'available', category: 'أتمتة' },
];

export default function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">التكاملات</h2>
        <p className="text-muted-foreground text-sm mt-1">ربط منصتك مع الخدمات الخارجية</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((int, idx) => (
          <motion.div
            key={int.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Puzzle className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="secondary" className="text-xs">{int.category}</Badge>
            </div>
            <h3 className="font-semibold text-foreground mb-1">{int.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{int.description}</p>
            <div className="flex items-center justify-between">
              <Badge className={cn(
                int.status === 'connected' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              )}>
                {int.status === 'connected' ? (
                  <><Check className="w-3 h-3 ml-1" />متصل</>
                ) : 'متاح'}
              </Badge>
              <Button variant="ghost" size="sm" className="text-xs">
                {int.status === 'connected' ? 'إعدادات' : 'ربط'}
                <ExternalLink className="w-3 h-3 mr-1" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}