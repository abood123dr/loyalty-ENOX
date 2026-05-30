import db, { supabase } from '@/api/base44Client';

import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion } from 'framer-motion';
import {
  Shield, Building2, Plus, MoreHorizontal, CheckCircle, XCircle, Lock, Search,
  Edit, Trash2, Crown, Star, Globe, UserPlus, Palette, Save, Stamp, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { normalizeEmail, SUPER_ADMIN_EMAIL } from '@/lib/roles';
import { generateStampTierImages, stampTemplateOptions } from '@/lib/stampImageGenerator';

const planColors = {
  starter: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/10 text-primary',
  enterprise: 'bg-warning/10 text-warning',
};
const planLabels = { starter: 'مبتدئ', pro: 'احترافي', enterprise: 'مؤسسي' };
const statusColors = {
  trial: 'bg-blue-500/10 text-blue-500',
  active: 'bg-success/10 text-success',
  expired: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};
const statusLabels = { trial: 'تجريبي', active: 'نشط', expired: 'منتهي', cancelled: 'ملغي' };

const emptyForm = {
  name: '',
  slug: '',
  email: '',
  phone: '',
  city: '',
  owner_name: '',
  owner_email: '',
  owner_password: '',
  subscription_plan: 'starter',
  subscription_status: 'trial',
  stamps_required: 10,
  reward_description: 'مشروبك العاشر مجانا!',
  card_bg_color: '#7C3AED',
  card_text_color: '#FFFFFF',
  card_logo_url: '',
  stamp_active_color: '#FFFFFF',
  stamp_inactive_color: '#FFFFFF33',
  stamp_icon: 'check',
  stamp_strip_url: '',
  lock_card_design: true,
  is_active: true,
};

const slugify = (value) => value
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '');

const storePayload = (data, slugOverride) => ({
  name: data.name,
  slug: slugOverride || slugify(data.slug || data.name),
  email: normalizeEmail(data.email),
  phone: data.phone,
  city: data.city,
  owner_name: data.owner_name,
  owner_email: normalizeEmail(data.owner_email),
  subscription_plan: data.subscription_plan,
  subscription_status: data.subscription_status,
  stamps_required: Number(data.stamps_required) || 10,
  reward_description: data.reward_description,
  card_bg_color: data.card_bg_color || '#7C3AED',
  card_text_color: data.card_text_color || '#FFFFFF',
  card_logo_url: data.card_logo_url || null,
  stamp_active_color: data.stamp_active_color || '#FFFFFF',
  stamp_inactive_color: data.stamp_inactive_color || '#FFFFFF33',
  stamp_icon: data.stamp_icon || 'check',
  stamp_strip_url: data.stamp_strip_url || null,
  lock_card_design: Boolean(data.lock_card_design),
  is_active: Boolean(data.is_active),
});

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

