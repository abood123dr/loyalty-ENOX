import db from '@/api/base44Client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import { Save, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const { currentStore, reloadStores, isSuperAdmin } = useStore();
  const [form, setForm] = useState({
    name: currentStore?.name || '',
    description: currentStore?.description || '',
    phone: currentStore?.phone || '',
    email: currentStore?.email || '',
    city: currentStore?.city || '',
    slug: currentStore?.slug || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data) => db.entities.Store.update(currentStore.id, data),
    onSuccess: reloadStores,
  });

  const handleSave = () => updateMutation.mutate(form);

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">الرجاء اختيار متجر أولاً</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">إعدادات المتجر</h2>
        <p className="text-sm text-muted-foreground mt-1">{currentStore.name}</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h3 className="font-semibold border-b border-border pb-3">معلومات المتجر</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>اسم المتجر</Label>
            <Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>رابط المتجر (Slug)</Label>
            <div className="flex mt-1">
              <span className="flex items-center px-3 text-xs bg-muted border border-l-0 border-input rounded-r-md text-muted-foreground whitespace-nowrap">/store/</span>
              <Input className="rounded-r-none" value={form.slug} dir="ltr" onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
            </div>
          </div>
          <div>
            <Label>رقم الجوال</Label>
            <Input className="mt-1" value={form.phone} dir="ltr" onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input className="mt-1" value={form.email} dir="ltr" onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>المدينة</Label>
            <Input className="mt-1" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
          </div>
        </div>

        <div>
          <Label>وصف المتجر</Label>
          <Input className="mt-1" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="pt-2">
          <p className="text-sm font-medium mb-2">رابط صفحة تسجيل العملاء</p>
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl">
            <Link2 className="w-4 h-4 text-primary shrink-0" />
            <code className="text-xs text-primary" dir="ltr">
              {window.location.origin}/store/{currentStore.slug || 'your-store'}
            </code>
          </div>
        </div>

        <Button className="bg-primary hover:bg-primary/90" onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="w-4 h-4 ml-2" />
          {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </motion.div>
    </div>
  );
}


