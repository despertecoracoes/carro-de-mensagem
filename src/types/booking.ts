export type OccasionType =
  | 'Aniversário'
  | 'Reconciliação'
  | 'Declaração de Amor'
  | 'Homenagem Especial';

export type GiftOption = 'nenhum' | 'champanhe' | 'chocolate' | 'ambos';

export type PropertyType = 'Casa' | 'Prédio' | 'Comércio';

export type MessageSource = 'cliente' | 'empresa';

export type BookingStatus =
  | 'Pendente'
  | 'Confirmado'
  | 'Em Rota'
  | 'Concluído'
  | 'Cancelado';

export interface Booking {
  id: string;
  ownerUid?: string;
  slotId?: string;
  protocol: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  occasion: OccasionType;
  honoreeName: string;
  honoreeAge: string;
  clientName: string;
  clientWhatsapp: string;
  neighborhood: string;
  streetAddress: string;
  propertyType: PropertyType;
  referencePoint: string;
  giftOption: GiftOption;
  includeFireworks: boolean;
  songs: [string, string, string];
  messageSource: MessageSource;
  customMessage: string;
  generatedScript: string;
  basePrice: number;
  extrasPrice: number;
  totalPrice: number;
  status: BookingStatus;
  notes: string;
  lgpdConsent?: boolean;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  lgpdConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramPost {
  id: string;
  title: string;
  instagramUrl: string;
  viewsLabel: string;
  occasion: string;
  order: number;
  updatedAt: string;
}

export type SlotState = 'available' | 'booked' | 'blocked';

export interface TimeSlotAvailability {
  time: string;
  state: SlotState;
  booking?: {
    id: string;
    protocol: string;
    clientName: string;
    honoreeName: string;
    occasion: OccasionType;
    neighborhood: string;
    status: BookingStatus;
  };
}

export interface AvailabilityResponse {
  date: string;
  slots: TimeSlotAvailability[];
  standardSlots: string[];
}

export type TemplateCategory =
  | 'Boas-vindas e Triagem'
  | 'Endereço e Orçamento'
  | 'Pacotes e Opcionais'
  | 'Dúvidas Frequentes'
  | 'Fechamento e Pix'
  | 'Confirmação e Rota';

export interface QuickTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  content: string;
  updatedAt: string;
}
