import db, { supabase } from '@/api/base44Client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, CheckCircle, Apple, Smartphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StoreRegister() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState('form'); // form | success
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [newCustomer, setNewCustomer] = useState(null);
  const [walletPassUrl, setWalletPassUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadStore();
  }, [slug]);

  const loadStore = async () => {
    setLoading(true);
    const stores = await db.entities.Store.filter({ slug });
    if (stores.length === 0 || !stores[0].is_active) {
      setNotFound(true);
    } else {
      setStore(stores[0]);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      setError('الرجاء تعبئة جميع الحقول');
      return;
    }
    setError('');
    setSubmitting(true);

    const customer = {
      id: crypto.randomUUID(),
      store_id: store.id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      current_stamps: 0,
      total_stamps_earned: 0,
      total_rewards_redeemed: 0,
      is_active: true,
    };

    try {
      const { error: insertError } = await supabase
        .from('store_customers')
        .insert(customer);

      if (insertError) throw insertError;

      setNewCustomer(customer);
      setStep('success');

      if (store.passkit_enabled && store.passkit_program_id) {
        try {
          const pass = await db.integrations.PassKit.createMemberPass({
            storeId: store.id,
            customerId: customer.id,
          });
          setWalletPassUrl(pass?.passUrl || '');
        } catch (passError) {
          setError(passError?.message || 'تم التسجيل، لكن تعذر إصدار بطاقة Wallet.');
        }
      }
    } catch (submitError) {
      if (submitError?.code === '23505') {
        setError('هذا الرقم مسجّل مسبقاً في هذا المتجر');
      } else {
        setError(submitError?.message || 'تعذر التسجيل، حاول مرة أخرى');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <h2 className="text-xl font-bold mb-2">المتجر غير موجود</h2>
          <p className="text-muted-foreground">الرابط غير صحيح أو المتجر غير نشط</p>
        </div>
      </div>
    );
  }

  const bgColor = store?.card_bg_color || '#7C3AED';
  const textColor = store?.card_text_color || '#FFFFFF';
  const activeStampColor = store?.stamp_active_color || '#FFFFFF';
  const inactiveStampColor = store?.stamp_inactive_color || '#FFFFFF33';
  const stampIcon = {
    check: '✓',
    star: '★',
    heart: '♥',
    coffee: '☕',
    gift: '◆',
    none: '',
  }[store?.stamp_icon || 'check'];
  const stamps = store?.stamps_required || 10;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/40 flex flex-col items-center justify-start py-8 px-4">
      {/* Store Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Cover */}
        {store.cover_url && (
          <div className="w-full h-36 rounded-2xl overflow-hidden mb-4">
            <img src={store.cover_url} className="w-full h-full object-cover" alt="غلاف المتجر" />
          </div>
        )}

        {/* Store Info */}
        <div className="text-center mb-6">
          {store.card_logo_url || store.logo_url ? (
            <img src={store.card_logo_url || store.logo_url} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-lg" alt="شعار" />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold text-white mx-auto mb-3 shadow-lg"
              style={{ background: bgColor }}>
              {store.name?.[0]}
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
          {store.description && <p className="text-muted-foreground text-sm mt-1">{store.description}</p>}
        </div>

        {/* Stamp Card Preview */}
        <div className="rounded-2xl p-5 mb-6 shadow-xl" style={{ background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`, color: textColor }}>
          <div className="flex justify-between items-center mb-4">
            <p className="font-bold text-sm">بطاقة الطوابع</p>
            <p className="opacity-70 text-xs">اجمع {stamps} طوابع</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {Array.from({ length: stamps }).map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-white/40 flex items-center justify-center text-xs font-bold" style={{ background: i === 0 ? activeStampColor : inactiveStampColor, color: bgColor }}>
                {i === 0 ? stampIcon : ''}
              </div>
            ))}
          </div>
          <p className="text-xs opacity-80">{store.reward_description || 'احصل على مكافأة مجانية!'}</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-lg text-center">سجّل واحصل على بطاقتك الرقمية</h2>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 border border-destructive/20 p-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}

              <div>
                <Label>الاسم الكامل</Label>
                <div className="relative mt-1">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pr-10" placeholder="أحمد محمد" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>رقم الجوال</Label>
                <div className="relative mt-1">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pr-10" placeholder="05XXXXXXXX" dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                </div>
              </div>
              <Button className="w-full text-white font-semibold" style={{ background: bgColor }}
                onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'جاري التسجيل...' : 'تسجيل والحصول على البطاقة'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">لا حاجة لإنشاء حساب — فقط اسمك ورقمك</p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="font-bold text-xl">تم التسجيل بنجاح! 🎉</h2>
              <p className="text-muted-foreground text-sm">
                مرحباً <span className="font-semibold text-foreground">{newCustomer?.full_name}</span>!
                بطاقتك الرقمية جاهزة.
              </p>

              {/* Stamps Card Mini */}
              <div className="rounded-xl p-4" style={{ background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`, color: textColor }}>
                <p className="font-bold text-sm mb-2">{store.name}</p>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {Array.from({ length: stamps }).map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white/40 flex items-center justify-center text-xs font-bold" style={{ background: inactiveStampColor, color: bgColor }} />
                  ))}
                </div>
                <p className="opacity-80 text-xs">0/{stamps} طابع</p>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground font-medium">أضف بطاقتك إلى محفظتك</p>
                {error && (
                  <div className="text-xs text-warning bg-warning/10 border border-warning/20 p-2 rounded-lg">
                    {error}
                  </div>
                )}
                <Button
                  className="w-full gap-2 bg-black text-white hover:bg-black/90"
                  disabled={!walletPassUrl}
                  onClick={() => walletPassUrl && window.open(walletPassUrl, '_blank')}
                >
                  <Apple className="w-4 h-4" />Apple Wallet
                </Button>
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  disabled={!walletPassUrl}
                  onClick={() => walletPassUrl && window.open(walletPassUrl, '_blank')}
                >
                  <Smartphone className="w-4 h-4" />Google Wallet
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">اعرض هذه الصفحة للموظف عند كل زيارة لإضافة طابع</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}