function StoreForm({ form, setForm, submitLabel, isPending, onSubmit }) {
  return (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>اسم المتجر</Label>
          <Input className="mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>الرابط (Slug)</Label>
          <Input
            className="mt-1"
            dir="ltr"
            value={form.slug}
            onChange={e => setForm({ ...form, slug: slugify(e.target.value) })}
            placeholder="my-store"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>بريد المتجر</Label>
          <Input className="mt-1" dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>الجوال</Label>
          <Input className="mt-1" dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>اسم مالك المتجر</Label>
          <Input className="mt-1" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
        </div>
        <div>
          <Label>بريد مالك المتجر</Label>
          <Input className="mt-1" dir="ltr" value={form.owner_email} onChange={e => setForm({ ...form, owner_email: e.target.value })} />
        </div>
      </div>

      {'owner_password' in form && (
        <div>
          <Label>كلمة مرور مالك المتجر</Label>
          <Input
            type="password"
            className="mt-1"
            dir="ltr"
            value={form.owner_password}
            onChange={e => setForm({ ...form, owner_password: e.target.value })}
            placeholder="ضع كلمة مرور مؤقتة"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>خطة الاشتراك</Label>
          <Select value={form.subscription_plan} onValueChange={v => setForm({ ...form, subscription_plan: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">مبتدئ</SelectItem>
              <SelectItem value="pro">احترافي</SelectItem>
              <SelectItem value="enterprise">مؤسسي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>حالة الاشتراك</Label>
          <Select value={form.subscription_status} onValueChange={v => setForm({ ...form, subscription_status: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">تجريبي</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="expired">منتهي</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>عدد الطوابع</Label>
          <Input type="number" min={1} className="mt-1" dir="ltr" value={form.stamps_required} onChange={e => setForm({ ...form, stamps_required: e.target.value })} />
        </div>
        <div>
          <Label>لون البطاقة</Label>
          <div className="flex gap-2 mt-1">
            <input type="color" className="w-10 h-9 rounded-md border border-input cursor-pointer" value={form.card_bg_color || '#7C3AED'} onChange={e => setForm({ ...form, card_bg_color: e.target.value })} />
            <Input dir="ltr" value={form.card_bg_color || ''} onChange={e => setForm({ ...form, card_bg_color: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>لون النص</Label>
          <div className="flex gap-2 mt-1">
            <input type="color" className="w-10 h-9 rounded-md border border-input cursor-pointer" value={form.card_text_color || '#FFFFFF'} onChange={e => setForm({ ...form, card_text_color: e.target.value })} />
            <Input dir="ltr" value={form.card_text_color || ''} onChange={e => setForm({ ...form, card_text_color: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>وصف المكافأة</Label>
          <Input className="mt-1" value={form.reward_description || ''} onChange={e => setForm({ ...form, reward_description: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/5 border border-destructive/20">
        <div>
          <p className="text-sm font-medium">قفل تصميم البطاقة</p>
          <p className="text-xs text-muted-foreground">عند التفعيل، صاحب المتجر لا يستطيع تعديل التصميم.</p>
        </div>
        <Switch checked={Boolean(form.lock_card_design)} onCheckedChange={v => setForm({ ...form, lock_card_design: v })} className="data-[state=checked]:bg-destructive" />
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">المحافظ الرقمية لهذا المتجر</p>
          <p className="text-xs text-muted-foreground">التصميم يعمل الآن على بطاقة الويب و Google Wallet. Apple Wallet و Samsung Wallet سيتم إضافتهم لاحقاً.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-success/10 text-success border-success/20" variant="outline">Web Card مفعل</Badge>
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20" variant="outline">Google Wallet متاح</Badge>
          <Badge className="bg-muted text-muted-foreground" variant="outline">Apple Wallet لاحقاً</Badge>
          <Badge className="bg-muted text-muted-foreground" variant="outline">Samsung Wallet لاحقاً</Badge>
        </div>
      </div>

      <Button className="w-full bg-primary hover:bg-primary/90" onClick={onSubmit} disabled={!form.name || !form.slug || isPending}>
        {isPending ? 'جاري الحفظ...' : submitLabel}
      </Button>
    </div>
  );
}

function StampCardPreview({ design }) {
  const stamps = Math.max(1, Math.min(Number(design.stamps_required) || 10, 30));
  const bgColor = design.card_bg_color || '#7C3AED';
  const textColor = design.card_text_color || '#FFFFFF';
  const activeStampColor = design.stamp_active_color || '#FFFFFF';
  const inactiveStampColor = design.stamp_inactive_color || '#FFFFFF33';
  const stampIcon = {
    check: '✓',
    star: '★',
    heart: '♥',
    coffee: '☕',
    gift: '◆',
    none: '',
  }[design.stamp_icon || 'check'];

  return (
    <div className="rounded-2xl p-5 shadow-xl min-h-64 flex flex-col justify-between overflow-hidden" style={{ background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`, color: textColor }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs opacity-75">بطاقة طوابع</p>
          <h3 className="text-xl font-bold truncate">{design.name || 'اسم المتجر'}</h3>
        </div>
        {design.card_logo_url || design.logo_url ? (
          <img src={design.card_logo_url || design.logo_url} className="w-11 h-11 rounded-xl object-cover bg-white/15 border border-white/20 shrink-0" alt="logo" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Stamp className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 my-5">
        {Array.from({ length: stamps }).map((_, index) => (
          <div key={index} className="aspect-square rounded-full border-2 border-white/45 bg-white/10 flex items-center justify-center">
            {index === 0 && (
              <span className="text-sm font-bold" style={{ color: activeStampColor }}>{stampIcon}</span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold">{design.reward_description || 'مكافأة مجانية عند اكتمال الطوابع'}</p>
        <p className="text-xs opacity-75">1 / {stamps} طابع</p>
      </div>
    </div>
  );
}

function CardDesignStudio({ stores, selectedId, onSelect, draft, setDraft, onSave, isPending, syncMessage }) {
  const selectedStore = stores.find(store => store.id === selectedId);
  const [stampTemplate, setStampTemplate] = useState('cafe');
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [imageText, setImageText] = useState({ title: '', subtitle: '', stampLabel: 'STAMP', stampImageUrl: '' });
  const uploadLogo = async (file) => {
    if (!file) return;
    const result = await db.integrations.Core.UploadFile(file);
    setDraft({ ...draft, card_logo_url: result.file_url });
  };
  const uploadStrip = async (file) => {
    if (!file) return;
    const result = await db.integrations.Core.UploadFile(file);
    setDraft({ ...draft, stamp_strip_url: result.file_url });
  };
  const previewImages = async () => {
    if (!selectedStore) return;
    setGeneratingImages(true);
    try {
      const generated = await generateStampTierImages({
        storeName: draft.name || selectedStore.name,
        template: stampTemplate,
        cardBgColor: draft.card_bg_color,
        cardTextColor: draft.card_text_color,
        stampActiveColor: draft.stamp_active_color,
        stampInactiveColor: draft.stamp_inactive_color,
        totalStamps: draft.stamps_required,
        title: imageText.title || draft.name || selectedStore.name,
        subtitle: imageText.subtitle || draft.reward_description,
        stampLabel: imageText.stampLabel,
        customStampImageUrl: imageText.stampImageUrl,
      });
      setGeneratedImages(generated);
    } finally {
      setGeneratingImages(false);
    }
  };
  const uploadGeneratedImages = async () => {
    if (!selectedStore || generatedImages.length === 0) return;
    setGeneratingImages(true);
    try {
      const folder = `stamp-designs/${selectedStore.id}/${Date.now()}`;
      let patternUrl = '';

      for (const item of generatedImages) {
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

      setDraft({ ...draft, stamp_strip_url: patternUrl });
    } finally {
      setGeneratingImages(false);
    }
  };

  if (stores.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold flex items-center gap-2"><Palette className="w-4 h-4 text-primary" />مصمم بطاقات الطوابع</h3>
          <p className="text-xs text-muted-foreground mt-1">اختر المتجر وعدّل شكل بطاقة الطوابع التي تظهر للعميل.</p>
        </div>
        <Select value={selectedId || ''} onValueChange={onSelect}>
          <SelectTrigger className="w-56"><SelectValue placeholder="اختر متجر" /></SelectTrigger>
          <SelectContent>
            {stores.map(store => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5 p-5">
        <StampCardPreview design={{ ...selectedStore, ...draft }} />

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>اسم البطاقة</Label>
              <Input className="mt-1" value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <Label>عدد الطوابع</Label>
              <Input type="number" min={1} max={30} className="mt-1" dir="ltr" value={draft.stamps_required || 10} onChange={e => setDraft({ ...draft, stamps_required: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>وصف المكافأة</Label>
            <Input className="mt-1" value={draft.reward_description || ''} onChange={e => setDraft({ ...draft, reward_description: e.target.value })} placeholder="مثال: مشروب مجاني بعد 10 زيارات" />
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label>لوجو البطاقة</Label>
              <Input className="mt-1" dir="ltr" value={draft.card_logo_url || ''} onChange={e => setDraft({ ...draft, card_logo_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label className="sr-only">رفع لوجو</Label>
              <Input type="file" accept="image/*" className="mt-1 w-44" onChange={e => uploadLogo(e.target.files?.[0])} />
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label>صورة الطوابع للبطاقة</Label>
              <Input className="mt-1" dir="ltr" value={draft.stamp_strip_url || ''} onChange={e => setDraft({ ...draft, stamp_strip_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label className="sr-only">رفع صورة الطوابع</Label>
              <Input type="file" accept="image/*" className="mt-1 w-44" onChange={e => uploadStrip(e.target.files?.[0])} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>لون البطاقة</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" className="w-10 h-9 rounded-md border border-input cursor-pointer" value={draft.card_bg_color || '#7C3AED'} onChange={e => setDraft({ ...draft, card_bg_color: e.target.value })} />
                <Input dir="ltr" value={draft.card_bg_color || ''} onChange={e => setDraft({ ...draft, card_bg_color: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>لون النص</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" className="w-10 h-9 rounded-md border border-input cursor-pointer" value={draft.card_text_color || '#FFFFFF'} onChange={e => setDraft({ ...draft, card_text_color: e.target.value })} />
                <Input dir="ltr" value={draft.card_text_color || ''} onChange={e => setDraft({ ...draft, card_text_color: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>لون الطابع المكتمل</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" className="w-10 h-9 rounded-md border border-input cursor-pointer" value={draft.stamp_active_color || '#FFFFFF'} onChange={e => setDraft({ ...draft, stamp_active_color: e.target.value })} />
                <Input dir="ltr" value={draft.stamp_active_color || ''} onChange={e => setDraft({ ...draft, stamp_active_color: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>لون الطابع الفارغ</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" className="w-10 h-9 rounded-md border border-input cursor-pointer" value={(draft.stamp_inactive_color || '#FFFFFF33').slice(0, 7)} onChange={e => setDraft({ ...draft, stamp_inactive_color: e.target.value })} />
                <Input dir="ltr" value={draft.stamp_inactive_color || ''} onChange={e => setDraft({ ...draft, stamp_inactive_color: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>شكل الطابع</Label>
              <Select value={draft.stamp_icon || 'check'} onValueChange={v => setDraft({ ...draft, stamp_icon: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">صح</SelectItem>
                  <SelectItem value="star">نجمة</SelectItem>
                  <SelectItem value="heart">قلب</SelectItem>
                  <SelectItem value="coffee">قهوة</SelectItem>
                  <SelectItem value="gift">ماسة</SelectItem>
                  <SelectItem value="none">بدون رمز</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
            <div>
              <p className="text-sm font-medium">قفل التعديل على صاحب المتجر</p>
              <p className="text-xs text-muted-foreground">السوبر أدمن فقط يتحكم في شكل البطاقة عند التفعيل.</p>
            </div>
            <Switch checked={Boolean(draft.lock_card_design)} onCheckedChange={v => setDraft({ ...draft, lock_card_design: v })} />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
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
              <div>
                <Label>عنوان الصورة</Label>
                <Input className="mt-1" value={imageText.title || draft.name || ''} onChange={e => setImageText({ ...imageText, title: e.target.value })} />
              </div>
              <div>
                <Label>كلمة الطابع</Label>
                <Input className="mt-1" dir="ltr" value={imageText.stampLabel} onChange={e => setImageText({ ...imageText, stampLabel: e.target.value })} />
              </div>
            </div>
            <div className="mt-3">
              <Label>النص الصغير</Label>
              <Input className="mt-1" value={imageText.subtitle || draft.reward_description || ''} onChange={e => setImageText({ ...imageText, subtitle: e.target.value })} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] items-end">
              <div>
                <Label>صورة الطابع الخاصة</Label>
                <Input className="mt-1" dir="ltr" value={imageText.stampImageUrl} onChange={e => setImageText({ ...imageText, stampImageUrl: e.target.value })} placeholder="https://..." />
              </div>
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 text-sm">
                <Upload className="h-4 w-4" />
                رفع الطابع
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await fileToDataUrl(file);
                    setImageText(current => ({ ...current, stampImageUrl: dataUrl }));
                  }}
                />
              </label>
            </div>
            {imageText.stampImageUrl && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background p-2">
                <img src={imageText.stampImageUrl} alt="stamp" className="h-14 w-14 rounded-full object-cover" />
                <span className="text-xs text-muted-foreground">هذه الصورة ستصبح شكل الطابع داخل صور Google Wallet.</span>
              </div>
            )}
            {generatedImages.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {generatedImages.map(image => (
                  <div key={image.tier} className="rounded-lg border border-border bg-background p-2">
                    <img src={image.dataUrl} alt={`stamp ${image.tier}`} className="aspect-[1125/432] w-full rounded-md object-cover" />
                    <p className="mt-1 text-center text-xs text-muted-foreground">{image.tier}/5</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={previewImages} disabled={generatingImages || !selectedId}>
                <Wand2 className="w-4 h-4 ml-2" />
                {generatingImages ? 'جاري المعاينة...' : 'معاينة الصور'}
              </Button>
              <Button type="button" variant="secondary" onClick={uploadGeneratedImages} disabled={generatingImages || generatedImages.length === 0}>
                اعتماد ورفع الصور
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              عدل الألوان والنصوص ثم عاين الصور. لا يتم رفعها للبطاقة إلا بعد اعتمادها.
            </p>
          </div>

          {syncMessage && (
            <div className={cn(
              'rounded-xl border p-3 text-sm',
              syncMessage.type === 'error'
                ? 'border-destructive/20 bg-destructive/10 text-destructive'
                : 'border-success/20 bg-success/10 text-success'
            )}>
              {syncMessage.text}
            </div>
          )}

          <Button className="w-full bg-primary hover:bg-primary/90" disabled={!selectedId || isPending} onClick={onSave}>
            <Save className="w-4 h-4 ml-2" />
            {isPending ? 'جاري الحفظ...' : 'حفظ إعدادات البطاقة'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdmin() {
  const { allStores, reloadStores } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [designStoreId, setDesignStoreId] = useState('');
  const [designDraft, setDesignDraft] = useState(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [userStore, setUserStore] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '' });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [designSyncMessage, setDesignSyncMessage] = useState(null);

  const createUniqueSlug = async (data, currentStoreId = null) => {
    const base = slugify(data.slug || data.name) || `store-${Date.now()}`;
    const existingSlugs = new Set(
      allStores
        .filter(store => store.id !== currentStoreId)
        .map(store => store.slug)
        .filter(Boolean)
    );

    const { data: remoteStores } = await supabase
      .from('stores')
      .select('id,slug')
      .like('slug', `${base}%`);

    (remoteStores || [])
      .filter(store => store.id !== currentStoreId)
      .forEach(store => existingSlugs.add(store.slug));

    if (!existingSlugs.has(base)) return base;

    let index = 2;
    while (existingSlugs.has(`${base}-${index}`)) {
      index += 1;
    }
    return `${base}-${index}`;
  };

  useEffect(() => {
    if (!designStoreId && allStores[0]?.id) {
      setDesignStoreId(allStores[0].id);
    }
  }, [allStores, designStoreId]);

  useEffect(() => {
    const store = allStores.find(s => s.id === designStoreId);
    if (!store) return;
    setDesignDraft({
      name: store.name || '',
      stamps_required: store.stamps_required || 10,
      reward_description: store.reward_description || '',
      card_bg_color: store.card_bg_color || '#7C3AED',
      card_text_color: store.card_text_color || '#FFFFFF',
      card_logo_url: store.card_logo_url || store.logo_url || '',
      stamp_active_color: store.stamp_active_color || '#FFFFFF',
      stamp_inactive_color: store.stamp_inactive_color || '#FFFFFF33',
      stamp_icon: store.stamp_icon || 'check',
      stamp_strip_url: store.stamp_strip_url || '',
      lock_card_design: Boolean(store.lock_card_design),
    });
  }, [allStores, designStoreId]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      setError('');
      const uniqueSlug = await createUniqueSlug(data);
      const store = await db.entities.Store.create(storePayload(data, uniqueSlug));

      if (data.owner_email && data.owner_password) {
        const userResult = await db.auth.createStoreUser({
          email: data.owner_email,
          password: data.owner_password,
          name: data.owner_name,
          role: 'store_owner',
          storeId: store.id,
        });

        await db.entities.Store.update(store.id, {
          owner_user_id: userResult?.user?.id,
          owner_email: normalizeEmail(data.owner_email),
          owner_name: data.owner_name,
        });
      }

      return store;
    },
    onSuccess: () => {
      reloadStores();
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: (err) => setError(err.message || 'تعذر إنشاء المتجر أو المستخدم.'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const uniqueSlug = await createUniqueSlug(data, id);
      return db.entities.Store.update(id, storePayload(data, uniqueSlug));
    },
    onSuccess: () => {
      reloadStores();
      setEditingStore(null);
    },
    onError: (err) => setError(err.message || 'تعذر حفظ التعديلات.'),
  });

  const quickUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Store.update(id, data),
    onSuccess: reloadStores,
    onError: (err) => setError(err.message || 'تعذر تحديث المتجر.'),
  });

  const designMutation = useMutation({
    mutationFn: async () => {
      setDesignSyncMessage(null);
      await db.entities.Store.update(designStoreId, {
        name: designDraft.name,
        stamps_required: Number(designDraft.stamps_required) || 10,
        reward_description: designDraft.reward_description,
        card_bg_color: designDraft.card_bg_color || '#7C3AED',
        card_text_color: designDraft.card_text_color || '#FFFFFF',
        card_logo_url: designDraft.card_logo_url || null,
        stamp_active_color: designDraft.stamp_active_color || '#FFFFFF',
        stamp_inactive_color: designDraft.stamp_inactive_color || '#FFFFFF33',
        stamp_icon: designDraft.stamp_icon || 'check',
        stamp_strip_url: designDraft.stamp_strip_url || null,
        lock_card_design: Boolean(designDraft.lock_card_design),
      });

      return db.integrations.GoogleWallet.syncPass({ storeId: designStoreId });
    },
    onSuccess: (result) => {
      reloadStores();
      setDesignSyncMessage({
        type: 'success',
        text: `تم حفظ إعدادات البطاقة وتحديث Google Wallet لعدد ${result?.updated || 0} بطاقة. بطاقة الويب تتحدث مباشرة.`,
      });
    },
    onError: (err) => {
      setDesignSyncMessage({ type: 'error', text: err.message || 'تعذر حفظ إعدادات البطاقة.' });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async ({ store, user }) => {
      setError('');
      const userResult = await db.auth.createStoreUser({
        email: user.email,
        password: user.password,
        name: user.name,
        role: 'store_owner',
        storeId: store.id,
      });

      await db.entities.Store.update(store.id, {
        owner_user_id: userResult?.user?.id,
        owner_email: normalizeEmail(user.email),
        owner_name: user.name,
      });
    },
    onSuccess: () => {
      reloadStores();
      setUserStore(null);
      setUserForm({ name: '', email: '', password: '' });
    },
    onError: (err) => setError(err.message || 'تعذر إنشاء مستخدم المتجر.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Store.delete(id),
    onSuccess: reloadStores,
    onError: (err) => setError(err.message || 'تعذر حذف المتجر.'),
  });

  const filtered = allStores.filter(s => {
    const term = search.toLowerCase();
    const matchSearch = !term
      || s.name?.toLowerCase().includes(term)
      || s.email?.toLowerCase().includes(term)
      || s.owner_email?.toLowerCase().includes(term);
    const matchStatus = statusFilter === 'all' || s.subscription_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = [
    { label: 'إجمالي المتاجر', value: allStores.length, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'متاجر نشطة', value: allStores.filter(s => s.subscription_status === 'active').length, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { label: 'تجريبي', value: allStores.filter(s => s.subscription_status === 'trial').length, icon: Star, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'تصميم مقفل', value: allStores.filter(s => s.lock_card_design).length, icon: Lock, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              لوحة إدارة المنصة
              <Badge className="bg-primary/10 text-primary text-xs gap-1"><Crown className="w-3 h-3" />Super Admin</Badge>
            </h2>
            <p className="text-muted-foreground text-sm" dir="ltr">{SUPER_ADMIN_EMAIL}</p>
          </div>
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90"><Plus className="w-4 h-4 ml-2" />إضافة متجر ومستخدم</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>إضافة متجر جديد</DialogTitle></DialogHeader>
            <StoreForm
              form={form}
              setForm={setForm}
              submitLabel="إنشاء المتجر"
              isPending={createMutation.isPending}
              onSubmit={() => createMutation.mutate(form)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-2xl p-5">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <CardDesignStudio
        stores={allStores}
        selectedId={designStoreId}
        onSelect={setDesignStoreId}
        draft={designDraft}
        setDraft={setDesignDraft}
        onSave={() => designMutation.mutate()}
        isPending={designMutation.isPending}
        syncMessage={designSyncMessage}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالمتجر أو بريد المالك..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="trial">تجريبي</SelectItem>
            <SelectItem value="expired">منتهي</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="py-1.5 px-3">{filtered.length} متجر</Badge>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] text-xs font-semibold text-muted-foreground px-5 py-3 border-b border-border bg-muted/30">
          <span>المتجر</span>
          <span className="px-4 text-center">الخطة</span>
          <span className="px-4 text-center">الحالة</span>
          <span className="px-4 text-center">التصميم</span>
          <span></span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">لا توجد متاجر</p>
          </div>
        ) : (
          filtered.map((store, i) => (
            <motion.div key={store.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center px-5 py-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${store.card_bg_color || '#7C3AED'}22`, color: store.card_bg_color || '#7C3AED' }}>
                  {store.name?.[0] || 'م'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{store.name}</p>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{store.owner_email || store.email || `/store/${store.slug}`}</p>
                </div>
              </div>
              <div className="px-4">
                <Badge variant="outline" className={cn('text-xs', planColors[store.subscription_plan])}>
                  {planLabels[store.subscription_plan] || store.subscription_plan}
                </Badge>
              </div>
              <div className="px-4">
                <Badge className={cn('text-xs', statusColors[store.subscription_status])}>
                  {statusLabels[store.subscription_status] || store.subscription_status}
                </Badge>
              </div>
              <div className="px-4 flex items-center gap-2">
                <Switch
                  checked={Boolean(store.lock_card_design)}
                  onCheckedChange={(v) => quickUpdateMutation.mutate({ id: store.id, data: { lock_card_design: v } })}
                  className="data-[state=checked]:bg-destructive scale-75"
                />
                <span className="text-xs text-muted-foreground">{store.lock_card_design ? 'مقفل' : 'مسموح'}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setEditingStore({ ...emptyForm, ...store, owner_password: undefined })}>
                    <Edit className="w-4 h-4 ml-2" />تعديل المتجر والتصميم
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditingStore({ ...emptyForm, ...store, owner_password: undefined })}>
                    <Palette className="w-4 h-4 ml-2" />ألوان البطاقة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => quickUpdateMutation.mutate({ id: store.id, data: { is_active: !store.is_active } })}>
                    {store.is_active ? <><XCircle className="w-4 h-4 ml-2 text-destructive" />تعطيل</> : <><CheckCircle className="w-4 h-4 ml-2 text-success" />تفعيل</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(`/store/${store.slug}`, '_blank')}>
                    <Globe className="w-4 h-4 ml-2" />صفحة التسجيل
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setUserStore(store);
                    setUserForm({
                      name: store.owner_name || '',
                      email: store.owner_email || '',
                      password: '',
                    });
                  }}>
                    <UserPlus className="w-4 h-4 ml-2" />إنشاء مستخدم متجر
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(store.id)}>
                    <Trash2 className="w-4 h-4 ml-2" />حذف
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))
        )}
      </div>

      {editingStore && (
        <Dialog open={!!editingStore} onOpenChange={() => setEditingStore(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>تعديل: {editingStore.name}</DialogTitle></DialogHeader>
            <StoreForm
              form={editingStore}
              setForm={setEditingStore}
              submitLabel="حفظ التعديلات"
              isPending={updateMutation.isPending}
              onSubmit={() => updateMutation.mutate({ id: editingStore.id, data: editingStore })}
            />
          </DialogContent>
        </Dialog>
      )}

      {userStore && (
        <Dialog open={!!userStore} onOpenChange={() => setUserStore(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>مستخدم متجر: {userStore.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>اسم المستخدم</Label>
                <Input className="mt-1" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input className="mt-1" type="email" dir="ltr" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div>
                <Label>كلمة مرور مؤقتة</Label>
                <Input className="mt-1" type="password" dir="ltr" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!userForm.email || !userForm.password || createUserMutation.isPending}
                onClick={() => createUserMutation.mutate({ store: userStore, user: userForm })}
              >
                {createUserMutation.isPending ? 'جاري إنشاء المستخدم...' : 'إنشاء وربط المستخدم'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
