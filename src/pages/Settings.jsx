import db from '@/api/base44Client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import { Copy, Gift, Link2, Palette, Save, Settings as SettingsIcon, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DigitalStampCard from '@/components/wallet/DigitalStampCard';

const sanitizeSlug = (value) => value
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-');

const storeToForm = (store) => ({
  name: store?.name || '',
  description: store?.description || '',
  phone: store?.phone || '',
  email: store?.email || '',
  city: store?.city || '',
  slug: store?.slug || '',
  stamps_required: store?.stamps_required || 10,
  reward_description: store?.reward_description || '',
  card_bg_color: store?.card_bg_color || '#7C3AED',
  card_text_color: store?.card_text_color || '#FFFFFF',
  stamp_active_color: store?.stamp_active_color || '#FFFFFF',
  stamp_inactive_color: store?.stamp_inactive_color || '#FFFFFF33',
});

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex gap-2">
        <input
          type="color"
          className="h-10 w-11 shrink-0 cursor-pointer rounded-md border border-input bg-background"
          value={(value || '#000000').slice(0, 7)}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input dir="ltr" value={value || ''} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

export default function Settings() {
  const { currentStore, reloadStores } = useStore();
  const [form, setForm] = useState(() => storeToForm(currentStore));
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setForm(storeToForm(currentStore));
    setMessage(null);
  }, [currentStore?.id]);

  const registrationUrl = useMemo(() => (
    `${window.location.origin}/store/${form.slug || currentStore?.slug || 'your-store'}`
  ), [form.slug, currentStore?.slug]);

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.Store.update(currentStore.id, {
      ...data,
      slug: sanitizeSlug(data.slug),
      stamps_required: Math.max(1, Number(data.stamps_required) || 10),
    }),
    onSuccess: async () => {
      await reloadStores();
      setMessage({ type: 'success', text: 'تم حفظ إعدادات المتجر.' });
    },
    onError: (error) => {
      setMessage({ type: 'error', text: error?.message || 'تعذر حفظ الإعدادات.' });
    },
  });

  const handleSave = () => {
    setMessage(null);
    updateMutation.mutate(form);
  };

  const copyRegistrationLink = async () => {
    await navigator.clipboard?.writeText(registrationUrl);
    setMessage({ type: 'success', text: 'تم نسخ رابط تسجيل العملاء.' });
  };

  if (!currentStore) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold">اختر متجر أولا</h2>
          <p className="mt-2 text-sm text-muted-foreground">بعد اختيار المتجر تقدر تعدل معلوماته وإعدادات البطاقة.</p>
        </div>
      </div>
    );
  }

  const previewStore = {
    ...currentStore,
    ...form,
    stamps_required: Number(form.stamps_required) || 10,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">إعدادات المتجر</h2>
          <p className="mt-1 text-sm text-muted-foreground">تحكم بمعلومات المتجر، رابط التسجيل، وعدد الطوابع والمكافأة.</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </div>

      {message && (
        <div className={`rounded-xl border p-3 text-sm ${
          message.type === 'error'
            ? 'border-destructive/20 bg-destructive/10 text-destructive'
            : 'border-success/20 bg-success/10 text-success'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">معلومات المتجر</h3>
                <p className="text-xs text-muted-foreground">هذه البيانات تظهر في صفحة التسجيل والبطاقة الرقمية.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>اسم المتجر</Label>
                <Input className="mt-1" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div>
                <Label>رابط المتجر</Label>
                <div className="mt-1 flex">
                  <span className="flex items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-xs text-muted-foreground">/store/</span>
                  <Input
                    className="rounded-r-none"
                    value={form.slug}
                    dir="ltr"
                    onChange={(event) => setForm({ ...form, slug: sanitizeSlug(event.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>رقم الجوال</Label>
                <Input className="mt-1" value={form.phone} dir="ltr" onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input className="mt-1" value={form.email} dir="ltr" onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div>
                <Label>المدينة</Label>
                <Input className="mt-1" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
              </div>
              <div>
                <Label>وصف قصير</Label>
                <Input className="mt-1" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </div>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">الطوابع والمكافأة</h3>
                <p className="text-xs text-muted-foreground">حدد متى يحصل العميل على المكافأة وماذا تظهر له البطاقة.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div>
                <Label>عدد الطوابع</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="1"
                  max="30"
                  dir="ltr"
                  value={form.stamps_required}
                  onChange={(event) => setForm({ ...form, stamps_required: event.target.value })}
                />
              </div>
              <div>
                <Label>وصف المكافأة</Label>
                <Input
                  className="mt-1"
                  placeholder="مثال: مشروب مجاني بعد 10 زيارات"
                  value={form.reward_description}
                  onChange={(event) => setForm({ ...form, reward_description: event.target.value })}
                />
              </div>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">ألوان البطاقة</h3>
                <p className="text-xs text-muted-foreground">اختر ألوان البطاقة والطوابع حسب هوية المتجر.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ColorField label="لون البطاقة" value={form.card_bg_color} onChange={(value) => setForm({ ...form, card_bg_color: value })} />
              <ColorField label="لون النص" value={form.card_text_color} onChange={(value) => setForm({ ...form, card_text_color: value })} />
              <ColorField label="لون الطابع المكتمل" value={form.stamp_active_color} onChange={(value) => setForm({ ...form, stamp_active_color: value })} />
              <ColorField label="لون الطابع الفارغ" value={form.stamp_inactive_color} onChange={(value) => setForm({ ...form, stamp_inactive_color: value })} />
            </div>
          </motion.section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">رابط تسجيل العملاء</h3>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <code className="block break-all text-xs text-primary" dir="ltr">{registrationUrl}</code>
            </div>
            <Button variant="outline" className="mt-3 w-full gap-2" onClick={copyRegistrationLink}>
              <Copy className="h-4 w-4" />
              نسخ الرابط
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold">معاينة البطاقة</h3>
            <DigitalStampCard
              store={previewStore}
              customer={{ full_name: 'عميل تجريبي', current_stamps: Math.min(2, Number(form.stamps_required) || 10) }}
              value={`${window.location.origin}/card/${form.slug || 'store'}/preview`}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
