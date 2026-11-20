import { GiftOption, OccasionType, TemplateCategory } from '../types/booking';

export const STANDARD_TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

export const RECIFE_TIMEZONE = 'America/Recife';
export const MIN_BOOKING_LEAD_MINUTES = 120; // 2 horas de antecedência mínima

export const BLOCKED_HOLIDAY_MONTH_DAYS: Record<string, string> = {
  '12-25': 'Natal (25/12) — não realizamos atendimentos nesta data.',
  '12-31': 'Ano Novo (31/12) — não realizamos atendimentos nesta data.',
};

export function getBlockedDateReason(dateStr: string): string | null {
  if (!dateStr || dateStr.length < 10) return null;
  const monthDay = dateStr.slice(5, 10);
  return BLOCKED_HOLIDAY_MONTH_DAYS[monthDay] ?? null;
}

export function getRecifeNowParts(referenceDate = new Date()): {
  date: string;
  time: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: RECIFE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(referenceDate);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { date, time, year, month, day, hour, minute };
}

export function getRecifeDateString(
  offsetDays = 0,
  referenceDate = new Date()
): string {
  const now = getRecifeNowParts(referenceDate);
  const utcDate = new Date(Date.UTC(now.year, now.month - 1, now.day + offsetDays));
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getSlotCutoffReason(
  dateStr: string,
  timeStr: string,
  referenceDate = new Date()
): 'past' | 'lead_time' | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) {
    return 'past';
  }
  const [sYear, sMonth, sDay] = dateStr.split('-').map(Number);
  const [sHour, sMinute] = timeStr.split(':').map(Number);
  const now = getRecifeNowParts(referenceDate);

  const slotUtcMs = Date.UTC(sYear, sMonth - 1, sDay, sHour, sMinute);
  const nowUtcMs = Date.UTC(
    now.year,
    now.month - 1,
    now.day,
    now.hour,
    now.minute
  );
  const diffMinutes = Math.floor((slotUtcMs - nowUtcMs) / 60000);

  if (diffMinutes <= 0) return 'past';
  if (diffMinutes < MIN_BOOKING_LEAD_MINUTES) return 'lead_time';
  return null;
}

export function getBookingLeadTimeError(
  dateStr: string,
  timeStr: string,
  referenceDate = new Date()
): string | null {
  const reason = getSlotCutoffReason(dateStr, timeStr, referenceDate);
  if (reason === 'past') {
    return 'Esse horário já passou. Escolha um horário futuro disponível.';
  }
  if (reason === 'lead_time') {
    return 'Agendamentos automáticos pelo site exigem no mínimo 2 horas de antecedência (preparo e trajeto a partir do Ipsep). Escolha um horário mais tarde ou consulte encaixe no WhatsApp.';
  }
  return null;
}

export const OCCASIONS: {
  value: OccasionType;
  label: string;
  summary: string;
}[] = [
  {
    value: 'Aniversário',
    label: 'Aniversário',
    summary: 'Celebração festiva com parabéns ao vivo e homenagem personalizada.',
  },
  {
    value: 'Reconciliação',
    label: 'Reconciliação',
    summary: 'Mensagem sensível e respeitosa para reaproximar com emoção.',
  },
  {
    value: 'Declaração de Amor',
    label: 'Declaração de Amor',
    summary: 'Surpresa romântica com trilha sonora escolhida pelo casal.',
  },
  {
    value: 'Homenagem Especial',
    label: 'Homenagem Especial',
    summary: 'Dia das Mães, formatura, boas-vindas ou agradecimento especial.',
  },
];

export const COMPANY_WHATSAPP_NUMBER = '5581999261694';
export const COMPANY_WHATSAPP_DISPLAY = '(81) 99926-1694';
export const COMPANY_ADDRESS =
  'Rua Rio Amazonas, S/N, Bloco 86G, Quadra 2 — Ipsep, Recife - PE';

