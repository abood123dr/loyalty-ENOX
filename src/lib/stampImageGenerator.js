const WIDTH = 1125;
const HEIGHT = 432;

const templates = {
  cafe: {
    label: 'Coffee',
    accent: '#d9b85f',
    shapes: ['cup', 'cup', 'cup', 'cup', 'cup'],
    tagline: 'Digital stamp rewards',
  },
  restaurant: {
    label: 'Restaurant',
    accent: '#f59e0b',
    shapes: ['plate', 'plate', 'plate', 'plate', 'plate'],
    tagline: 'Collect visits and unlock rewards',
  },
  laundry: {
    label: 'Laundry',
    accent: '#38bdf8',
    shapes: ['bubble', 'bubble', 'bubble', 'bubble', 'bubble'],
    tagline: 'Fresh rewards every visit',
  },
  barber: {
    label: 'Barber',
    accent: '#eab308',
    shapes: ['blade', 'blade', 'blade', 'blade', 'blade'],
    tagline: 'Grooming rewards',
  },
  beauty: {
    label: 'Beauty',
    accent: '#f472b6',
    shapes: ['spark', 'spark', 'spark', 'spark', 'spark'],
    tagline: 'Beauty loyalty rewards',
  },
  retail: {
    label: 'Rewards',
    accent: '#8b5cf6',
    shapes: ['gift', 'gift', 'gift', 'gift', 'gift'],
    tagline: 'Loyalty made simple',
  },
};

const clamp = (number, min, max) => Math.max(min, Math.min(number, max));

const isLight = (hex) => {
  const value = String(hex || '').replace('#', '');
  if (value.length !== 6) return false;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
};

const drawRoundRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const drawShape = (ctx, kind, x, y, size, active, colors) => {
  ctx.save();
  ctx.globalAlpha = active ? 1 : 0.28;
  ctx.strokeStyle = active ? colors.text : colors.inactive;
  ctx.fillStyle = active ? colors.accent : 'transparent';
  ctx.lineWidth = 8;

  if (kind === 'cup') {
    drawRoundRect(ctx, x - size * 0.34, y - size * 0.22, size * 0.68, size * 0.52, 12);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + size * 0.34, y, size * 0.14, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.45, y + size * 0.36);
    ctx.lineTo(x + size * 0.45, y + size * 0.36);
    ctx.stroke();
  } else if (kind === 'plate') {
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.42, size * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.2, y - size * 0.42);
    ctx.lineTo(x - size * 0.2, y + size * 0.35);
    ctx.moveTo(x + size * 0.2, y - size * 0.42);
    ctx.lineTo(x + size * 0.2, y + size * 0.35);
    ctx.stroke();
  } else if (kind === 'bubble') {
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(x + (i - 1.5) * size * 0.18, y + (i % 2 ? 1 : -1) * size * 0.12, size * (0.13 + i * 0.02), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === 'blade') {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.45, y + size * 0.26);
    ctx.lineTo(x + size * 0.36, y - size * 0.32);
    ctx.lineTo(x + size * 0.18, y + size * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'spark') {
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.5);
    ctx.lineTo(x + size * 0.13, y - size * 0.12);
    ctx.lineTo(x + size * 0.5, y);
    ctx.lineTo(x + size * 0.13, y + size * 0.12);
    ctx.lineTo(x, y + size * 0.5);
    ctx.lineTo(x - size * 0.13, y + size * 0.12);
    ctx.lineTo(x - size * 0.5, y);
    ctx.lineTo(x - size * 0.13, y - size * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    drawRoundRect(ctx, x - size * 0.34, y - size * 0.24, size * 0.68, size * 0.58, 10);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size * 0.42, y - size * 0.04);
    ctx.lineTo(x + size * 0.42, y - size * 0.04);
    ctx.moveTo(x, y - size * 0.36);
    ctx.lineTo(x, y + size * 0.38);
    ctx.stroke();
  }
  ctx.restore();
};

const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));

export const stampTemplateOptions = Object.entries(templates).map(([value, item]) => ({
  value,
  label: item.label,
}));

export const generateStampTierImages = async ({
  storeName,
  template = 'cafe',
  cardBgColor = '#4b2a25',
  cardTextColor = '#ffffff',
  stampActiveColor,
  stampInactiveColor,
  totalStamps = 5,
  title,
  subtitle,
  stampLabel = 'STAMP',
}) => {
  const selected = templates[template] || templates.cafe;
  const total = clamp(Number(totalStamps) || 5, 1, 5);
  const text = cardTextColor || (isLight(cardBgColor) ? '#171717' : '#ffffff');
  const accent = stampActiveColor || selected.accent;
  const inactive = stampInactiveColor || `${text}66`;
  const images = [];

  for (let tier = 0; tier <= 5; tier += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, cardBgColor || '#4b2a25');
    gradient.addColorStop(1, `${cardBgColor || '#4b2a25'}dd`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(WIDTH * 0.92, HEIGHT * 0.08, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = text;
    ctx.textAlign = 'left';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.fillText(String(title || storeName || 'LOYALTY').slice(0, 22).toUpperCase(), 62, 104);
    ctx.font = '26px Arial, sans-serif';
    ctx.globalAlpha = 0.82;
    ctx.fillText(String(subtitle || selected.tagline).slice(0, 48), 68, 385);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'right';
    ctx.font = 'bold 34px Arial, sans-serif';
    ctx.fillText('STAMPS', WIDTH - 66, 72);
    ctx.font = 'bold 60px Arial, sans-serif';
    ctx.fillText(`${Math.min(tier, total)}/${total}`, WIDTH - 66, 132);

    const spacing = WIDTH / 6.4;
    const startX = WIDTH * 0.2;
    const y = 238;
    for (let index = 0; index < 5; index += 1) {
      const x = startX + index * spacing;
      drawShape(ctx, selected.shapes[index] || 'gift', x, y, 126, index < tier, {
        text,
        accent,
        inactive,
      });
      ctx.fillStyle = text;
      ctx.globalAlpha = index < tier ? 0.95 : 0.45;
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(stampLabel || 'STAMP').slice(0, 10).toUpperCase(), x, y + 74);
      ctx.globalAlpha = 1;
    }

    images.push({
      tier,
      blob: await canvasToBlob(canvas),
      dataUrl: canvas.toDataURL('image/png'),
    });
  }

  return images;
};

export const generateStampTierBlobs = async (options) => {
  const images = await generateStampTierImages(options);
  return images.map(({ tier, blob }) => ({ tier, blob }));
};
