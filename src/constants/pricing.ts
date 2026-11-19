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

export const BLOCKED_HOLIDAY_MONTH_DAYS: Record<string, string> = {
  '12-25': 'Natal (25/12) — não realizamos atendimentos nesta data.',
  '12-31': 'Ano Novo (31/12) — não realizamos atendimentos nesta data.',
};

export function getBlockedDateReason(dateStr: string): string | null {
  if (!dateStr || dateStr.length < 10) return null;
  const monthDay = dateStr.slice(5, 10);
  return BLOCKED_HOLIDAY_MONTH_DAYS[monthDay] ?? null;
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
