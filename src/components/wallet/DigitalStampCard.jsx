import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const stampSymbols = {
  check: '✓',
  star: '★',
  heart: '♥',
  coffee: '☕',
  gift: '◆',
  none: '',
};

export default function DigitalStampCard({ store, customer, value }) {
  const total = store?.stamps_required || 10;
  const current = Math.min(customer?.current_stamps || 0, total);
  const bgColor = store?.card_bg_color || '#4b2a25';
  const textColor = store?.card_text_color || '#ffffff';
  const activeColor = store?.stamp_active_color || '#d9b85f';
  const inactiveColor = store?.stamp_inactive_color || 'rgba(255,255,255,0.25)';
  const symbol = stampSymbols[store?.stamp_icon || 'coffee'];
  const cardValue = value || customer?.id || '';
  const qrValue = String(cardValue || '');

  return (
    <div
      className="relative overflow-hidden rounded-[22px] p-5 shadow-2xl"
      style={{ background: bgColor, color: textColor }}
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {store?.card_logo_url || store?.logo_url ? (
            <img
              src={store.card_logo_url || store.logo_url}
              alt={store?.name || 'Logo'}
              className="h-14 max-w-[150px] rounded-xl object-contain"
            />
          ) : (
            <div className="text-3xl font-black tracking-normal">{store?.name || 'Loyalty'}</div>
          )}
        </div>
        <div className="text-left">
          <div className="text-xs font-bold uppercase opacity-80">STAMPS</div>
          <div className="text-4xl font-black leading-none">{current}/{total}</div>
        </div>
      </div>

      {store?.stamp_strip_url && (
        <div className="mt-5 overflow-hidden rounded-xl bg-white/10">
          <img src={store.stamp_strip_url} alt="" className="h-28 w-full object-cover" />
        </div>
      )}

      <div className="mt-6 grid grid-cols-5 gap-3" dir="ltr">
        {Array.from({ length: total }).map((_, index) => {
          const filled = index < current;
          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full border text-lg font-black"
                style={{
                  background: filled ? activeColor : inactiveColor,
                  borderColor: filled ? activeColor : 'rgba(255,255,255,0.45)',
                  color: filled ? bgColor : textColor,
                }}
              >
                {filled ? symbol : ''}
              </div>
              <span className="text-[10px] font-bold uppercase opacity-75">STAMP</span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-[1fr_auto] items-end gap-4">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase opacity-75">FULL NAME</div>
          <div className="mt-2 truncate text-2xl font-black">{customer?.full_name || 'Guest'}</div>
          <div className="mt-4 text-xs opacity-75">{store?.reward_description || 'Collect stamps and unlock your reward.'}</div>
        </div>
        <div className="rounded-xl bg-white p-3 text-black shadow-lg">
          <QRCodeSVG value={qrValue} size={96} level="M" includeMargin={false} />
          <div className="mt-1 max-w-24 truncate text-center text-xs font-bold" dir="ltr">{String(cardValue).slice(0, 10)}</div>
        </div>
      </div>
    </div>
  );
}
