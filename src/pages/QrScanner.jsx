import db from '@/api/base44Client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useStore } from '@/lib/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Search, CheckCircle, Gift, Phone, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function QrScanner() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const [searchPhone, setSearchPhone] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);
  const [scanResult, setScanResult] = useState(null); // 'stamped' | 'reward'
  const [searching, setSearching] = useState(false);
  const [syncError, setSyncError] = useState('');

  const stampsRequired = currentStore?.stamps_required || 10;

  const searchMutation = useMutation({
    mutationFn: async (input) => {
      const value = input.trim();
      const cardMatch = value.match(/\/card\/([0-9a-fA-F-]{36})/) || value.match(/^([0-9a-fA-F-]{36})$/);
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
    onSuccess: (customer) => {
      setFoundCustomer(customer);
      setScanResult(null);
      setSyncError('');
    },
  });

  const stampMutation = useMutation({
    mutationFn: async ({ customer, isReward }) => {
      setSyncError('');
      const newStamps = isReward ? 0 : (customer.current_stamps || 0) + 1;
      await db.entities.StampScan.create({
        store_id: currentStore?.id,
        customer_id: customer.id,
        stamps_added: 1,
        is_reward: isReward,
      });
      await db.entities.StoreCustomer.update(customer.id, {
        current_stamps: newStamps,
        total_stamps_earned: (customer.total_stamps_earned || 0) + 1,
        total_rewards_redeemed: isReward ? (customer.total_rewards_redeemed || 0) + 1 : customer.total_rewards_redeemed,
        last_stamp_date: new Date().toISOString(),
      });
      if (customer.google_wallet_object_id) {
        try {
          await db.integrations.GoogleWallet.syncPass({
            storeId: currentStore.id,
            customerId: customer.id,
          });
        } catch (err) {
          setSyncError(err.message || 'تعذر تحديث Google Wallet.');
        }
      }

      return { ...customer, current_stamps: newStamps };
    },
    onSuccess: (updatedCustomer, { isReward }) => {
      setFoundCustomer(updatedCustomer);
      setScanResult(isReward ? 'reward' : 'stamped');
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
    const nextStamps = (foundCustomer.current_stamps || 0) + 1;
    const isReward = nextStamps >= stampsRequired;
    stampMutation.mutate({ customer: foundCustomer, isReward });
  };

  const handleReset = () => {
    setFoundCustomer(null);
    setScanResult(null);
    setSearchPhone('');
  };

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <QrCode className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">ط§ظ„ط±ط¬ط§ط، ط§ط®طھظٹط§ط± ظ…طھط¬ط± ط£ظˆظ„ط§ظ‹</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">QR Scanner</h2>
        <p className="text-sm text-muted-foreground mt-1">ظ…ط³ط­ ط¨ط·ط§ظ‚ط© ط§ظ„ط¹ظ…ظٹظ„ ظˆط¥ط¶ط§ظپط© ط·ط§ط¨ط¹</p>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <p className="text-sm font-medium mb-3">ط§ط¨ط­ط« ط¹ظ† ط§ظ„ط¹ظ…ظٹظ„ ط¨ط±ظ‚ظ… ط§ظ„ط¬ظˆط§ظ„</p>
        <div className="flex gap-2">
          <Input
            placeholder="05XXXXXXXX"
            value={searchPhone}
            onChange={e => setSearchPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            dir="ltr"
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={searchMutation.isPending}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
        {searchMutation.isSuccess && !foundCustomer && (
          <p className="text-sm text-destructive mt-2">ظ„ظ… ظٹطھظ… ط¥ظٹط¬ط§ط¯ ط§ظ„ط¹ظ…ظٹظ„ ط¨ظ‡ط°ط§ ط§ظ„ط±ظ‚ظ…</p>
        )}
      </div>

      {/* Customer Found */}
      <AnimatePresence>
        {foundCustomer && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            {/* Customer Info */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {foundCustomer.full_name?.[0]}
                </div>
                <div>
                  <p className="font-bold text-lg">{foundCustomer.full_name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1" dir="ltr">
                    <Phone className="w-3.5 h-3.5" />{foundCustomer.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Stamps Progress */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium">ط§ظ„ط·ظˆط§ط¨ط¹ ط§ظ„ط­ط§ظ„ظٹط©</p>
                <p className="text-2xl font-black text-primary">
                  {foundCustomer.current_stamps || 0}
                  <span className="text-sm text-muted-foreground font-normal">/{stampsRequired}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: stampsRequired }).map((_, i) => (
                  <div key={i} className={cn(
                    'w-10 h-10 rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all',
                    i < (foundCustomer.current_stamps || 0)
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-muted text-muted-foreground'
                  )}>
                    {i < (foundCustomer.current_stamps || 0) ? 'âœ“' : i + 1}
                  </div>
                ))}
              </div>
              {(foundCustomer.current_stamps || 0) >= stampsRequired - 1 && (
                <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-xl flex items-center gap-2">
                  <Gift className="w-4 h-4 text-success" />
                  <p className="text-sm text-success font-medium">
                    {(foundCustomer.current_stamps || 0) >= stampsRequired
                      ? 'ط§ظ„ط¨ط·ط§ظ‚ط© ظ…ظƒطھظ…ظ„ط©! ظٹط³طھط­ظ‚ ط§ظ„ظ…ظƒط§ظپط£ط©'
                      : 'ط·ط§ط¨ط¹ ظˆط§ط­ط¯ ظ…طھط¨ظ‚ظچ ظ„ظ„ظ…ظƒط§ظپط£ط©!'}
                  </p>
                </div>
              )}
            </div>

            {/* Action */}
            <div className="p-6">
              {scanResult === 'stamped' && (
                <div className="flex items-center gap-2 text-success mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-medium">طھظ… ط¥ط¶ط§ظپط© ط§ظ„ط·ط§ط¨ط¹ ط¨ظ†ط¬ط§ط­!</p>
                </div>
              )}
              {scanResult === 'reward' && (
                <div className="flex items-center gap-2 text-warning mb-4">
                  <Gift className="w-5 h-5" />
                  <p className="font-medium">ًںژ‰ طھظ…طھ ط§ظ„ظ…ظƒط§ظپط£ط©! طھظ… ط¥ط¹ط§ط¯ط© ط§ظ„ط¨ط·ط§ظ‚ط©</p>
                </div>
              )}

              {syncError && (
                <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive break-words" dir="ltr">
                  {syncError}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleStamp}
                  disabled={stampMutation.isPending}
                >
                  <Stamp className="w-4 h-4 ml-2" />
                  {stampMutation.isPending ? 'ط¬ط§ط±ظٹ...' : 'ط¥ط¶ط§ظپط© ط·ط§ط¨ط¹'}
                </Button>
                <Button variant="outline" onClick={handleReset}>ط¨ط­ط« ط¬ط¯ظٹط¯</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