export function buildCompanyWhatsappUrl(message?: string): string {
  const text =
    message ??
    'Olá! Vim pelo site da Desperte Corações e gostaria de atendimento para agendar uma homenagem.';
  return `https://wa.me/${COMPANY_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export interface NeighborhoodZone {
  id: string;
  label: string;
  basePrice: number;
}

export const MINIMUM_BASE_PRICE = 250;
export const RESERVATION_DEPOSIT_BRL = 50;

export const NEIGHBORHOOD_ZONES: NeighborhoodZone[] = [
  {
    id: 'ipsep',
    label: 'Ipsep',
    basePrice: 250,
  },
  {
    id: 'ibura-baixo',
    label: 'Ibura de Baixo / Imbiribeira / Areias / Jordão Baixo',
    basePrice: 260,
  },
  {
    id: 'recife-centro-sul',
    label: 'São José / Boa Viagem / Afogados / Boa Vista / Pina',
    basePrice: 270,
  },
  {
    id: 'recife-norte-oeste-proximo',
    label: 'Madalena / Torre / Graças / Espinheiro / Tejipió / Coqueiral',
    basePrice: 280,
  },
  {
    id: 'ur11-cohab-piedade',
    label: 'UR-11 / Cohab / Ibura de Cima / Piedade / Casa Amarela',
    basePrice: 290,
  },
  {
    id: 'varzea-candeias-olinda',
    label: 'Várzea / Caxangá / Candeias / Barra de Jangada',
    basePrice: 310,
  },
  {
    id: 'olinda-rmr',
    label: 'Olinda / Camaragibe / Paulista / Região Metropolitana',
    basePrice: 350,
  },
];

export const GIFT_OPTIONS: {
  value: GiftOption;
  label: string;
  price: number;
  description: string;
}[] = [
  {
    value: 'champanhe',
    label: 'Champanhe (Espumante)',
    price: 0,
    description: 'Já incluso no pacote! Espumante gelado para celebrar na homenagem.',
  },
  {
    value: 'chocolate',
    label: 'Caixa de Chocolates Finos',
    price: 0,
    description: 'Já incluso no pacote! Caixa artesanal de chocolates entregue na hora.',
  },
  {
    value: 'ambos',
    label: 'Levar os dois (Champanhe + Chocolate)',
    price: 30,
    description: 'O primeiro mimo já é incluso; adicional referente apenas ao segundo item.',
  },
  {
    value: 'nenhum',
    label: 'Não preciso de brinde',
    price: 0,
    description: 'Apenas a apresentação completa do carro com locução e 3 músicas.',
  },
];

export const FIREWORKS_PRICE = 0;

export const INCLUDED_FIREWORKS = [
  '1x Fogos 12x1',
  'Chuva de Prata',
  'Árvore de Natal (Vulcão)',
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'Boas-vindas e Triagem',
  'Endereço e Orçamento',
  'Pacotes e Opcionais',
  'Dúvidas Frequentes',
  'Fechamento e Pix',
  'Confirmação e Rota',
];

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function calculatePrices(
  basePriceOrNeighborhood: number | string,
  giftOption: GiftOption,
  includeFireworks: boolean
): { basePrice: number; extrasPrice: number; totalPrice: number } {
  let basePrice = MINIMUM_BASE_PRICE;
  if (typeof basePriceOrNeighborhood === 'number' && Number.isFinite(basePriceOrNeighborhood)) {
    basePrice = Math.max(MINIMUM_BASE_PRICE, Math.round(basePriceOrNeighborhood));
  } else if (typeof basePriceOrNeighborhood === 'string') {
    const matchedZone = NEIGHBORHOOD_ZONES.find(
      (z) => z.label === basePriceOrNeighborhood || z.id === basePriceOrNeighborhood
    );
    basePrice = matchedZone ? matchedZone.basePrice : MINIMUM_BASE_PRICE;
  }

  const giftPrice = GIFT_OPTIONS.find((g) => g.value === giftOption)?.price ?? 0;
  const fireworksPrice = includeFireworks ? FIREWORKS_PRICE : 0;
  const extrasPrice = giftPrice + fireworksPrice;
  return {
    basePrice,
    extrasPrice,
    totalPrice: basePrice + extrasPrice,
  };
}
