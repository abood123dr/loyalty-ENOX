import React from 'react';
import { motion } from 'framer-motion';
import { Star, Coffee, Car, Scissors, UtensilsCrossed, CreditCard, Users, Award, Wallet, Phone, Mail, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const tierColors = {
  platinum: { bg: 'from-slate-600 to-slate-800', text: 'text-slate-100', badge: 'بلاتيني' },
  gold: { bg: 'from-yellow-500 to-amber-600', text: 'text-yellow-50', badge: 'ذهبي' },
  silver: { bg: 'from-slate-400 to-slate-500', text: 'text-slate-50', badge: 'فضي' },
  bronze: { bg: 'from-orange-400 to-orange-600', text: 'text-orange-50', badge: 'برونزي' },
};

const templateIcons = {
  coffee: Coffee,
  car_wash: Car,
  barber: Scissors,
  restaurant_vip: UtensilsCrossed,
  membership: Users,
  custom: CreditCard,
};

// sampleCard design — only Super Admin can change this
const defaultCardDesign = {
  color: '#7C3AED',
  gradient: 'from-violet-600 to-purple-800',
  icon: 'coffee',
  stamps_required: 10,
  type: 'stamps',
  name: 'بطاقة الولاء',
  reward_description: 'مكافأة مجانية عند اكتمال النقاط',
};

export default function CustomerCardView({ customer, cardDesign = defaultCardDesign }) {
  const tier = tierColors[customer?.tier] || tierColors.bronze;
  const usedStamps = Math.min(customer?.total_visits || 0, cardDesign.stamps_required || 10);
  const totalStamps = cardDesign.stamps_required || 10;
  const IconComponent = templateIcons[cardDesign.icon] || CreditCard;

  return (
    <div className="space-y-4">
      {/* Loyalty Card Visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl overflow-hidden shadow-xl"
        style={{ background: `linear-gradient(135deg, ${cardDesign.color}ee, ${cardDesign.color}99)` }}
      >
        {/* Card Header */}
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/70 text-xs mb-0.5">بطاقة ولاء</p>
              <h3 className="text-white font-bold text-lg">{cardDesign.name}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Customer Info on Card */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {customer?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{customer?.full_name}</p>
              <Badge className={cn('text-xs mt-0.5 bg-white/20 text-white border-white/30')}>
                {tier.badge}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stamps Section */}
        {cardDesign.type === 'stamps' && (
          <div className="px-5 pb-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-white/70 text-xs mb-3">الأختام</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: totalStamps }).map((_, i) => (
                  <div key={i} className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                    i < usedStamps ? 'bg-white shadow-lg' : 'bg-white/20'
                  )}>
                    {i < usedStamps
                      ? <Star className="w-4 h-4 fill-current" style={{ color: cardDesign.color }} />
                      : <div className="w-2 h-2 rounded-full bg-white/40" />
                    }
                  </div>
                ))}
              </div>
              <p className="text-white/70 text-xs mt-3">{usedStamps} / {totalStamps} — {cardDesign.reward_description}</p>
            </div>
          </div>
        )}

        {/* Points Section */}
        {cardDesign.type === 'points' && (
          <div className="px-5 pb-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-white/70 text-xs mb-1">رصيد النقاط</p>
              <p className="text-white text-3xl font-bold">{customer?.total_points?.toLocaleString() || 0}</p>
              <p className="text-white/70 text-xs mt-1">{cardDesign.reward_description}</p>
            </div>
          </div>
        )}

        {/* Cashback Section */}
        {cardDesign.type === 'cashback' && (
          <div className="px-5 pb-4">
            <div className="bg-white/10 rounded-2xl p-4">
              <p className="text-white/70 text-xs mb-1">الاسترداد النقدي</p>
              <p className="text-white text-3xl font-bold">{cardDesign.cashback_percentage || 0}%</p>
              <p className="text-white/70 text-xs mt-1">{cardDesign.reward_description}</p>
            </div>
          </div>
        )}

        {/* Card Footer */}
        <div className="px-5 py-3 bg-black/10 flex items-center justify-between">
          <p className="text-white/60 text-xs">
            {customer?.wallet_status === 'apple' || customer?.wallet_status === 'both' ? '🍎 Apple Wallet' : ''}
            {customer?.wallet_status === 'google' || customer?.wallet_status === 'both' ? '  Google Wallet' : ''}
            {customer?.wallet_status === 'none' ? 'بدون محفظة رقمية' : ''}
          </p>
          <div className="flex gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={cn('rounded-full', i === 0 ? 'w-3 h-3 bg-white/60' : 'w-3 h-3 bg-white/30')} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Customer Details */}
      <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">بيانات العميل</p>
        {customer?.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span dir="ltr">{customer.phone}</span>
          </div>
        )}
        {customer?.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span dir="ltr">{customer.email}</span>
          </div>
        )}
        {customer?.last_visit && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>آخر زيارة: {customer.last_visit}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Award className="w-4 h-4 text-muted-foreground" />
          <span>إجمالي الزيارات: <strong>{customer?.total_visits || 0}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <span>النقاط المتاحة: <strong className="text-primary">{((customer?.total_points || 0) - (customer?.used_points || 0)).toLocaleString()}</strong></span>
        </div>
      </div>
    </div>
  );
}

