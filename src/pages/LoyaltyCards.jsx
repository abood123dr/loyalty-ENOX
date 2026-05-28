import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Plus, Coffee, Car, Scissors, UtensilsCrossed, Users, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const templateIcons = {
  coffee: Coffee,
  car_wash: Car,
  barber: Scissors,
  restaurant_vip: UtensilsCrossed,
  membership: Users,
  custom: CreditCard,
};

const typeLabels = {
  points: 'نقاط',
  stamps: 'أختام',
  cashback: 'استرداد نقدي',
  tier: 'مستويات',
  membership: 'عضوية',
};

const sampleCards = [
  { id: '1', name: 'بطاقة القهوة', type: 'stamps', card_template: 'coffee', stamps_required: 10, reward_description: 'قهوة مجانية', color: '#7C3AED', active_count: 342, total_issued: 520, is_active: true },
  { id: '2', name: 'بطاقة VIP', type: 'points', card_template: 'restaurant_vip', points_per_visit: 10, reward_description: 'خصم 20%', color: '#D97706', active_count: 189, total_issued: 300, is_active: true },
  { id: '3', name: 'بطاقة الحلاقة', type: 'stamps', card_template: 'barber', stamps_required: 5, reward_description: 'حلاقة مجانية', color: '#059669', active_count: 156, total_issued: 240, is_active: true },
  { id: '4', name: 'بطاقة غسيل السيارات', type: 'stamps', card_template: 'car_wash', stamps_required: 8, reward_description: 'غسلة مجانية', color: '#2563EB', active_count: 98, total_issued: 150, is_active: false },
  { id: '5', name: 'بطاقة الاسترداد', type: 'cashback', card_template: 'custom', cashback_percentage: 5, reward_description: '5% استرداد', color: '#DC2626', active_count: 267, total_issued: 400, is_active: true },
  { id: '6', name: 'العضوية الذهبية', type: 'membership', card_template: 'membership', reward_description: 'مزايا حصرية', color: '#7C3AED', active_count: 45, total_issued: 60, is_active: true },
];

// isSuperAdmin: في التطبيق الحقيقي تُقرأ من بيانات المستخدم. هنا نحاكي: true = سوبر أدمن، false = صاحب متجر
const IS_SUPER_ADMIN = true; // غيّره إلى false لترى قيود صاحب المتجر
const CARD_DESIGN_LOCKED = false; // يُقرأ من business.settings.lock_card_design

export default function LoyaltyCards() {
  const [showAdd, setShowAdd] = useState(false);

  const canEditDesign = IS_SUPER_ADMIN || !CARD_DESIGN_LOCKED;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">بطاقات الولاء</h2>
          <p className="text-muted-foreground text-sm mt-1">إدارة وتصميم بطاقات الولاء</p>
        </div>
        {canEditDesign ? (
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 ml-2" />
              بطاقة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء بطاقة ولاء</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>اسم البطاقة</Label>
                <Input placeholder="مثال: بطاقة القهوة" className="mt-1" />
              </div>
              <div>
                <Label>نوع البطاقة</Label>
                <Select defaultValue="stamps">
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">نقاط</SelectItem>
                    <SelectItem value="stamps">أختام</SelectItem>
                    <SelectItem value="cashback">استرداد نقدي</SelectItem>
                    <SelectItem value="tier">مستويات</SelectItem>
                    <SelectItem value="membership">عضوية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>وصف المكافأة</Label>
                <Input placeholder="مثال: قهوة مجانية عند اكتمال 10 أختام" className="mt-1" />
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90">إنشاء البطاقة</Button>
            </div>
          </DialogContent>
        </Dialog>
        ) : (
          <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2">
            <Lock className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">التصميم مقيّد من مدير المنصة</span>
          </div>
        )}
      </div>

      {/* Lock Notice for store owner */}
      {!IS_SUPER_ADMIN && CARD_DESIGN_LOCKED && (
        <div className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-2xl p-4">
          <Shield className="w-5 h-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">تصميم البطاقات محمي</p>
            <p className="text-xs text-muted-foreground">مدير المنصة قيّد تعديل تصميم بطاقات الولاء. تواصل معه لأي تغييرات.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sampleCards.map((card, idx) => {
          const IconComponent = templateIcons[card.card_template] || CreditCard;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
            >
              <div className="h-28 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${card.color}20, ${card.color}40)` }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <IconComponent className="w-12 h-12 opacity-20" style={{ color: card.color }} />
                </div>
                <div className="absolute top-3 left-3">
                  <Badge className={cn(card.is_active ? 'bg-success/90 text-white' : 'bg-muted text-muted-foreground')}>
                    {card.is_active ? 'نشطة' : 'معطلة'}
                  </Badge>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                    <IconComponent className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                  <h3 className="font-semibold text-foreground">{card.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{card.reward_description}</p>
                <Badge variant="outline" className="mb-4">{typeLabels[card.type]}</Badge>
                <div className="flex items-center justify-between text-sm pt-3 border-t border-border">
                  <span className="text-muted-foreground">نشطة: <span className="font-semibold text-foreground">{card.active_count}</span></span>
                  <span className="text-muted-foreground">إجمالي: <span className="font-semibold text-foreground">{card.total_issued}</span></span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

