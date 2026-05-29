import db, { supabase } from '@/api/base44Client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, Phone, Smartphone, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DigitalStampCard from '@/components/wallet/DigitalStampCard';

export default function StoreRegister() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [newCustomer, setNewCustomer] = useState(null);
  const [cardUrl, setCardUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
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
    loadStore();
  }, [slug]);

  const handleSubmit = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) {
      setError('الرجاء تعبئة الاسم ورقم الجوال');
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
      wallet_type: 'web',
      is_active: true,
    };

    try {
      const { error: insertError } = await supabase.from('store_customers').insert(customer);
      if (insertError) throw insertError;

      const url = `${window.location.origin}/card/${customer.id}`;
      await supabase
        .from('store_customers')
        .update({ wallet_pass_url: url, wallet_type: 'web' })
        .eq('id', customer.id);

      setNewCustomer({ ...customer, wallet_pass_url: url });
      setCardUrl(url);
      setStep('success');

      if (store.passkit_enabled && store.passkit_program_id) {
        db.integrations.PassKit.createMemberPass({ storeId: store.id, customerId: customer.id })
          .catch((passError) => console.warn('PassKit issue failed; internal card is available.', passError));
      }
    } catch (submitError) {
      if (submitError?.code === '23505') {
        setError('هذا الرقم مسجل مسبقا في هذا المتجر');
      } else {
        setError(submitError?.message || 'تعذر التسجيل، حاول مرة أخرى');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <h2 className="mb-2 text-xl font-bold">المتجر غير موجود</h2>
          <p className="text-muted-foreground">الرابط غير صحيح أو المتجر غير نشط</p>
        </div>
      </div>
    );
  }

  const bgColor = store?.card_bg_color || '#7C3AED';
  const textColor = store?.card_text_color || '#FFFFFF';

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-background to-muted/40 px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        {store.cover_url && (
          <div className="mb-4 h-36 w-full overflow-hidden rounded-2xl">
            <img src={store.cover_url} className="h-full w-full object-cover" alt={store.name} />
          </div>
        )}

        <div className="mb-6 text-center">
          {store.card_logo_url || store.logo_url ? (
            <img src={store.card_logo_url || store.logo_url} className="mx-auto mb-3 h-16 w-16 rounded-2xl object-cover shadow-lg" alt={store.name} />
          ) : (
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-lg" style={{ background: bgColor }}>
              {store.name?.[0]}
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
          {store.description && <p className="mt-1 text-sm text-muted-foreground">{store.description}</p>}
        </div>

        <DigitalStampCard store={store} customer={{ full_name: 'عميل جديد', current_stamps: 0 }} value="preview" />

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
              <h2 className="text-center text-lg font-bold">سجل واحصل على بطاقتك الرقمية</h2>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <Label>الاسم الكامل</Label>
                <div className="relative mt-1">
                  <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pr-10" placeholder="أحمد محمد" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>رقم الجوال</Label>
                <div className="relative mt-1">
                  <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pr-10" placeholder="05XXXXXXXX" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
                </div>
              </div>

              <Button className="w-full font-semibold text-white" style={{ background: bgColor }} onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'جاري التسجيل...' : 'تسجيل وفتح البطاقة'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">لا حاجة لإنشاء حساب، فقط اسمك ورقمك</p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-xl font-bold">تم التسجيل بنجاح</h2>
              <p className="text-sm text-muted-foreground">
                مرحبا <span className="font-semibold text-foreground">{newCustomer?.full_name}</span>، بطاقتك الرقمية جاهزة.
              </p>

              <DigitalStampCard store={store} customer={newCustomer} value={newCustomer?.id} />

              <Button className="w-full gap-2 text-white" style={{ background: bgColor, color: textColor }} disabled={!cardUrl} onClick={() => window.open(cardUrl, '_blank')}>
                <Smartphone className="h-4 w-4" />
                فتح البطاقة
              </Button>
              <p className="text-xs text-muted-foreground">اعرض هذه البطاقة للموظف عند كل زيارة لإضافة طابع.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
