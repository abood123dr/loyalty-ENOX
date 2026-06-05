import db from '@/api/base44Client';

import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import jsQR from 'jsqr';

import { useStore } from '@/lib/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle,
  Clock,
  ExternalLink,
  Gift,
  History,
  Phone,
  QrCode,
  RotateCcw,
  Search,
  ScanLine,
  Stamp,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const DUPLICATE_SCAN_LOCK_MS = 30 * 1000;
const RECENT_ACTIONS_LIMIT = 5;

const extractQrValue = (input) => input.trim();

const formatTime = (date) => new Intl.DateTimeFormat('ar-SA', {
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(date));

const formatDateTime = (date) => {
  if (!date) return 'لم تسجل زيارة بعد';
  return new Intl.DateTimeFormat('ar-SA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const getCustomerCardUrl = (store, customer) => {
  if (!store?.slug || !customer?.id) return '';
  return `${window.location.origin}/card/${store.slug}/${customer.id}`;
};

const getCameraErrorMessage = (error) => {
  const name = error?.name || '';
  const message = error?.message || '';

  if (name === 'NotAllowedError' || message.includes('Permission denied')) {
    return 'تم رفض صلاحية الكاميرا. اسمح للمتصفح باستخدام الكاميرا ثم حاول مرة أخرى.';
  }
  if (name === 'NotFoundError' || message.includes('Requested device not found')) {
    return 'لم يتم العثور على كاميرا في هذا الجهاز. استخدم البحث اليدوي أو جرب جهازا آخر.';
  }
  if (name === 'NotReadableError') {
    return 'الكاميرا مستخدمة من تطبيق آخر أو غير متاحة حاليا.';
  }

  return message || 'تعذر تشغيل الكاميرا. تأكد من السماح بالصلاحية.';
};

export default function QrScanner() {
  const { currentStore, allStores, isSuperAdmin, switchStore } = useStore();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const scanningRef = useRef(false);
  const detectedRef = useRef('');
  const duplicateLocksRef = useRef(new Map());

  const [searchPhone, setSearchPhone] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [recentActions, setRecentActions] = useState([]);
  const [nowTick, setNowTick] = useState(Date.now());

  const stampsRequired = currentStore?.stamps_required || 10;
  const currentStamps = foundCustomer?.current_stamps || 0;
  const remainingStamps = Math.max(stampsRequired - currentStamps, 0);
  const nextScanIsReward = currentStamps + 1 >= stampsRequired;
  const progress = Math.min((currentStamps / stampsRequired) * 100, 100);
  const customerCardUrl = getCustomerCardUrl(currentStore, foundCustomer);
  const duplicateRemainingSeconds = foundCustomer
    ? Math.max(Math.ceil(((duplicateLocksRef.current.get(foundCustomer.id) || 0) - nowTick) / 1000), 0)
    : 0;
  const hasWallet = Boolean(
    foundCustomer?.google_wallet_object_id
    || foundCustomer?.samsung_wallet_ref_id
    || foundCustomer?.apple_wallet_serial_number
  );

  const searchMutation = useMutation({
    mutationFn: async (input) => {
      const value = extractQrValue(input);
      const cardMatch = value.match(/\/card\/(?:[^/]+\/)?([0-9a-fA-F-]{36})/) || value.match(/^([0-9a-fA-F-]{36})$/);

      if (cardMatch?.[1]) {
        const customer = await db.entities.StoreCustomer.get(cardMatch[1]);
        return customer?.store_id === currentStore?.id ? customer : null;
      }

      const results = await db.entities.StoreCustomer.filter({
        store_id: currentStore?.id,
        phone: value,
      });
      return results[0] || null;
    },
    onMutate: () => {
      setSearching(true);
      setScanResult(null);
      setSyncError('');
    },
    onSuccess: (customer) => {
      setFoundCustomer(customer);
      setSearching(false);
    },
    onError: () => {
      setFoundCustomer(null);
      setSearching(false);
    },
  });

  const stopCamera = () => {
    scanningRef.current = false;
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const runCameraScan = () => {
    if (!scanningRef.current || !videoRef.current) return;

    try {
      if (videoRef.current.readyState >= 2) {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d', { willReadFrequently: true });

        if (!canvas || !context) {
          throw new Error('تعذر تجهيز قارئ QR.');
        }

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        const value = code?.data;

        if (value && value !== detectedRef.current) {
          detectedRef.current = value;
          setSearchPhone(value);
          stopCamera();
          searchMutation.mutate(value);
          return;
        }
      }
    } catch (error) {
      setCameraError(error?.message || 'تعذر قراءة الكاميرا.');
    }

    scanTimerRef.current = window.setTimeout(runCameraScan, 450);
  };

  const startCamera = async () => {
    setCameraError('');
    detectedRef.current = '';

    if (!currentStore) {
      setCameraError('اختر متجر قبل تشغيل الكاميرا.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('المتصفح لا يدعم تشغيل الكاميرا. استخدم البحث اليدوي.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      scanningRef.current = true;
      setCameraActive(true);
      runCameraScan();
    } catch (error) {
      stopCamera();
      setCameraError(getCameraErrorMessage(error));
    }
  };

  const stampMutation = useMutation({
    mutationFn: async ({ customer, isReward }) => {
      setSyncError('');
      const newStamps = isReward ? 0 : (customer.current_stamps || 0) + 1;
      const totalStampsEarned = (customer.total_stamps_earned || 0) + 1;
      const totalRewardsRedeemed = isReward
        ? (customer.total_rewards_redeemed || 0) + 1
        : customer.total_rewards_redeemed;

      await db.entities.StampScan.create({
        store_id: currentStore?.id,
        customer_id: customer.id,
        stamps_added: 1,
        is_reward: isReward,
      });

      await db.entities.StoreCustomer.update(customer.id, {
        current_stamps: newStamps,
        total_stamps_earned: totalStampsEarned,
        total_rewards_redeemed: totalRewardsRedeemed,
        last_stamp_date: new Date().toISOString(),
      });

      if (customer.google_wallet_object_id) {
        try {
          await db.integrations.GoogleWallet.syncPass({
            storeId: currentStore.id,
            customerId: customer.id,
          });
        } catch (error) {
          setSyncError(error.message || 'تعذر تحديث Google Wallet.');
        }
      }

      return {
        ...customer,
        current_stamps: newStamps,
        total_stamps_earned: totalStampsEarned,
        total_rewards_redeemed: totalRewardsRedeemed,
      };
    },
    onSuccess: (updatedCustomer, { isReward }) => {
      duplicateLocksRef.current.set(updatedCustomer.id, Date.now() + DUPLICATE_SCAN_LOCK_MS);
      setFoundCustomer(updatedCustomer);
      setScanResult(isReward ? 'reward' : 'stamped');
      setRecentActions((items) => [
        {
          id: `${updatedCustomer.id}-${Date.now()}`,
          customerId: updatedCustomer.id,
          name: updatedCustomer.full_name || 'عميل بدون اسم',
          phone: updatedCustomer.phone || '',
          type: isReward ? 'reward' : 'stamp',
          stamps: updatedCustomer.current_stamps || 0,
          at: new Date().toISOString(),
        },
        ...items,
      ].slice(0, RECENT_ACTIONS_LIMIT));
      queryClient.invalidateQueries(['store-customers', currentStore?.id]);
      queryClient.invalidateQueries(['store-scans', currentStore?.id]);
    },
  });

  const handleSearch = () => {
    if (!searchPhone.trim() || !currentStore) return;
    searchMutation.mutate(searchPhone);
  };

  const handleStamp = () => {
    if (!foundCustomer) return;

    const lockedUntil = duplicateLocksRef.current.get(foundCustomer.id) || 0;
    const remainingSeconds = Math.ceil((lockedUntil - Date.now()) / 1000);
    if (remainingSeconds > 0) {
      setScanResult('duplicate');
      setSyncError(`تم منع التكرار: انتظر ${remainingSeconds} ثانية قبل إضافة طابع آخر لنفس العميل.`);
      return;
    }

    stampMutation.mutate({ customer: foundCustomer, isReward: nextScanIsReward });
  };

  const handleReset = () => {
    setFoundCustomer(null);
    setScanResult(null);
    setSearchPhone('');
    setSyncError('');
    detectedRef.current = '';
  };

  const handleScanNext = () => {
    handleReset();
    window.setTimeout(() => startCamera(), 50);
  };

  if (!currentStore) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <QrCode className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold">اختر متجر للمسح</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          يجب تحديد متجر قبل البحث عن عميل أو إضافة طابع.
        </p>
        {isSuperAdmin && (
          <Select
            value=""
            onValueChange={(storeId) => {
              const store = allStores.find((item) => item.id === storeId);
              if (store) switchStore(store);
            }}
          >
            <SelectTrigger className="mt-5 w-full max-w-xs">
              <SelectValue placeholder="اختر متجر" />
            </SelectTrigger>
            <SelectContent>
              {allStores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <ScanLine className="h-3.5 w-3.5" />
            {currentStore.name}
          </div>
          <h2 className="text-2xl font-bold text-foreground">QR Scanner</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            امسح بطاقة العميل بسرعة، أضف طابع، أو اصرف المكافأة من نفس الشاشة.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            بحث جديد
          </Button>
          <Button onClick={cameraActive ? stopCamera : startCamera} className="gap-2">
            {cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            {cameraActive ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-semibold">الكاميرا</h3>
                <p className="text-xs text-muted-foreground">وجه الكاميرا إلى QR الموجود في بطاقة العميل.</p>
              </div>
              <div className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                cameraActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
              )}>
                {cameraActive ? 'جاهز للمسح' : 'متوقف'}
              </div>
            </div>

            <div className="p-5">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-950">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
                    <QrCode className="mb-3 h-12 w-12" />
                    <p className="text-sm">اضغط تشغيل الكاميرا للبدء</p>
                  </div>
                )}
                {cameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-52 w-52 rounded-3xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="mt-4 flex gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
              <h3 className="font-semibold">بحث يدوي</h3>
              <p className="text-xs text-muted-foreground">اكتب رقم الجوال أو الصق رابط/كود بطاقة العميل.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="05XXXXXXXX أو رابط البطاقة"
                value={searchPhone}
                onChange={(event) => setSearchPhone(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                dir="ltr"
                className="h-11"
              />
              <Button onClick={handleSearch} disabled={searchMutation.isPending || !searchPhone.trim()} className="h-11 gap-2">
                <Search className="h-4 w-4" />
                {searchMutation.isPending || searching ? 'جاري البحث...' : 'بحث'}
              </Button>
            </div>
            {searchMutation.isSuccess && !foundCustomer && !searching && (
              <p className="mt-3 text-sm text-destructive">لم يتم العثور على عميل مطابق داخل هذا المتجر.</p>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {foundCustomer ? (
              <motion.section
                key="customer"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="border-b border-border p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
                      {foundCustomer.full_name?.[0] || 'ع'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold">{foundCustomer.full_name || 'عميل بدون اسم'}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground" dir="ltr">
                        <Phone className="h-3.5 w-3.5" />
                        {foundCustomer.phone || 'No phone'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="text-xs text-muted-foreground">آخر زيارة</p>
                      <p className="mt-1 font-semibold">{formatDateTime(foundCustomer.last_stamp_date)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="text-xs text-muted-foreground">حالة البطاقة</p>
                      <p className={cn('mt-1 font-semibold', hasWallet ? 'text-success' : 'text-muted-foreground')}>
                        {hasWallet ? 'مضافة إلى Wallet' : 'بطاقة رقمية فقط'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-border p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">تقدم البطاقة</p>
                    <p className="text-2xl font-black text-primary">
                      {currentStamps}
                      <span className="text-sm font-normal text-muted-foreground">/{stampsRequired}</span>
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {remainingStamps === 0 ? 'العميل جاهز للمكافأة.' : `باقي ${remainingStamps} طابع للوصول للمكافأة.`}
                  </p>

                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {Array.from({ length: stampsRequired }).map((_, index) => {
                      const filled = index < currentStamps;
                      return (
                        <div
                          key={index}
                          className={cn(
                            'flex aspect-square min-h-10 items-center justify-center rounded-xl border text-sm font-bold transition-all',
                            filled
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                              : 'border-border bg-muted text-muted-foreground',
                          )}
                        >
                          {filled ? <CheckCircle className="h-4 w-4" /> : index + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-5">
                  {duplicateRemainingSeconds > 0 && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3 text-warning">
                      <Clock className="h-5 w-5" />
                      <p className="font-medium">يمكن إضافة طابع جديد بعد {duplicateRemainingSeconds} ثانية.</p>
                    </div>
                  )}
                  {scanResult === 'stamped' && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 p-3 text-success">
                      <CheckCircle className="h-5 w-5" />
                      <p className="font-medium">تمت إضافة الطابع بنجاح.</p>
                    </div>
                  )}
                  {scanResult === 'reward' && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3 text-warning">
                      <Gift className="h-5 w-5" />
                      <p className="font-medium">تم صرف المكافأة وإعادة البطاقة للصفر.</p>
                    </div>
                  )}
                  {syncError && (
                    <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                      {syncError}
                    </div>
                  )}

                  <div className="grid gap-3">
                    <Button
                      className="h-12 gap-2 bg-primary text-base hover:bg-primary/90"
                      onClick={handleStamp}
                      disabled={stampMutation.isPending || duplicateRemainingSeconds > 0}
                    >
                      <Stamp className="h-4 w-4" />
                      {stampMutation.isPending ? 'جاري الإضافة...' : nextScanIsReward ? 'صرف المكافأة' : 'إضافة طابع'}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!customerCardUrl}
                      onClick={() => window.open(customerCardUrl, '_blank')}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      فتح بطاقة العميل
                    </Button>
                    <Button variant="outline" onClick={handleScanNext} className="gap-2">
                      <ScanLine className="h-4 w-4" />
                      مسح عميل آخر
                    </Button>
                  </div>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-8 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ScanLine className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold">بانتظار المسح</h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  شغل الكاميرا وامسح QR البطاقة، أو ابحث يدويا برقم الجوال.
                </p>
              </motion.section>
            )}
          </AnimatePresence>

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">آخر العمليات</h3>
                <p className="text-xs text-muted-foreground">آخر عمليات تمت في هذه الجلسة.</p>
              </div>
              <History className="h-5 w-5 text-muted-foreground" />
            </div>

            {recentActions.length === 0 ? (
              <div className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">
                لا توجد عمليات بعد.
              </div>
            ) : (
              <div className="space-y-2">
                {recentActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        action.type === 'reward' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success',
                      )}>
                        {action.type === 'reward' ? <Gift className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{action.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.type === 'reward' ? 'صرف مكافأة' : `طابع جديد - ${action.stamps}/${stampsRequired}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(action.at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
