import db, { supabase } from '@/api/base44Client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { Lock, Palette, RefreshCw, Upload, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DigitalStampCard from '@/components/wallet/DigitalStampCard';
import { generateStampTierBlobs, stampTemplateOptions } from '@/lib/stampImageGenerator';

const defaultDesign = (store = {}) => ({
  card_bg_color: store.card_bg_color || '#4b2a25',
  card_text_color: store.card_text_color || '#ffffff',
  card_logo_url: store.card_logo_url || store.logo_url || '',
  stamp_strip_url: store.stamp_strip_url || '',
  stamp_active_color: store.stamp_active_color || '#d9b85f',
  stamp_inactive_color: store.stamp_inactive_color || '#ffffff33',
  stamp_icon: store.stamp_icon || 'coffee',
  stamps_required: store.stamps_required || 10,
  reward_description: store.reward_description || '',
});

export default function StampCards() {
  const { currentStore, isSuperAdmin, reloadStores } = useStore();
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState(defaultDesign(currentStore));
  const [error, setError] = useState('');
  const [stampTemplate, setStampTemplate] = useState('cafe');
  const [generatingImages, setGeneratingImages] = useState(false);

  const store = currentStore;
  const locked = store?.lock_card_design && !isSuperAdmin;
  const previewStore = { ...store, ...editData };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await db.entities.Store.update(store.id, {
        card_bg_color: data.card_bg_color || '#4b2a25',
        card_text_color: data.card_text_color || '#ffffff',
        card_logo_url: data.card_logo_url || null,
        stamp_strip_url: data.stamp_strip_url || null,
        stamp_active_color: data.stamp_active_color || '#d9b85f',
        stamp_inactive_color: data.stamp_inactive_color || '#ffffff33',
        stamp_icon: data.stamp_icon || 'coffee',
        stamps_required: Number(data.stamps_required) || 10,
        reward_description: data.reward_description || '',
      });
      return db.integrations.GoogleWallet.syncPass({ storeId: store.id });
    },
    onSuccess: () => {
      reloadStores();
      setShowEdit(false);
      setError('');
    },
    onError: (err) => setError(err.message || 'تعذر حفظ تصميم البطاقة.'),
  });

  const syncMutation = useMutation({
    mutationFn: () => db.integrations.GoogleWallet.syncPass({ storeId: store.id }),
    onSuccess: (result) => {
      setError(`تم إرسال تحديث Google Wallet إلى ${result?.updated || 0} بطاقة. قد يحتاج الظهور على الجوال من دقيقة إلى عدة دقائق.`);
    },
    onError: (err) => setError(err.message || 'تعذر مزامنة Google Wallet.'),
  });

  const uploadImage = async (field, file) => {
    if (!file) return;
    try {
      const result = await db.integrations.Core.UploadFile(file);
      setEditData((current) => ({ ...current, [field]: result.file_url }));
    } catch (err) {
      setError(err.message || 'تعذر رفع الصورة.');
    }
  };

  const generateImages = async () => {
    if (!store) return;
    setGeneratingImages(true);
    setError('');
    try {
      const generated = await generateStampTierBlobs({
        storeName: store.name,
        template: stampTemplate,
        cardBgColor: editData.card_bg_color,
        cardTextColor: editData.card_text_color,
        stampActiveColor: editData.stamp_active_color,
        stampInactiveColor: editData.stamp_inactive_color,
        totalStamps: editData.stamps_required,
      });
      const folder = `stamp-designs/${store.id}/${Date.now()}`;
      let patternUrl = '';

      for (const item of generated) {
        const path = `${folder}/stamp-${item.tier}.png`;
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(path, item.blob, { contentType: 'image/png', upsert: true });
        if (uploadError) throw uploadError;
        if (item.tier === 0) {
          const { data } = supabase.storage.from('uploads').getPublicUrl(path);
          patternUrl = data.publicUrl.replace('stamp-0.png', 'stamp-{stamp}.png');
        }
      }

      setEditData((current) => ({ ...current, stamp_strip_url: patternUrl }));
      setError('تم توليد صور الطوابع. اضغط حفظ حتى تتزامن مع Google Wallet.');
    } catch (err) {
      setError(err.message || 'تعذر توليد صور الطوابع.');
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleEdit = () => {
    setEditData(defaultDesign(store));
    setError('');
    setShowEdit(true);
  };

  if (!store) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">الرجاء اختيار متجر أولاً</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">تصميم بطاقة الطوابع</h2>
          <p className="text-sm text-muted-foreground mt-1">كل متجر له بطاقة وطوابع وتصميم مستقل.</p>
        </div>
        {!locked ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
              <RefreshCw className="w-4 h-4 ml-2" />
              {syncMutation.isPending ? 'جاري المزامنة...' : 'مزامنة Google Wallet'}
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleEdit}>
              <Palette className="w-4 h-4 ml-2" />تعديل التصميم
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2">
            <Lock className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">التصميم مقفل من مدير المنصة</span>
          </div>
        )}
      </div>

      {locked && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-4">
          <Lock className="w-5 h-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">السوبر أدمن فقط يستطيع تعديل تصميم هذه البطاقة.</p>
        </div>
      )}

      {error && !showEdit && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr] items-start">
        <div>
          <p className="mb-4 text-sm font-medium text-muted-foreground">معاينة البطاقة الحقيقية</p>
          <DigitalStampCard
            store={store}
            customer={{ full_name: 'عميل تجريبي', current_stamps: Math.min(2, store.stamps_required || 10) }}
            value={`${window.location.origin}/card/preview`}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold">الإعدادات الحالية</h3>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">عدد الطوابع</span>
              <span className="font-semibold">{store.stamps_required || 10}</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">المكافأة</span>
              <span className="max-w-[220px] truncate font-semibold">{store.reward_description || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">لون البطاقة</span>
              <span className="font-mono text-xs" dir="ltr">{store.card_bg_color || '#4b2a25'}</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-muted-foreground">شكل الطابع</span>
              <span className="font-semibold">{store.stamp_icon || 'coffee'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">صلاحية تعديل المتجر</span>
              <span className={locked ? 'font-medium text-destructive' : 'font-medium text-success'}>
                {locked ? 'مقفل' : 'مسموح'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل تصميم البطاقة</DialogTitle></DialogHeader>
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <DigitalStampCard
              store={previewStore}
              customer={{ full_name: 'عميل تجريبي', current_stamps: Math.min(2, Number(editData.stamps_required) || 10) }}
              value={`${window.location.origin}/card/preview`}
            />

            <div className="space-y-4">
              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>لون البطاقة</Label>
                  <div className="mt-1 flex gap-2">
                    <input type="color" className="h-9 w-10 rounded-md border border-input" value={editData.card_bg_color || '#4b2a25'} onChange={e => setEditData({ ...editData, card_bg_color: e.target.value })} />
                    <Input dir="ltr" value={editData.card_bg_color || ''} onChange={e => setEditData({ ...editData, card_bg_color: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>لون النص</Label>
                  <div className="mt-1 flex gap-2">
                    <input type="color" className="h-9 w-10 rounded-md border border-input" value={editData.card_text_color || '#ffffff'} onChange={e => setEditData({ ...editData, card_text_color: e.target.value })} />
                    <Input dir="ltr" value={editData.card_text_color || ''} onChange={e => setEditData({ ...editData, card_text_color: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>لون الطابع المكتمل</Label>
                  <div className="mt-1 flex gap-2">
                    <input type="color" className="h-9 w-10 rounded-md border border-input" value={editData.stamp_active_color || '#d9b85f'} onChange={e => setEditData({ ...editData, stamp_active_color: e.target.value })} />
                    <Input dir="ltr" value={editData.stamp_active_color || ''} onChange={e => setEditData({ ...editData, stamp_active_color: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>لون الطابع الفارغ</Label>
                  <div className="mt-1 flex gap-2">
                    <input type="color" className="h-9 w-10 rounded-md border border-input" value={(editData.stamp_inactive_color || '#ffffff33').slice(0, 7)} onChange={e => setEditData({ ...editData, stamp_inactive_color: e.target.value })} />
                    <Input dir="ltr" value={editData.stamp_inactive_color || ''} onChange={e => setEditData({ ...editData, stamp_inactive_color: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>عدد الطوابع</Label>
                  <Input className="mt-1" type="number" min={1} max={30} dir="ltr" value={editData.stamps_required || 10} onChange={e => setEditData({ ...editData, stamps_required: e.target.value })} />
                </div>
                <div>
                  <Label>شكل الطابع</Label>
                  <Select value={editData.stamp_icon || 'coffee'} onValueChange={value => setEditData({ ...editData, stamp_icon: value })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coffee">قهوة</SelectItem>
                      <SelectItem value="check">صح</SelectItem>
                      <SelectItem value="star">نجمة</SelectItem>
                      <SelectItem value="heart">قلب</SelectItem>
                      <SelectItem value="gift">هدية</SelectItem>
                      <SelectItem value="none">بدون رمز</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>وصف المكافأة</Label>
                <Input className="mt-1" value={editData.reward_description || ''} onChange={e => setEditData({ ...editData, reward_description: e.target.value })} />
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                <div>
                  <Label>لوجو البطاقة</Label>
                  <Input className="mt-1" dir="ltr" value={editData.card_logo_url || ''} onChange={e => setEditData({ ...editData, card_logo_url: e.target.value })} placeholder="https://..." />
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 text-sm">
                  <Upload className="h-4 w-4" />
                  رفع
                  <input type="file" accept="image/*" className="hidden" onChange={e => uploadImage('card_logo_url', e.target.files?.[0])} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                <div>
                  <Label>صورة الطوابع / الخلفية العلوية</Label>
                  <Input className="mt-1" dir="ltr" value={editData.stamp_strip_url || ''} onChange={e => setEditData({ ...editData, stamp_strip_url: e.target.value })} placeholder="https://..." />
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 text-sm">
                  <Upload className="h-4 w-4" />
                  رفع
                  <input type="file" accept="image/*" className="hidden" onChange={e => uploadImage('stamp_strip_url', e.target.files?.[0])} />
                </label>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                  <div>
                    <Label>مولد صور الطوابع حسب النشاط</Label>
                    <Select value={stampTemplate} onValueChange={setStampTemplate}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stampTemplateOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" onClick={generateImages} disabled={generatingImages}>
                    <Wand2 className="w-4 h-4 ml-2" />
                    {generatingImages ? 'جاري التوليد...' : 'توليد الصور'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  يولد 6 صور تلقائيا من 0 إلى 5 طوابع، ويجعل Google Wallet يغير الصورة حسب عدد الطوابع.
                </p>
              </div>

              <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => updateMutation.mutate(editData)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ تصميم البطاقة'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
