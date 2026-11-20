import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Gift,
  Heart,
  MapPin,
  MessageCircle,
  Music,
  Phone,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Video,
  Wine,
  X,
} from 'lucide-react';
import {
  AvailabilityResponse,
  Booking,
  GiftOption,
  InstagramPost,
  MessageSource,
  OccasionType,
  PaymentSettings,
  PropertyType,
} from '../types/booking';
import {
  buildCompanyWhatsappUrl,
  calculatePrices,
  COMPANY_ADDRESS,
  COMPANY_WHATSAPP_DISPLAY,
  FIREWORKS_PRICE,
  formatBRL,
  getBlockedDateReason,
  getBookingLeadTimeError,
  getRecifeDateString,
  getSlotCutoffReason,
  GIFT_OPTIONS,
  OCCASIONS,
  RESERVATION_DEPOSIT_BRL,
  STANDARD_TIME_SLOTS,
} from '../constants/pricing';
import {
  AddressPriceResult,
  calculateAddressPrice,
  lookupCep,
  SUGGESTED_CITIES,
  SUGGESTED_NEIGHBORHOODS,
} from '../lib/addressPricing';
import { User } from 'firebase/auth';
import {
  createBookingApi,
  fetchAvailability,
  fetchInstagramPosts,
  fetchPaymentSettings,
  generateAiMessageApi,
  subscribeAvailability,
} from '../lib/api';
import { buildPixPayload, generatePixQrDataUrl } from '../lib/pix';
import { signOutUser } from '../lib/firebase';
import { AuthPanel } from './AuthPanel';
import { HumanVerification } from './HumanVerification';
import { PrivacyModal } from './PrivacyModal';
import HERO_IMAGE from '../assets/images/hero_carro_desperte.jpg';

const FAQ_ITEMS = [
  {
    question: 'Quanto tempo dura a homenagem ao vivo?',
    answer:
      'Em média de 30 a 50 minutos no local, com locução ao vivo, 3 músicas escolhidas por você, leitura da mensagem personalizada, entrega do mimo em mãos e 3 queimas de fogos (quando selecionadas).',
  },
  {
    question: 'Como funciona o sinal de R$ 50,00 via Pix para confirmar?',
    answer:
      'Ao concluir o agendamento automático, seu horário é bloqueado imediatamente na agenda. Para confirmar a reserva em definitivo, solicitamos um sinal de R$ 50,00 via Pix (com QR Code ou chave enviada no WhatsApp) e o restante pode ser acertado no dia.',
  },
  {
    question: 'Posso agendar sem fazer cadastro ou login no site?',
    answer:
      'Sim! Quem entra com Google ou e-mail verificado trava o horário na agenda na hora. Mas se preferir não se cadastrar, basta preencher o que desejar e clicar em "Prefere sem cadastro? Enviar no WhatsApp" no resumo.',
  },
  {
    question: 'Vocês atendem prédios, condomínios fechados e locais de trabalho?',
    answer:
      'Sim. Atendemos casas, prédios, condomínios e estabelecimentos comerciais. Avisamos pelo WhatsApp minutos antes da chegada para você chamar o(a) homenageado(a) até a portaria, varanda ou frente do local.',
  },
  {
    question: 'Os fogos de artifício são obrigatórios?',
    answer:
      'Não. Os 3 fogos (12x1, Chuva de Prata e Vulcão) já estão inclusos sem custo adicional, mas se o local tiver restrição ou você preferir sem fogos, é só desmarcar a opção na Etapa 3.',
  },
  {
    question: 'Qual a antecedência mínima para agendar pelo site?',
    answer:
      'Para agendamentos automáticos no site, pedimos no mínimo 2 horas de antecedência (ex.: às 12h o site libera a partir das 14h), garantindo tempo para preparo e deslocamento a partir do Ipsep. Se precisar para antes de 2h, fale direto no WhatsApp para consultarmos encaixe.',
  },
  {
    question: 'E se chover ou precisar alterar o horário?',
    answer:
      'Nossa equipe acompanha a previsão com você pelo WhatsApp. Se houver chuva forte que impeça a homenagem com segurança, alinhamos juntos o melhor horário ou nova data.',
  },
];

const HIGHLIGHT_VIDEO_CUTS = [
  {
    id: 'corte-1',
    title: 'Bastidores do Carro de Mensagem',
    occasion: 'Preparação & Som',
    videoSrc: './assets/videos/corte_bastidores_carro.mp4',
    posterSrc: './assets/videos/corte_bastidores_carro.jpg',
  },
  {
    id: 'corte-2',
    title: 'Declaração Emocionante para o Marido',
    occasion: 'Declaração de Amor',
    videoSrc: './assets/videos/corte_declaracao_marido.mp4',
    posterSrc: './assets/videos/corte_declaracao_marido.jpg',
  },
  {
    id: 'corte-3',
    title: 'Surpresa de Aniversário com Bolo',
    occasion: 'Aniversário',
    videoSrc: './assets/videos/corte_aniversario_bolo.mp4',
    posterSrc: './assets/videos/corte_aniversario_bolo.jpg',
  },
  {
    id: 'corte-4',
    title: 'Homenagem em Boa Viagem para Mãe',
    occasion: 'Homenagem Especial',
    videoSrc: './assets/videos/corte_boa_viagem_mae.mp4',
    posterSrc: './assets/videos/corte_boa_viagem_mae.jpg',
  },
  {
    id: 'corte-5',
    title: 'Reconciliação com Microfone ao Vivo',
    occasion: 'Reconciliação',
    videoSrc: './assets/videos/corte_reconciliacao_surpresa.mp4',
    posterSrc: './assets/videos/corte_reconciliacao_surpresa.jpg',
  },
];

const DRAFT_STORAGE_KEY = 'desperte_booking_draft_v1';

const BOOKING_SLIDES = [
  { id: 0, code: '01', shortLabel: 'Data e Hora' },
  { id: 1, code: '02', shortLabel: 'Tema e Dados' },
  { id: 2, code: '03', shortLabel: 'Endereço' },
  { id: 3, code: '04', shortLabel: 'Brinde e Músicas' },
  { id: 4, code: '05', shortLabel: 'Mensagem' },
] as const;

interface BookingDraft {
  currentStep?: number;
  selectedDate?: string;
  selectedTime?: string;
  occasion?: OccasionType;
  honoreeName?: string;
  honoreeAge?: string;
  clientName?: string;
  clientWhatsapp?: string;
  cep?: string;
  city?: string;
  neighborhood?: string;
  streetAddress?: string;
  propertyType?: PropertyType;
  referencePoint?: string;
  giftOption?: GiftOption;
  includeFireworks?: boolean;
  song1?: string;
  song2?: string;
  song3?: string;
  messageSource?: MessageSource;
  participationMode?:
    | 'Microfone ao vivo (até 5 pessoas)'
    | 'Envio de até 10 áudios (máx. 40s cada)'
    | 'Apenas locução do carro';
  customMessage?: string;
  generatedScript?: string;
  messageTone?: string;
}

function readSavedDraft(): BookingDraft {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return {};
  }
}

function getFirstOpenDateString(): string {
  const now = new Date();
  for (let i = 0; i < 14; i += 1) {
    const candidate = getRecifeDateString(i, now);
    if (getBlockedDateReason(candidate)) continue;
    const hasOpenSlot = STANDARD_TIME_SLOTS.some(
      (slot) => getSlotCutoffReason(candidate, slot, now) === null
    );
    if (hasOpenSlot) return candidate;
  }
  return getRecifeDateString(1, now);
}

function formatDatePtBr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function formatCepInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function toInstagramEmbedUrl(url: string): string | null {
  const match = url.match(/instagram\.com\/(reel|p|tv)\/([a-zA-Z0-9_\-]+)/i);
  if (!match) return null;
  return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/embed/captioned/`;
}

interface BookingSiteProps {
  user: User | null;
  refreshSignal?: number;
  onBookingCreated: (booking: Booking) => void;
  onOpenAccount: () => void;
}

export const BookingSite: React.FC<BookingSiteProps> = ({
  user,
  refreshSignal = 0,
  onBookingCreated,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const [initialDraft] = useState<BookingDraft>(() => readSavedDraft());
  const [currentStep, setCurrentStep] = useState<number>(() =>
    typeof initialDraft.currentStep === 'number' &&
    initialDraft.currentStep >= 0 &&
    initialDraft.currentStep <= 4
      ? initialDraft.currentStep
      : 0
  );
  const [stepError, setStepError] = useState('');

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = getRecifeDateString(0);
    if (
      initialDraft.selectedDate &&
      initialDraft.selectedDate >= today &&
      !getBlockedDateReason(initialDraft.selectedDate)
    ) {
      return initialDraft.selectedDate;
    }
    return getFirstOpenDateString();
  });
  const [selectedTime, setSelectedTime] = useState<string>(
    () => initialDraft.selectedTime || ''
  );
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [occasion, setOccasion] = useState<OccasionType>(
    () => initialDraft.occasion || 'Aniversário'
  );
  const [honoreeName, setHonoreeName] = useState(
    () => initialDraft.honoreeName || ''
  );
  const [honoreeAge, setHonoreeAge] = useState(
    () => initialDraft.honoreeAge || ''
  );
  const [clientName, setClientName] = useState(() => initialDraft.clientName || '');
  const [clientWhatsapp, setClientWhatsapp] = useState(
    () => initialDraft.clientWhatsapp || ''
  );

  const [cep, setCep] = useState(() => initialDraft.cep || '');
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [city, setCity] = useState(() => initialDraft.city || 'Recife');
  const [neighborhood, setNeighborhood] = useState(
    () => initialDraft.neighborhood || ''
  );
  const [streetAddress, setStreetAddress] = useState(
    () => initialDraft.streetAddress || ''
  );
  const [propertyType, setPropertyType] = useState<PropertyType>(
    () => initialDraft.propertyType || 'Casa'
  );
  const [referencePoint, setReferencePoint] = useState(
    () => initialDraft.referencePoint || ''
  );
  const [addressPrice, setAddressPrice] = useState<AddressPriceResult | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [priceHint, setPriceHint] = useState('');
  const latestCalcIdRef = useRef(0);

  const [giftOption, setGiftOption] = useState<GiftOption>(
    () => initialDraft.giftOption || 'champanhe'
  );
  const [includeFireworks, setIncludeFireworks] = useState<boolean>(
    () => initialDraft.includeFireworks ?? true
  );

  const [song1, setSong1] = useState(() => initialDraft.song1 || '');
  const [song2, setSong2] = useState(() => initialDraft.song2 || '');
  const [song3, setSong3] = useState(() => initialDraft.song3 || '');

  const [messageSource, setMessageSource] = useState<MessageSource>(
    () => initialDraft.messageSource || 'empresa'
  );
  const [participationMode, setParticipationMode] = useState<
    'Microfone ao vivo (até 5 pessoas)' | 'Envio de até 10 áudios (máx. 40s cada)' | 'Apenas locução do carro'
  >(
    () =>
      initialDraft.participationMode || 'Microfone ao vivo (até 5 pessoas)'
  );
  const [customMessage, setCustomMessage] = useState(
    () => initialDraft.customMessage || ''
  );
  const [generatedScript, setGeneratedScript] = useState(
    () => initialDraft.generatedScript || ''
  );
  const [messageTone, setMessageTone] = useState(
    () => initialDraft.messageTone || 'Emocionante e caloroso'
  );
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  const [humanVerified, setHumanVerified] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(
    null
  );
  const [pixPayload, setPixPayload] = useState('');
  const [pixQrUrl, setPixQrUrl] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    try {
      const draft: BookingDraft = {
        currentStep,
        selectedDate,
        selectedTime,
        occasion,
        honoreeName,
        honoreeAge,
        clientName,
        clientWhatsapp,
        cep,
        city,
        neighborhood,
        streetAddress,
        propertyType,
        referencePoint,
        giftOption,
        includeFireworks,
        song1,
        song2,
        song3,
        messageSource,
        participationMode,
        customMessage,
        generatedScript,
        messageTone,
      };
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage quota errors
    }
  }, [
    currentStep,
    selectedDate,
    selectedTime,
    occasion,
    honoreeName,
    honoreeAge,
    clientName,
    clientWhatsapp,
    cep,
    city,
    neighborhood,
    streetAddress,
    propertyType,
    referencePoint,
    giftOption,
    includeFireworks,
    song1,
    song2,
    song3,
    messageSource,
    participationMode,
    customMessage,
    generatedScript,
    messageTone,
  ]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedTime) return;
    if (getSlotCutoffReason(selectedDate, selectedTime, new Date(nowTick)) !== null) {
      setSelectedTime('');
    }
  }, [selectedDate, selectedTime, nowTick]);

  const todayRecife = useMemo(
    () => getRecifeDateString(0, new Date(nowTick)),
    [nowTick]
  );

  const quickDates = useMemo(
    () => {
      const refNow = new Date(nowTick);
      return [
        { label: 'Hoje', date: getRecifeDateString(0, refNow) },
        { label: 'Amanhã', date: getRecifeDateString(1, refNow) },
        { label: 'Em 2 dias', date: getRecifeDateString(2, refNow) },
        { label: 'Próxima semana', date: getRecifeDateString(7, refNow) },
      ].map((item) => ({
        ...item,
        blockedReason: getBlockedDateReason(item.date),
      }));
    },
    [nowTick]
  );

  const selectedDateBlockedReason = useMemo(
    () => availability?.blockedReason ?? getBlockedDateReason(selectedDate),
    [availability?.blockedReason, selectedDate]
  );

  const loadSlots = useCallback(async (dateToLoad: string) => {
    setLoadingSlots(true);
    setSlotsError('');
    try {
      const res = await fetchAvailability(dateToLoad);
      setAvailability(res);
      setSelectedTime((prev) => {
        if (!prev) return '';
        const stillOpen =
          res.slots.some((s) => s.time === prev && s.state === 'available') &&
          getSlotCutoffReason(dateToLoad, prev) === null;
        return stillOpen ? prev : '';
      });
    } catch (err) {
      setSlotsError(
        err instanceof Error ? err.message : 'Falha ao carregar horários.'
      );
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    setLoadingSlots(true);
    setSlotsError('');
    const unsub = subscribeAvailability(
      selectedDate,
      (res) => {
        setAvailability(res);
        setLoadingSlots(false);
        setSelectedTime((prev) => {
          if (!prev) return '';
          const stillOpen =
            res.slots.some((s) => s.time === prev && s.state === 'available') &&
            getSlotCutoffReason(selectedDate, prev) === null;
          return stillOpen ? prev : '';
        });
      },
      (err) => {
        setSlotsError(err.message || 'Falha ao carregar horários.');
        setLoadingSlots(false);
      }
    );
    return () => unsub();
  }, [selectedDate]);

  useEffect(() => {
    fetchInstagramPosts()
      .then(setInstagramPosts)
      .catch(() => {
        // Public fallback showcase remains visible if unavailable
      });
  }, [refreshSignal]);

  useEffect(() => {
    if (!user || !user.emailVerified) {
      setPaymentSettings(null);
      return;
    }
    fetchPaymentSettings()
      .then(setPaymentSettings)
      .catch(() => setPaymentSettings(null));
  }, [user, refreshSignal]);

  useEffect(() => {
    const cleanKey = paymentSettings?.pixKey?.trim() || '';
    if (!confirmedBooking || !cleanKey) {
      setPixPayload('');
      setPixQrUrl('');
      return;
    }
    let cancelled = false;
    const deposit =
      paymentSettings?.depositAmount && paymentSettings.depositAmount > 0
        ? paymentSettings.depositAmount
        : RESERVATION_DEPOSIT_BRL;
    const payload = buildPixPayload({
      pixKey: cleanKey,
      merchantName: paymentSettings?.merchantName || 'Desperte Coracoes',
      merchantCity: paymentSettings?.merchantCity || 'RECIFE',
      amount: deposit,
      txid: confirmedBooking.protocol,
    });
    setPixPayload(payload);
    generatePixQrDataUrl(payload)
      .then((url) => {
        if (!cancelled) setPixQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPixQrUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [confirmedBooking, paymentSettings]);

  const runAddressCalculation = useCallback(
    async (nextStreet: string, nextNeighborhood: string, nextCity: string) => {
      const hasAddress =
        nextNeighborhood.trim().length >= 2 || nextStreet.trim().length >= 4;
      if (!hasAddress) {
        setAddressPrice(null);
        setPriceHint('');
        return null;
      }

      const calcId = ++latestCalcIdRef.current;
      setCalculatingPrice(true);
      setPriceHint('');
      try {
        const result = await calculateAddressPrice({
          streetAddress: nextStreet,
          neighborhood: nextNeighborhood,
          city: nextCity,
        });
        if (calcId !== latestCalcIdRef.current) return null;
        setAddressPrice(result);
        return result;
      } catch {
        if (calcId === latestCalcIdRef.current) {
          setPriceHint(
            'Não foi possível localizar a distância exata agora; informe bairro e cidade para estimar.'
          );
        }
        return null;
      } finally {
        if (calcId === latestCalcIdRef.current) {
          setCalculatingPrice(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (neighborhood.trim().length >= 2 || streetAddress.trim().length >= 4) {
        runAddressCalculation(streetAddress, neighborhood, city);
      } else {
        setAddressPrice(null);
      }
    }, 550);
    return () => clearTimeout(timer);
  }, [streetAddress, neighborhood, city, runAddressCalculation]);

  const handleCepChange = async (raw: string) => {
    const formatted = formatCepInput(raw);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      setLookingUpCep(true);
      setPriceHint('');
      const found = await lookupCep(digits);
      setLookingUpCep(false);
      if (found) {
        const nextStreet = found.streetAddress
          ? found.streetAddress
          : streetAddress;
        const nextNeighborhood = found.neighborhood || neighborhood;
        const nextCity = found.city || city;
        if (found.streetAddress) setStreetAddress(found.streetAddress);
        if (found.neighborhood) setNeighborhood(found.neighborhood);
        if (found.city) setCity(found.city);
        await runAddressCalculation(nextStreet, nextNeighborhood, nextCity);
      } else {
        setPriceHint(
          'CEP não encontrado automaticamente. Digite cidade, bairro e rua abaixo.'
        );
      }
    }
  };

  const pricing = useMemo(
    () =>
      calculatePrices(
        addressPrice?.basePrice ?? neighborhood,
        giftOption,
        includeFireworks
      ),
    [addressPrice, neighborhood, giftOption, includeFireworks]
  );

  const depositAmount =
    paymentSettings?.depositAmount && paymentSettings.depositAmount > 0
      ? paymentSettings.depositAmount
      : RESERVATION_DEPOSIT_BRL;

  const handleGenerateAiScript = async () => {
    if (!honoreeName.trim()) {
      setAiError('Informe o nome de quem vai receber a homenagem antes de gerar.');
      return;
    }
    setAiError('');
    setGeneratingAi(true);
    try {
      const result = await generateAiMessageApi({
        occasion,
        honoreeName: honoreeName.trim(),
        honoreeAge: honoreeAge.trim(),
        senderName: clientName.trim() || 'Quem te ama muito',
        songs: [song1, song2, song3],
        tone: messageTone,
      });
      setGeneratedScript(result.script);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Erro ao gerar mensagem automática.'
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  const isStepCompleted = useCallback(
    (stepIdx: number): boolean => {
      if (stepIdx === 0) return Boolean(selectedDate && selectedTime);
      if (stepIdx === 1) {
        return Boolean(
          honoreeName.trim() && clientName.trim() && clientWhatsapp.trim()
        );
      }
      if (stepIdx === 2) {
        return Boolean(neighborhood.trim() && streetAddress.trim());
      }
      if (stepIdx === 3) {
        return Boolean(song1.trim() && song2.trim() && song3.trim());
      }
      if (stepIdx === 4) {
        return messageSource === 'empresa' || Boolean(customMessage.trim());
      }
      return false;
    },
    [
      selectedDate,
      selectedTime,
      honoreeName,
      clientName,
      clientWhatsapp,
      neighborhood,
      streetAddress,
      song1,
      song2,
      song3,
      messageSource,
      customMessage,
    ]
  );

  const validateSingleStep = (stepIdx: number): string | null => {
    if (stepIdx === 0) {
      if (selectedDateBlockedReason) {
        return `Data indisponível: ${selectedDateBlockedReason} Escolha outra data.`;
      }
      if (!selectedTime) {
        return 'Escolha um horário disponível antes de avançar.';
      }
      const leadTimeError = getBookingLeadTimeError(selectedDate, selectedTime);
      if (leadTimeError) {
        setSelectedTime('');
        return leadTimeError;
      }
    }
    if (
      stepIdx === 1 &&
      (!honoreeName.trim() || !clientName.trim() || !clientWhatsapp.trim())
    ) {
      return 'Preencha o nome do homenageado, seu nome e seu WhatsApp.';
    }
    if (stepIdx === 2 && (!neighborhood.trim() || !streetAddress.trim())) {
      return 'Informe o bairro, a rua e o número do endereço da homenagem.';
    }
    if (
      stepIdx === 3 &&
      (!song1.trim() || !song2.trim() || !song3.trim())
    ) {
      return 'Preencha os nomes das 3 músicas que devem tocar no carro.';
    }
    if (stepIdx === 4 && messageSource === 'cliente' && !customMessage.trim()) {
      return 'Digite o texto da mensagem ou selecione para a empresa gerar.';
    }
    return null;
  };

  const handleGoToStep = (targetStep: number) => {
    setStepError('');
    setSubmitError('');
    setCurrentStep(Math.max(0, Math.min(4, targetStep)));
  };

  const handleNextStep = () => {
    const err = validateSingleStep(currentStep);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    setSubmitError('');
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const handlePrevStep = () => {
    setStepError('');
    setSubmitError('');
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setStepError('');

    if (selectedDateBlockedReason) {
      setCurrentStep(0);
      setSubmitError(`Data indisponível: ${selectedDateBlockedReason} Escolha outra data.`);
      return;
    }
    if (!selectedTime) {
      setCurrentStep(0);
      setSubmitError('Escolha um horário disponível na etapa 01.');
      return;
    }
    const leadTimeError = getBookingLeadTimeError(selectedDate, selectedTime);
    if (leadTimeError) {
      setCurrentStep(0);
      setSelectedTime('');
      setSubmitError(leadTimeError);
      return;
    }
    if (!honoreeName.trim() || !clientName.trim() || !clientWhatsapp.trim()) {
      setCurrentStep(1);
      setSubmitError(
        'Preencha o nome do homenageado, seu nome e seu WhatsApp na etapa 02.'
      );
      return;
    }
    if (!neighborhood.trim() || !streetAddress.trim()) {
      setCurrentStep(2);
      setSubmitError(
        'Informe o bairro, a rua e o número do endereço na etapa 03 para calcular o valor.'
      );
      return;
    }
    if (!song1.trim() || !song2.trim() || !song3.trim()) {
      setCurrentStep(3);
      setSubmitError(
        'Preencha os nomes das 3 músicas que devem tocar no carro na etapa 04.'
      );
      return;
    }
    if (messageSource === 'cliente' && !customMessage.trim()) {
      setCurrentStep(4);
      setSubmitError(
        'Digite o texto da mensagem ou selecione para a empresa gerar na etapa 05.'
      );
      return;
    }
    if (!lgpdAccepted) {
      setSubmitError(
        'Aceite a Política de Privacidade e Proteção de Dados (LGPD) para proteger seus dados.'
      );
      return;
    }
    if (!humanVerified) {
      setSubmitError('Confirme a verificação "Sou humano" antes de concluir.');
      return;
    }

    if (!user || !user.emailVerified) {
      setAuthModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      let resolvedCalc = addressPrice;
      if (!resolvedCalc) {
        resolvedCalc = await runAddressCalculation(
          streetAddress,
          neighborhood,
          city
        );
      }

      const fullNeighborhoodLabel =
        city.trim() && city.trim().toLowerCase() !== 'recife'
          ? `${neighborhood.trim()} — ${city.trim()}`
          : neighborhood.trim();

      const terrainDetail =
        resolvedCalc && resolvedCalc.terrainReasons.length > 0
          ? ` · Relevo/Acesso: ${resolvedCalc.terrainReasons.join(', ')}`
          : '';

      const booking = await createBookingApi({
        date: selectedDate,
        time: selectedTime,
        occasion,
        honoreeName: honoreeName.trim(),
        honoreeAge: honoreeAge.trim(),
        clientName: clientName.trim(),
        clientWhatsapp: clientWhatsapp.trim(),
        neighborhood: fullNeighborhoodLabel,
        streetAddress: streetAddress.trim(),
        propertyType,
        referencePoint: referencePoint.trim(),
        giftOption,
        includeFireworks,
        songs: [song1.trim(), song2.trim(), song3.trim()],
        messageSource,
        customMessage: customMessage.trim(),
        generatedScript: generatedScript.trim(),
        basePrice: resolvedCalc?.basePrice,
        notes: `Participação escolhida: ${participationMode}${
          resolvedCalc?.distanceKm ? ` · Distância estimada: ${resolvedCalc.distanceKm} km` : ''
        }${terrainDetail}`,
        lgpdConsent: true,
      });
      setConfirmedBooking(booking);
      setHumanVerified(false);
      try {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      onBookingCreated(booking);
      await loadSlots(selectedDate);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Não foi possível concluir a reserva.'
      );
      await loadSlots(selectedDate);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetBooking = () => {
    setConfirmedBooking(null);
    setCurrentStep(0);
    setStepError('');
    setSubmitError('');
    setSelectedTime('');
    setHonoreeName('');
    setHonoreeAge('');
    setCep('');
    setCity('Recife');
    setNeighborhood('');
    setStreetAddress('');
    setReferencePoint('');
    setAddressPrice(null);
    setSong1('');
    setSong2('');
    setSong3('');
    setCustomMessage('');
    setGeneratedScript('');
    setGiftOption('champanhe');
    setIncludeFireworks(true);
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
    loadSlots(selectedDate);
  };

  const buildWhatsappSummaryUrl = (booking: Booking) => {
    const giftLabel =
      GIFT_OPTIONS.find((g) => g.value === booking.giftOption)?.label ?? 'Nenhum';
    const remaining = Math.max(0, booking.totalPrice - depositAmount);
    const text = [
      `Olá! Acabei de fazer meu agendamento automático na Desperte Corações.`,
      `Protocolo: ${booking.protocol}`,
      `Data e Horário: ${formatDatePtBr(booking.date)} às ${booking.time}`,
      `Ocasião: ${booking.occasion}`,
      `Homenageado(a): ${booking.honoreeName}${booking.honoreeAge ? ` (${booking.honoreeAge} anos)` : ''}`,
      `Endereço: ${booking.streetAddress} - ${booking.neighborhood} (${booking.propertyType})`,
      booking.referencePoint ? `Referência: ${booking.referencePoint}` : '',
      `Mimos: ${giftLabel}${booking.includeFireworks ? ' + 3 Queimas de Fogos inclusas (12x1, Chuva de Prata e Vulcão)' : ''}`,
      `Músicas: 1) ${booking.songs[0]} | 2) ${booking.songs[1]} | 3) ${booking.songs[2]}`,
      `Mensagem: ${booking.messageSource === 'empresa' ? 'Gerada pela empresa' : 'Texto enviado pelo cliente'}`,
      `Total previsto: ${formatBRL(booking.totalPrice)}`,
      `Sinal via Pix: ${formatBRL(depositAmount)} (Restante no dia: ${formatBRL(remaining)})`,
      paymentSettings?.pixKey
        ? `Vou enviar o comprovante do sinal de ${formatBRL(depositAmount)} por aqui.`
        : `Pode me enviar a chave Pix para o sinal de ${formatBRL(depositAmount)}?`,
    ]
      .filter(Boolean)
      .join('\n');
    return buildCompanyWhatsappUrl(text);
  };

  const buildOutOfRegionWhatsappUrl = () => {
    const giftLabel =
      GIFT_OPTIONS.find((g) => g.value === giftOption)?.label ?? 'Champanhe';
    const text = [
      `Olá! Gostaria de solicitar um orçamento para carro de mensagem ao vivo em uma região mais distante:`,
      `Cidade / Bairro: ${city.trim() || 'A informar'} — ${neighborhood.trim() || 'A informar'}`,
      streetAddress.trim() ? `Rua / Número: ${streetAddress.trim()}` : '',
      referencePoint.trim() ? `Referência: ${referencePoint.trim()}` : '',
      `Data desejada: ${formatDatePtBr(selectedDate)}${selectedTime ? ` às ${selectedTime}` : ''}`,
      `Ocasião: ${occasion}${honoreeName.trim() ? ` (Para ${honoreeName.trim()})` : ''}`,
      `Brinde: ${giftLabel}${includeFireworks ? ' + 3 Queimas de Fogos' : ''}`,
      clientName.trim() ? `Meu nome: ${clientName.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    return buildCompanyWhatsappUrl(text);
  };

  const buildDirectWhatsappOrderUrl = () => {
    const giftLabel =
      GIFT_OPTIONS.find((g) => g.value === giftOption)?.label ?? 'Champanhe';
    const priceLabel = addressPrice?.requiresWhatsappQuote
      ? 'Combinar no WhatsApp'
      : addressPrice
        ? formatBRL(pricing.totalPrice)
        : 'A calcular pelo endereço';
    const text = [
      `Olá! Quero solicitar um agendamento de carro de mensagem (sem cadastro no site):`,
      `Data e Horário desejados: ${formatDatePtBr(selectedDate)}${selectedTime ? ` às ${selectedTime}` : ' (a combinar)'}`,
      `Ocasião: ${occasion}`,
      honoreeName.trim()
        ? `Homenageado(a): ${honoreeName.trim()}${honoreeAge.trim() ? ` (${honoreeAge.trim()} anos)` : ''}`
        : '',
      clientName.trim() ? `Meu nome: ${clientName.trim()}` : '',
      clientWhatsapp.trim() ? `Meu WhatsApp: ${clientWhatsapp.trim()}` : '',
      streetAddress.trim() || neighborhood.trim()
        ? `Endereço: ${streetAddress.trim() || 'A informar'} - ${neighborhood.trim() || 'A informar'} — ${city.trim() || 'Recife'} (${propertyType})`
        : '',
      referencePoint.trim() ? `Referência: ${referencePoint.trim()}` : '',
      `Mimos: ${giftLabel}${includeFireworks ? ' + 3 Fogos inclusos' : ' (sem fogos)'}`,
      song1.trim() || song2.trim() || song3.trim()
        ? `Músicas: 1) ${song1.trim() || '-'} | 2) ${song2.trim() || '-'} | 3) ${song3.trim() || '-'}`
        : '',
      `Participação: ${participationMode}`,
      messageSource === 'cliente' && customMessage.trim()
        ? `Mensagem: ${customMessage.trim()}`
        : 'Mensagem: Gerada pela equipe Desperte Corações',
      `Valor previsto: ${priceLabel} (Sinal de ${formatBRL(depositAmount)} via Pix para confirmar)`,
    ]
      .filter(Boolean)
      .join('\n');
    return buildCompanyWhatsappUrl(text);
  };

  return (
    <main className="pb-20">
      {/* Hero Split */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-5 sm:pt-10 pb-7 sm:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-1 sm:py-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-[#991B1B] mb-2 sm:mb-3">
                Carro de Mensagem ao Vivo · Recife, Olinda e Jaboatão dos Guararapes
              </p>
              <h1
                className="font-display font-semibold tracking-tight text-[#171412] leading-[1.08] mb-3 sm:mb-5"
                style={{
                  fontSize: 'clamp(1.75rem, 3.8vw, 3.35rem)',
                  textWrap: 'balance',
                }}
              >
                Mensagem ao Vivo Desperte Corações: marcante para quem recebe, inesquecível para quem presenteia.
              </h1>
              <p className="text-sm sm:text-lg text-[#575049] leading-relaxed max-w-xl mb-5 sm:mb-8">
                Transforme aniversários, declarações e reconciliações em momentos de pura emoção na porta de quem você ama. Escolha a data em tempo real, selecione suas 3 músicas, defina o brinde entre champanhe ou chocolate, conte com 3 queimas de fogos e personalize a locução ao vivo.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3">
              <a
                href="#agendar"
                className="col-span-2 sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-xl sm:rounded-lg transition-colors whitespace-nowrap"
              >
                <Calendar className="w-4 h-4 sm:hidden" />
                Escolher Data e Horário
              </a>
              <a
                href={buildCompanyWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl sm:rounded-lg transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">WhatsApp</span>
                <span className="hidden sm:inline">Atendimento no WhatsApp</span>
              </a>
              <a
                href="#instagram"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-medium text-[#171412] bg-white border border-[#E6E2DC] hover:border-[#CFC8BE] rounded-xl sm:rounded-lg transition-colors whitespace-nowrap"
              >
                <Video className="w-4 h-4 text-[#991B1B] shrink-0" />
                <span className="sm:hidden">Ver Vídeos</span>
                <span className="hidden sm:inline">Vídeos no @despertecoracoes</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[240px] sm:min-h-[340px] max-h-[380px] sm:max-h-[540px] rounded-xl overflow-hidden border border-[#E6E2DC] bg-[#EDE9E2]">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE}
                  alt="Carro de mensagem ao vivo Desperte Corações decorado com balões e faixa de Parabéns"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#F3EFE8] to-[#E6DFD5]">
                  <Heart className="w-10 h-10 text-[#991B1B] mb-3" />
                  <p className="font-display text-xl text-[#171412]">
                    Desperte Corações ao Vivo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mimos Section - Compact Icon Tiles */}
      <section
        id="mimos"
        className="max-w-[1280px] mx-auto px-4 sm:px-8 py-6 sm:py-8 border-t border-[#E6E2DC]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-4">
          <h2 className="font-display text-lg sm:text-2xl font-semibold text-[#171412] tracking-tight">
            Brindes e Fogos do Pacote
          </h2>
          <p className="text-xs sm:text-sm text-[#575049]">
            Toque para selecionar e ir ao agendamento
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          <button
            type="button"
            onClick={() => {
              setGiftOption('champanhe');
              document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`p-3 sm:p-4 rounded-xl border text-left transition-colors flex items-center gap-3 ${
              giftOption === 'champanhe'
                ? 'bg-[#991B1B]/5 border-[#991B1B]'
                : 'bg-white border-[#E6E2DC] hover:border-[#CFC8BE]'
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#991B1B]/10 text-[#991B1B] flex items-center justify-center shrink-0">
              <Wine className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[#171412] truncate">
                Champanhe
              </p>
              <p className="text-[11px] sm:text-xs font-medium text-[#16A34A]">
                Incluso
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setGiftOption('chocolate');
              document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`p-3 sm:p-4 rounded-xl border text-left transition-colors flex items-center gap-3 ${
              giftOption === 'chocolate'
                ? 'bg-[#991B1B]/5 border-[#991B1B]'
                : 'bg-white border-[#E6E2DC] hover:border-[#CFC8BE]'
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#991B1B]/10 text-[#991B1B] flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[#171412] truncate">
                Chocolates
              </p>
              <p className="text-[11px] sm:text-xs font-medium text-[#16A34A]">
                Incluso
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setGiftOption('ambos');
              document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`p-3 sm:p-4 rounded-xl border text-left transition-colors flex items-center gap-3 ${
              giftOption === 'ambos'
                ? 'bg-[#991B1B]/5 border-[#991B1B]'
                : 'bg-white border-[#E6E2DC] hover:border-[#CFC8BE]'
            }`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#991B1B]/10 text-[#991B1B] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[#171412] truncate">
                Os Dois Mimos
              </p>
              <p className="text-[11px] sm:text-xs font-mono font-semibold text-[#991B1B]">
                + {formatBRL(30)}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setIncludeFireworks(true);
              document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-3 sm:p-4 rounded-xl border border-[#E6E2DC] bg-white hover:border-[#CFC8BE] text-left transition-colors flex items-center gap-3"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#991B1B]/10 text-[#991B1B] flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[#171412] truncate">
                3 Fogos Inclusos
              </p>
              <p className="text-[11px] sm:text-xs text-[#575049] truncate">
                12x1, Chuva e Vulcão
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Interactive Online Automatic Booking */}
      <section
        id="agendar"
        className="max-w-[1280px] mx-auto px-4 sm:px-8 py-8 sm:py-12 border-t border-[#E6E2DC]"
      >
        <div className="mb-5 sm:mb-8">
          <h2 className="font-display text-xl sm:text-3xl font-semibold text-[#171412] tracking-tight">
            Agendamento Automático Online
          </h2>
          <p className="text-xs sm:text-base text-[#575049] mt-1">
            Horários atualizados ao vivo em 5 etapas simples.
          </p>
        </div>

        {confirmedBooking ? (
          <div className="bg-white border border-[#E6E2DC] rounded-xl p-6 sm:p-10 max-w-3xl">
            <div className="flex items-center gap-3 text-[#16A34A] mb-4">
              <Check className="w-6 h-6" />
              <span className="text-sm font-semibold">
                Agendamento Confirmado e Horário Reservado
              </span>
            </div>

            <h3 className="font-display text-2xl font-semibold text-[#171412] mb-2">
              Homenagem para {confirmedBooking.honoreeName} registrada!
            </h3>
            <p className="text-sm text-[#575049] mb-6">
              Protocolo <span className="font-mono font-semibold text-[#171412]">{confirmedBooking.protocol}</span> · O horário das{' '}
              <span className="font-mono font-semibold text-[#171412]">{confirmedBooking.time}</span> do dia{' '}
              <span className="font-mono font-semibold text-[#171412]">{formatDatePtBr(confirmedBooking.date)}</span> foi bloqueado automaticamente na agenda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-y border-[#E6E2DC] text-sm mb-6">
              <div>
                <p className="text-[#575049]">Ocasião e Homenageado</p>
                <p className="font-medium text-[#171412] mt-0.5">
                  {confirmedBooking.occasion} · {confirmedBooking.honoreeName}
                  {confirmedBooking.honoreeAge ? ` (${confirmedBooking.honoreeAge} anos)` : ''}
                </p>
              </div>
              <div>
                <p className="text-[#575049]">Endereço da Homenagem</p>
                <p className="font-medium text-[#171412] mt-0.5">
                  {confirmedBooking.streetAddress} ({confirmedBooking.propertyType})
                </p>
                <p className="text-xs text-[#575049]">{confirmedBooking.neighborhood}</p>
              </div>
              <div>
                <p className="text-[#575049]">3 Músicas Escolhidas</p>
                <ol className="list-decimal list-inside text-[#171412] mt-0.5 space-y-0.5">
                  {confirmedBooking.songs.map((song, idx) => (
                    <li key={idx}>{song}</li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="text-[#575049]">Valor Total Previsto</p>
                <p className="font-mono text-lg font-semibold text-[#991B1B] mt-0.5 tabular-nums">
                  {formatBRL(confirmedBooking.totalPrice)}
                </p>
                <p className="text-xs text-[#575049] mt-0.5">
                  Sinal de {formatBRL(depositAmount)} via Pix · Restante de{' '}
                  {formatBRL(Math.max(0, confirmedBooking.totalPrice - depositAmount))} no dia
                </p>
              </div>
            </div>

            {/* Painel de Sinal R$ 50 via Pix */}
            <div className="mb-6 bg-[#FAF9F7] border border-[#E6E2DC] rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 text-[#171412] font-semibold text-sm">
                  <QrCode className="w-4 h-4 text-[#991B1B]" />
                  <span>
                    Sinal da Reserva via Pix ({formatBRL(depositAmount)})
                  </span>
                </div>
                <span className="text-xs font-mono text-[#991B1B] font-semibold">
                  Protocolo {confirmedBooking.protocol}
                </span>
              </div>

              {pixPayload && pixQrUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <img
                    src={pixQrUrl}
                    alt="QR Code Pix para pagamento do sinal de reserva"
                    className="w-36 h-36 rounded-lg border border-[#E6E2DC] bg-white p-2 shrink-0"
                  />
                  <div className="flex-1 min-w-0 w-full space-y-2.5">
                    <p className="text-xs sm:text-sm text-[#36312C] leading-relaxed">
                      {paymentSettings?.instructions ||
                        `Pague o sinal de ${formatBRL(depositAmount)} pelo QR Code ou Copia e Cola e envie o comprovante no WhatsApp para confirmar sua reserva.`}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixPayload}
                        aria-label="Código Pix Copia e Cola"
                        className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-white border border-[#E6E2DC] rounded-lg text-[#575049]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(pixPayload);
                          setCopiedPix(true);
                          setTimeout(() => setCopiedPix(false), 2500);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#171412] bg-white hover:bg-[#F3EFE8] border border-[#E6E2DC] rounded-lg transition-colors shrink-0"
                      >
                        {copiedPix ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Código Pix
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-[#36312C] leading-relaxed">
                  Para confirmar este horário em definitivo, solicitamos um sinal de{' '}
                  <span className="font-semibold text-[#171412]">
                    {formatBRL(depositAmount)} via Pix
                  </span>
                  . Clique em{' '}
                  <span className="font-semibold text-[#16A34A]">
                    Solicitar Chave Pix e Enviar no WhatsApp
                  </span>{' '}
                  abaixo para receber nossa chave e enviar o comprovante.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={buildWhatsappSummaryUrl(confirmedBooking)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                {pixPayload
                  ? 'Enviar Comprovante no WhatsApp'
                  : 'Solicitar Chave Pix e Enviar no WhatsApp'}
              </a>
              <button
                type="button"
                onClick={handleResetBooking}
                className="px-5 py-2.5 text-sm font-medium text-[#171412] bg-[#FAF9F7] hover:bg-[#F3EFE8] border border-[#E6E2DC] rounded-lg transition-colors"
              >
                Fazer Outro Agendamento
              </button>
            </div>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Multi-Step Slide Wizard */}
            <div className="lg:col-span-8 bg-white border border-[#E6E2DC] rounded-xl p-4 sm:p-8 flex flex-col justify-between">
              {/* Slide Stepper Header */}
              <div className="mb-5 pb-4 border-b border-[#E6E2DC]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-semibold text-[#991B1B]">
                    Etapa {currentStep + 1} de {BOOKING_SLIDES.length}
                  </span>
                  <span className="text-[11px] sm:text-xs text-[#575049]">
                    Dados salvos automaticamente
                  </span>
                </div>

                <div className="w-full h-1.5 bg-[#F3F1ED] rounded-full overflow-hidden mb-3.5">
                  <div
                    className="h-full bg-[#991B1B] transition-all duration-300"
                    style={{
                      width: `${((currentStep + 1) / BOOKING_SLIDES.length) * 100}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {BOOKING_SLIDES.map((slide) => {
                    const isActive = currentStep === slide.id;
                    const done = isStepCompleted(slide.id);
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => handleGoToStep(slide.id)}
                        className={`px-1.5 sm:px-2.5 py-2 rounded-lg border text-center sm:text-left transition-colors ${
                          isActive
                            ? 'bg-[#991B1B] border-[#991B1B] text-white'
                            : done
                              ? 'bg-[#16A34A]/5 border-[#16A34A]/30 text-[#171412] hover:border-[#16A34A]'
                              : 'bg-[#FAF9F7] border-[#E6E2DC] text-[#575049] hover:text-[#171412] hover:border-[#CFC8BE]'
                        }`}
                      >
                        <div className="flex items-center justify-center sm:justify-between gap-1">
                          <span className="font-mono text-[10px] sm:text-[11px] font-semibold">
                            {slide.code}
                          </span>
                          {done && !isActive && (
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#16A34A] shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs font-medium truncate mt-0.5">
                          {slide.shortLabel}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slide 1: Date and Live Available Times */}
              {currentStep === 0 && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#991B1B]" />
                    <h3 className="text-lg font-semibold text-[#171412]">
                      01. Data e Horários Disponíveis
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadSlots(selectedDate)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#575049] hover:text-[#171412] py-1.5 px-2.5 rounded-md border border-[#E6E2DC] bg-[#FAF9F7]"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loadingSlots ? 'animate-spin' : ''}`}
                    />
                    Atualizar horários
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-5">
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="booking-date"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Selecione a data
                    </label>
                    <input
                      id="booking-date"
                      type="date"
                      value={selectedDate}
                      min={todayRecife}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                  </div>
                  <div className="sm:col-span-7 flex flex-col justify-end">
                    <span className="block text-xs font-medium text-[#575049] mb-1.5">
                      Atalhos rápidos
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {quickDates.map((q) => (
                        <button
                          key={q.date}
                          type="button"
                          onClick={() => setSelectedDate(q.date)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                            q.blockedReason
                              ? 'bg-[#F3F1ED] text-[#9A9289] border-[#E6E2DC]'
                              : selectedDate === q.date
                                ? 'bg-[#171412] text-white border-[#171412]'
                                : 'bg-[#FAF9F7] text-[#575049] border-[#E6E2DC] hover:text-[#171412]'
                          }`}
                        >
                          {q.label}
                          {q.blockedReason ? ' (Fechado)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedDateBlockedReason && (
                  <div className="mb-4 p-3.5 rounded-lg bg-[#991B1B]/5 border border-[#991B1B]/25 text-sm text-[#991B1B]">
                    <p className="font-semibold">Data bloqueada para agendamentos</p>
                    <p className="text-xs mt-0.5 text-[#575049]">
                      {selectedDateBlockedReason} Selecione outra data disponível no calendário acima.
                    </p>
                  </div>
                )}

                {!selectedDateBlockedReason && selectedDate === todayRecife && (
                  <div className="mb-4 p-3 rounded-lg bg-[#FAF9F7] border border-[#E6E2DC] text-xs text-[#575049] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>
                      {availability &&
                      !availability.slots.some(
                        (s) =>
                          s.state === 'available' &&
                          getSlotCutoffReason(selectedDate, s.time, new Date(nowTick)) ===
                            null
                      ) ? (
                        <>
                          <strong className="text-[#171412]">
                            Horários automáticos de hoje encerrados:
                          </strong>{' '}
                          exigimos no mínimo 2h de antecedência. Selecione{' '}
                          <strong className="text-[#171412]">Amanhã</strong> ou
                          consulte encaixe no WhatsApp.
                        </>
                      ) : (
                        <>
                          <strong className="text-[#171412]">
                            Prazo mínimo de 2 horas:
                          </strong>{' '}
                          para preparo e saída do Ipsep, agendamentos automáticos
                          liberam a partir de 2h após o horário atual.
                        </>
                      )}
                    </span>
                    <a
                      href={buildCompanyWhatsappUrl(
                        'Olá! Gostaria de consultar se há encaixe para homenagem hoje com menos de 2 horas de antecedência.'
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#16A34A] hover:underline whitespace-nowrap shrink-0"
                    >
                      Consultar encaixe no WhatsApp
                    </a>
                  </div>
                )}

                {slotsError && (
                  <p className="text-sm text-[#DC2626] mb-3">{slotsError}</p>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {availability?.slots.map((slot) => {
                    const cutoffReason =
                      slot.state === 'available'
                        ? getSlotCutoffReason(
                            selectedDate,
                            slot.time,
                            new Date(nowTick)
                          )
                        : null;
                    const isAvailable =
                      slot.state === 'available' && cutoffReason === null;
                    const isSelected = selectedTime === slot.time && isAvailable;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          !isAvailable
                            ? 'bg-[#F3F1ED] border-[#E6E2DC] text-[#9A9289] cursor-not-allowed'
                            : isSelected
                              ? 'bg-[#991B1B] border-[#991B1B] text-white'
                              : 'bg-[#FAF9F7] border-[#E6E2DC] text-[#171412] hover:border-[#991B1B]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-sm font-semibold tabular-nums">
                            {slot.time}
                          </span>
                          <Clock className="w-3.5 h-3.5 opacity-70" />
                        </div>
                        <p
                          className={`text-[11px] mt-1 ${
                            isSelected
                              ? 'text-white/90'
                              : isAvailable
                                ? 'text-[#16A34A] font-medium'
                                : 'text-[#9A9289]'
                          }`}
                        >
                          {isAvailable
                            ? 'Disponível'
                            : slot.state === 'booked'
                              ? 'Reservado'
                              : cutoffReason === 'past'
                                ? 'Encerrado'
                                : cutoffReason === 'lead_time'
                                  ? 'Mín. 2h antes'
                                  : 'Indisponível'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              {/* Slide 2: Occasion, Honoree, Age, Client */}
              {currentStep === 1 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-[#991B1B]" />
                  <h3 className="text-lg font-semibold text-[#171412]">
                    02. Tema do Carro, Para Quem é e Idade
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {OCCASIONS.map((item) => {
                    const active = occasion === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setOccasion(item.value)}
                        className={`p-3.5 rounded-lg border text-left transition-colors ${
                          active
                            ? 'bg-[#991B1B]/5 border-[#991B1B]'
                            : 'bg-[#FAF9F7] border-[#E6E2DC] hover:border-[#CFC8BE]'
                        }`}
                      >
                        <p
                          className={`text-sm font-semibold ${
                            active ? 'text-[#991B1B]' : 'text-[#171412]'
                          }`}
                        >
                          {item.label}
                        </p>
                        <p className="text-xs text-[#575049] mt-0.5">
                          {item.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-8">
                    <label
                      htmlFor="honoree-name"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Para quem é a mensagem? (Nome do homenageado) *
                    </label>
                    <input
                      id="honoree-name"
                      type="text"
                      value={honoreeName}
                      onChange={(e) => setHonoreeName(e.target.value)}
                      placeholder="Ex: Maria Clara / João Pedro"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="honoree-age"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Idade (opcional)
                    </label>
                    <input
                      id="honoree-age"
                      type="text"
                      value={honoreeAge}
                      onChange={(e) => setHonoreeAge(e.target.value)}
                      placeholder="Ex: 30 anos"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="client-name"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Seu nome (quem está contratando) *
                    </label>
                    <input
                      id="client-name"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label
                      htmlFor="client-whatsapp"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Seu WhatsApp com DDD *
                    </label>
                    <input
                      id="client-whatsapp"
                      type="tel"
                      value={clientWhatsapp}
                      onChange={(e) => setClientWhatsapp(e.target.value)}
                      placeholder="(81) 99999-9999"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                  </div>
                </div>
              </div>
              )}

              {/* Slide 3: Address & Automatic Distance Pricing */}
              {currentStep === 2 && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#991B1B]" />
                    <h3 className="text-lg font-semibold text-[#171412]">
                      03. Endereço da Homenagem (Cálculo Automático)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      runAddressCalculation(streetAddress, neighborhood, city)
                    }
                    disabled={calculatingPrice}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#991B1B] hover:text-[#7F1D1D] py-1.5 px-3 rounded-lg border border-[#E6E2DC] bg-[#FAF9F7] disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${calculatingPrice ? 'animate-spin' : ''}`}
                    />
                    {calculatingPrice ? 'Calculando...' : 'Calcular Valor'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="cep-input"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      CEP (opcional — preenche na hora)
                    </label>
                    <input
                      id="cep-input"
                      type="text"
                      inputMode="numeric"
                      value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="Ex: 51190-040"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B] font-mono"
                    />
                    {lookingUpCep && (
                      <p className="text-[11px] text-[#575049] mt-1">
                        Buscando CEP...
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-4">
                    <label
                      htmlFor="city-input"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Cidade *
                    </label>
                    <input
                      id="city-input"
                      type="text"
                      list="cities-list"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Recife ou Olinda"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                    <datalist id="cities-list">
                      {SUGGESTED_CITIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-4">
                    <label
                      htmlFor="neighborhood"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Bairro *
                    </label>
                    <input
                      id="neighborhood"
                      type="text"
                      list="neighborhoods-list"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Boa Viagem, Bairro Novo..."
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                    <datalist id="neighborhoods-list">
                      {SUGGESTED_NEIGHBORHOODS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-8">
                    <label
                      htmlFor="street-address"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Rua, Avenida e Número *
                    </label>
                    <input
                      id="street-address"
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="Ex: Rua Rio Amazonas, 120"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label
                      htmlFor="property-type"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Tipo de local
                    </label>
                    <select
                      id="property-type"
                      value={propertyType}
                      onChange={(e) =>
                        setPropertyType(e.target.value as PropertyType)
                      }
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                    >
                      <option value="Casa">Casa</option>
                      <option value="Prédio">Prédio / Condomínio</option>
                      <option value="Comércio">Comércio / Empresa</option>
                    </select>
                  </div>

                  <div className="sm:col-span-12">
                    <label
                      htmlFor="reference-point"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Ponto de referência (ajuda o motorista a estacionar certinho)
                    </label>
                    <input
                      id="reference-point"
                      type="text"
                      value={referencePoint}
                      onChange={(e) => setReferencePoint(e.target.value)}
                      placeholder="Ex: Próximo ao mercado, portão branco, esquina da padaria..."
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                    />
                  </div>

                  <div className="sm:col-span-12">
                    {calculatingPrice ? (
                      <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E6E2DC] text-xs text-[#575049]">
                        Analisando rota, relevo e calculando automaticamente o valor para o endereço...
                      </div>
                    ) : addressPrice?.requiresWhatsappQuote ? (
                      <div className="p-4 rounded-lg bg-[#16A34A]/5 border border-[#16A34A]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <p className="text-[#171412] font-semibold">
                            Região fora de Recife, Olinda e Jaboatão dos Guararapes
                          </p>
                          <p className="text-[#575049]">
                            Também realizamos homenagens em lugares mais distantes! Para{' '}
                            <strong className="text-[#171412]">
                              {addressPrice.resolvedCity || city || 'essa localidade'}
                            </strong>
                            , o orçamento e o deslocamento são combinados direto no WhatsApp.
                          </p>
                        </div>
                        <a
                          href={buildOutOfRegionWhatsappUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Orçamento no WhatsApp
                        </a>
                      </div>
                    ) : addressPrice ? (
                      <div className="p-3.5 rounded-lg bg-[#16A34A]/5 border border-[#16A34A]/25 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <p className="text-[#171412] font-medium">
                            Endereço localizado:{' '}
                            <strong className="font-semibold">
                              {addressPrice.resolvedNeighborhood}
                              {addressPrice.resolvedCity
                                ? ` (${addressPrice.resolvedCity})`
                                : ''}
                            </strong>
                            {addressPrice.distanceKm !== null
                              ? ` · Trajeto estimado ~${addressPrice.distanceKm} km`
                              : ''}
                          </p>
                          {addressPrice.terrainAdjustment > 0 && (
                            <p className="text-[#575049]">
                              Calculado considerando distância, relevo e condição de acesso do local.
                            </p>
                          )}
                        </div>
                        <span className="font-mono text-sm font-semibold text-[#16A34A] tabular-nums">
                          Pacote para este endereço: {formatBRL(addressPrice.basePrice)}
                        </span>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-[#FAF9F7] border border-[#E6E2DC] text-xs text-[#575049]">
                        {priceHint ||
                          'Agendamento online automático para Recife, Olinda e Jaboatão dos Guararapes. Para lugares mais distantes, também atendemos com orçamento direto no WhatsApp.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Slide 4: Champagne/Chocolate, Fireworks, 3 Songs */}
              {currentStep === 3 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-[#991B1B]" />
                  <h3 className="text-lg font-semibold text-[#171412]">
                    04. Brinde Incluso (Champanhe ou Chocolate), Fogos e 3 Músicas
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {GIFT_OPTIONS.map((opt) => {
                    const selected = giftOption === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGiftOption(opt.value)}
                        className={`p-3.5 rounded-lg border text-left transition-colors ${
                          selected
                            ? 'bg-[#991B1B]/5 border-[#991B1B]'
                            : 'bg-[#FAF9F7] border-[#E6E2DC] hover:border-[#CFC8BE]'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              selected ? 'text-[#991B1B]' : 'text-[#171412]'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="font-mono text-xs font-medium text-[#171412] tabular-nums">
                            {opt.price === 0 ? 'Incluso' : `+ ${formatBRL(opt.price)}`}
                          </span>
                        </div>
                        <p className="text-xs text-[#575049] mt-1">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center justify-between gap-4 p-4 rounded-lg border border-[#E6E2DC] bg-[#FAF9F7] cursor-pointer hover:border-[#CFC8BE] mb-6">
                  <div className="flex items-center gap-3">
                    <Flame className="w-5 h-5 text-[#991B1B] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#171412]">
                        3 Queimas de Fogos Inclusas: 1x 12x1, Chuva de Prata e Árvore de Natal (Vulcão)
                      </p>
                      <p className="text-xs text-[#575049]">
                        Já está incluso no valor do seu pacote (desmarque apenas se o condomínio ou local não permitir fogos).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs font-semibold text-[#16A34A]">
                      {FIREWORKS_PRICE === 0 ? 'Incluso' : `+ ${formatBRL(FIREWORKS_PRICE)}`}
                    </span>
                    <input
                      type="checkbox"
                      checked={includeFireworks}
                      onChange={(e) => setIncludeFireworks(e.target.checked)}
                      className="w-4 h-4 accent-[#991B1B]"
                    />
                  </div>
                </label>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Music className="w-4 h-4 text-[#991B1B]" />
                    <p className="text-sm font-semibold text-[#171412]">
                      Nomes das 3 Músicas da Homenagem *
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="song-1"
                        className="block text-xs text-[#575049] mb-1"
                      >
                        Música 1
                      </label>
                      <input
                        id="song-1"
                        type="text"
                        value={song1}
                        onChange={(e) => setSong1(e.target.value)}
                        placeholder="Nome + Cantor(a)"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="song-2"
                        className="block text-xs text-[#575049] mb-1"
                      >
                        Música 2
                      </label>
                      <input
                        id="song-2"
                        type="text"
                        value={song2}
                        onChange={(e) => setSong2(e.target.value)}
                        placeholder="Nome + Cantor(a)"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="song-3"
                        className="block text-xs text-[#575049] mb-1"
                      >
                        Música 3
                      </label>
                      <input
                        id="song-3"
                        type="text"
                        value={song3}
                        onChange={(e) => setSong3(e.target.value)}
                        placeholder="Nome + Cantor(a)"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Slide 5: Message for the car theme */}
              {currentStep === 4 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#991B1B]" />
                  <h3 className="text-lg font-semibold text-[#171412]">
                    05. Mensagem do Tema do Carro
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setMessageSource('empresa')}
                    className={`p-3.5 rounded-lg border text-left transition-colors ${
                      messageSource === 'empresa'
                        ? 'bg-[#991B1B]/5 border-[#991B1B]'
                        : 'bg-[#FAF9F7] border-[#E6E2DC] hover:border-[#CFC8BE]'
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        messageSource === 'empresa'
                          ? 'text-[#991B1B]'
                          : 'text-[#171412]'
                      }`}
                    >
                      Quero que a empresa gere a mensagem
                    </p>
                    <p className="text-xs text-[#575049] mt-0.5">
                      Criamos um roteiro personalizado de acordo com o tema ({occasion}) e idade.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageSource('cliente')}
                    className={`p-3.5 rounded-lg border text-left transition-colors ${
                      messageSource === 'cliente'
                        ? 'bg-[#991B1B]/5 border-[#991B1B]'
                        : 'bg-[#FAF9F7] border-[#E6E2DC] hover:border-[#CFC8BE]'
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        messageSource === 'cliente'
                          ? 'text-[#991B1B]'
                          : 'text-[#171412]'
                      }`}
                    >
                      Eu mesmo quero escrever o texto
                    </p>
                    <p className="text-xs text-[#575049] mt-0.5">
                      Você escreve exatamente o que deseja que o locutor leia ao vivo.
                    </p>
                  </button>
                </div>

                {messageSource === 'empresa' ? (
                  <div className="p-4 rounded-lg bg-[#FAF9F7] border border-[#E6E2DC] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="message-tone"
                          className="text-xs font-medium text-[#575049]"
                        >
                          Estilo da locução:
                        </label>
                        <select
                          id="message-tone"
                          value={messageTone}
                          onChange={(e) => setMessageTone(e.target.value)}
                          className="px-2.5 py-1.5 text-xs bg-white border border-[#E6E2DC] rounded-md"
                        >
                          <option value="Emocionante e caloroso">
                            Emocionante e caloroso
                          </option>
                          <option value="Alegre e festivo">
                            Alegre e festivo
                          </option>
                          <option value="Romântico e profundo">
                            Romântico e profundo
                          </option>
                          <option value="Sensível para reconciliação">
                            Sensível para reconciliação
                          </option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateAiScript}
                        disabled={generatingAi}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#171412] hover:bg-[#2F2A26] rounded-lg transition-colors disabled:opacity-60"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {generatingAi
                          ? 'Gerando roteiro...'
                          : 'Gerar Prévia da Mensagem Agora'}
                      </button>
                    </div>

                    {aiError && (
                      <p className="text-xs text-[#DC2626]">{aiError}</p>
                    )}

                    <textarea
                      rows={4}
                      value={generatedScript}
                      onChange={(e) => setGeneratedScript(e.target.value)}
                      placeholder="Clique em 'Gerar Prévia da Mensagem Agora' para visualizar e editar o texto na hora, ou deixe em branco que nossa equipe prepara com carinho para você antes do evento."
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="custom-message"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Texto para o locutor ler ao vivo *
                    </label>
                    <textarea
                      id="custom-message"
                      rows={4}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Escreva aqui a mensagem completa que será falada ao vivo no carro..."
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                      required
                    />
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-[#E6E2DC]">
                  <p className="text-xs font-semibold text-[#171412] mb-1">
                    Participação de Familiares e Amigos (Regra do Microfone e Áudios)
                  </p>
                  <p className="text-xs text-[#575049] mb-3">
                    No local, o microfone pode ser usado por até 5 pessoas. Se preferir, você pode enviar até 10 áudios de até 40 segundos cada pelo WhatsApp para reproduzirmos no carro.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        'Microfone ao vivo (até 5 pessoas)',
                        'Envio de até 10 áudios (máx. 40s cada)',
                        'Apenas locução do carro',
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setParticipationMode(opt)}
                        className={`p-3 rounded-lg border text-left text-xs font-medium transition-colors ${
                          participationMode === opt
                            ? 'bg-[#991B1B]/5 border-[#991B1B] text-[#991B1B]'
                            : 'bg-[#FAF9F7] border-[#E6E2DC] text-[#171412] hover:border-[#CFC8BE]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              )}

              {/* Slide Navigation Footer */}
              <div className="mt-8 pt-5 border-t border-[#E6E2DC] space-y-3">
                {stepError && (
                  <p className="text-sm text-[#DC2626] bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-lg px-3.5 py-2.5">
                    {stepError}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  {currentStep > 0 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#171412] bg-[#FAF9F7] hover:bg-[#F3EFE8] border border-[#E6E2DC] rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Voltar
                    </button>
                  ) : (
                    <span className="text-xs text-[#575049]">
                      Selecione a data e o horário para continuar
                    </span>
                  )}

                  {currentStep < BOOKING_SLIDES.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors ml-auto"
                    >
                      Próxima Etapa
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <a
                      href="#booking-summary"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-[#16A34A] bg-[#16A34A]/10 hover:bg-[#16A34A]/15 border border-[#16A34A]/25 rounded-lg transition-colors ml-auto lg:hidden"
                    >
                      Revisar Resumo e Confirmar
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Summary Sidebar */}
            <aside
              id="booking-summary"
              className="lg:col-span-4 lg:sticky lg:top-24 bg-white border border-[#E6E2DC] rounded-xl p-6"
            >
              <h3 className="font-display text-xl font-semibold text-[#171412] mb-4">
                Resumo da Homenagem
              </h3>

              <div className="space-y-3 text-sm pb-5 border-b border-[#E6E2DC]">
                <div className="flex justify-between gap-2">
                  <span className="text-[#575049]">Data e Horário</span>
                  <span className="font-mono font-medium text-[#171412] tabular-nums">
                    {formatDatePtBr(selectedDate)} · {selectedTime || 'A escolher'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#575049]">Ocasião</span>
                  <span className="font-medium text-[#171412]">{occasion}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#575049]">Homenageado(a)</span>
                  <span className="font-medium text-[#171412] text-right">
                    {honoreeName.trim() || 'Não informado'}
                    {honoreeAge.trim() ? ` (${honoreeAge.trim()})` : ''}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#575049]">Mensagem</span>
                  <span className="font-medium text-[#171412]">
                    {messageSource === 'empresa'
                      ? 'Gerada pela empresa'
                      : 'Texto próprio'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm py-5 border-b border-[#E6E2DC]">
                <div className="flex justify-between gap-2">
                  <span className="text-[#575049]">Pacote para o endereço</span>
                  <span className="font-mono text-[#171412] tabular-nums text-right">
                    {addressPrice?.requiresWhatsappQuote
                      ? 'Orçamento no Zap'
                      : addressPrice
                        ? formatBRL(pricing.basePrice)
                        : calculatingPrice
                          ? 'Calculando...'
                          : 'A calcular'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#575049]">
                    3 Queimas de Fogos (12x1, Chuva de Prata, Vulcão)
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#16A34A]">
                    {includeFireworks ? 'Incluso' : 'Sem fogos'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#575049]">
                    Segundo mimo opcional
                  </span>
                  <span className="font-mono text-[#171412] tabular-nums">
                    {formatBRL(pricing.extrasPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-[#E6E2DC]">
                  <span className="font-semibold text-[#171412]">Total previsto</span>
                  <span className="font-mono text-xl sm:text-2xl font-semibold text-[#991B1B] tabular-nums text-right">
                    {addressPrice?.requiresWhatsappQuote
                      ? 'Combinar no WhatsApp'
                      : addressPrice
                        ? formatBRL(pricing.totalPrice)
                        : 'Informe o endereço'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#575049]">
                  <span>Sinal para confirmar (Pix)</span>
                  <span className="font-mono font-semibold text-[#171412] tabular-nums">
                    {formatBRL(depositAmount)}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <HumanVerification
                  verified={humanVerified}
                  onVerifiedChange={setHumanVerified}
                  compact
                />

                <label className="flex items-start gap-2 text-xs text-[#575049] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lgpdAccepted}
                    onChange={(e) => setLgpdAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#991B1B] shrink-0"
                  />
                  <span>
                    Concordo com a{' '}
                    <button
                      type="button"
                      onClick={() => setPrivacyOpen(true)}
                      className="text-[#991B1B] underline hover:text-[#7F1D1D]"
                    >
                      Política de Privacidade (LGPD)
                    </button>{' '}
                    para proteção dos meus dados.
                  </span>
                </label>
              </div>

              {submitError && (
                <p className="mt-4 text-sm text-[#DC2626] bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-lg p-3">
                  {submitError}
                </p>
              )}

              {addressPrice?.requiresWhatsappQuote ? (
                <a
                  href={buildOutOfRegionWhatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 text-sm font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Solicitar Orçamento no WhatsApp
                </a>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-5 w-full py-3.5 px-5 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-60"
                  >
                    {submitting
                      ? 'Confirmando Reserva...'
                      : user && user.emailVerified
                        ? 'Confirmar Agendamento Automático'
                        : 'Entrar / Registrar e Confirmar'}
                  </button>
                  <a
                    href={buildDirectWhatsappOrderUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#171412] bg-[#FAF9F7] hover:bg-[#F3EFE8] border border-[#E6E2DC] rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-[#16A34A]" />
                    Prefere sem cadastro? Enviar no WhatsApp
                  </a>
                </>
              )}

              {user && user.emailVerified ? (
                <div className="mt-3 flex items-center justify-between text-xs text-[#575049]">
                  <span className="truncate max-w-[200px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                    {user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOutUser()}
                    className="underline hover:text-[#171412]"
                  >
                    Sair
                  </button>
                </div>
              ) : user && !user.emailVerified ? (
                <div className="mt-3 text-xs text-[#D97706] flex items-center justify-between gap-2">
                  <span>Verifique seu e-mail para confirmar.</span>
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className="underline font-semibold whitespace-nowrap"
                  >
                    Validar Agora
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#575049] text-center">
                  Ao confirmar, você entra com Google ou cria sua conta com verificação por e-mail para proteger seus dados.
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-[#E6E2DC]">
                <a
                  href={buildCompanyWhatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#16A34A] bg-[#16A34A]/10 hover:bg-[#16A34A]/15 border border-[#16A34A]/25 rounded-lg transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Atendimento Direto no WhatsApp {COMPANY_WHATSAPP_DISPLAY}
                </a>
              </div>
            </aside>
          </form>
        )}
      </section>

      {/* Instagram @despertecoracoes Video Cuts Showcase */}
      <section
        id="instagram"
        className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 border-t border-[#E6E2DC]"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium text-[#991B1B] mb-1.5">
              Vídeos Reais · @despertecoracoes
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#171412] tracking-tight">
              Cortes de Homenagens Reais ao Vivo
            </h2>
            <p className="text-sm sm:text-base text-[#575049] mt-1">
              Assista aqui no site momentos reais de emoção, declarações, aniversários e reconciliações em Recife e Região Metropolitana.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="https://www.instagram.com/despertecoracoes/reels/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors whitespace-nowrap"
            >
              <Video className="w-4 h-4" />
              Ver Mais no @despertecoracoes
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={buildCompanyWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              Falar no WhatsApp
            </a>
          </div>
        </div>

        {/* 5 Cortes de Vídeos Reais em Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {HIGHLIGHT_VIDEO_CUTS.map((clip) => (
            <article
              key={clip.id}
              className="bg-white border border-[#E6E2DC] rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[9/16] bg-[#171412] relative overflow-hidden">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={clip.posterSrc}
                  className="w-full h-full object-cover"
                >
                  <source src={clip.videoSrc} type="video/mp4" />
                  Seu navegador não suporta reprodução de vídeo.
                </video>
              </div>
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-medium text-[#991B1B]">
                    {clip.occasion}
                  </p>
                  <h3 className="text-sm font-semibold text-[#171412] mt-0.5 leading-snug">
                    {clip.title}
                  </h3>
                </div>
                <a
                  href="https://www.instagram.com/despertecoracoes/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-[#575049] hover:text-[#171412]"
                >
                  @despertecoracoes
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </article>
          ))}
        </div>

        {instagramPosts.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {instagramPosts.map((post) => {
              const embedUrl = toInstagramEmbedUrl(post.instagramUrl);
              return (
                <div
                  key={post.id}
                  className="bg-white border border-[#E6E2DC] rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="p-4 border-b border-[#E6E2DC]">
                    <p className="text-xs text-[#575049]">
                      {post.occasion || 'Homenagem ao Vivo'}
                      {post.viewsLabel ? ` · ${post.viewsLabel}` : ''}
                    </p>
                    <h3 className="text-sm font-semibold text-[#171412] mt-0.5 truncate">
                      {post.title}
                    </h3>
                  </div>

                  {embedUrl ? (
                    <div className="w-full aspect-[3/4] bg-[#FAF9F7]">
                      <iframe
                        src={embedUrl}
                        title={post.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full border-0"
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      />
                    </div>
                  ) : null}

                  <div className="p-3.5 bg-[#FAF9F7] border-t border-[#E6E2DC] mt-auto">
                    <a
                      href={post.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#991B1B] hover:underline"
                    >
                      Assistir no Instagram @despertecoracoes
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* How it works */}
      <section
        id="como-funciona"
        className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 border-t border-[#E6E2DC]"
      >
        <h2 className="font-display text-2xl font-semibold text-[#171412] mb-6">
          Como Funciona no Dia da Homenagem
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E6E2DC] rounded-xl p-6">
            <p className="text-xs font-mono text-[#991B1B] mb-2">Etapa 01</p>
            <h3 className="font-semibold text-base text-[#171412] mb-2">
              Reserva e Alinhamento
            </h3>
            <p className="text-sm text-[#575049] leading-relaxed">
              Você agenda seu horário aqui no site e nossa equipe confirma o ponto de parada exato, além de deixar as 3 músicas e o roteiro prontos.
            </p>
          </div>
          <div className="bg-white border border-[#E6E2DC] rounded-xl p-6">
            <p className="text-xs font-mono text-[#991B1B] mb-2">Etapa 02</p>
            <h3 className="font-semibold text-base text-[#171412] mb-2">
              Chegada Discreta ao Local
            </h3>
            <p className="text-sm text-[#575049] leading-relaxed">
              Avisamos pelo WhatsApp minutos antes de estacionar no endereço informado para que você possa chamar o(a) homenageado(a) para a janela ou portaria.
            </p>
          </div>
          <div className="bg-white border border-[#E6E2DC] rounded-xl p-6">
            <p className="text-xs font-mono text-[#991B1B] mb-2">Etapa 03</p>
            <h3 className="font-semibold text-base text-[#171412] mb-2">
              Apresentação ao Vivo e Entrega
            </h3>
            <p className="text-sm text-[#575049] leading-relaxed">
              Realizamos a locução ao vivo intercalada com as 3 músicas, acionamos os fogos (se escolhidos) e entregamos o champanhe ou chocolate em mãos.
            </p>
          </div>
        </div>
      </section>

      {/* Dúvidas Frequentes */}
      <section
        id="duvidas"
        className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 border-t border-[#E6E2DC]"
      >
        <div className="mb-6">
          <p className="text-xs font-medium text-[#991B1B] mb-1">
            Tire suas dúvidas
          </p>
          <h2 className="font-display text-2xl font-semibold text-[#171412]">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={item.question}
                className="bg-white border border-[#E6E2DC] rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left text-sm font-semibold text-[#171412] hover:bg-[#FAF9F7] transition-colors"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#575049] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180 text-[#991B1B]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-4 text-sm text-[#575049] leading-relaxed border-t border-[#F3F1ED] pt-3">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <footer className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-10 pb-6 border-t border-[#E6E2DC] text-xs text-[#575049]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-[#E6E2DC]">
          <div>
            <p className="font-display text-base font-semibold text-[#171412]">
              Desperte Corações
            </p>
            <p className="mt-1.5 leading-relaxed">
              Carro de Mensagem ao Vivo em Recife, Olinda e Jaboatão dos Guararapes. Para regiões mais distantes, fazemos orçamento direto pelo WhatsApp.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[#171412] mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#991B1B]" />
              Endereço da Empresa
            </p>
            <p className="leading-relaxed text-[#36312C]">{COMPANY_ADDRESS}</p>
          </div>

          <div>
            <p className="font-semibold text-[#171412] mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#991B1B]" />
              Contatos e Atendimento
            </p>
            <div className="space-y-1.5">
              <p>
                WhatsApp:{' '}
                <a
                  href={buildCompanyWhatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-semibold text-[#16A34A] hover:underline"
                >
                  {COMPANY_WHATSAPP_DISPLAY}
                </a>
              </p>
              <p>
                Instagram:{' '}
                <a
                  href="https://www.instagram.com/despertecoracoes/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#171412] hover:underline"
                >
                  @despertecoracoes
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Desperte Corações · Todos os direitos reservados</p>
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            className="hover:text-[#171412] underline underline-offset-4"
          >
            Privacidade e Segurança (LGPD)
          </button>
        </div>
      </footer>

      {/* Botão flutuante compacto de Atendimento no WhatsApp */}
      <a
        href={buildCompanyWhatsappUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Atendimento no WhatsApp Desperte Corações"
        className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 inline-flex items-center gap-2 p-3 sm:px-4 sm:py-3 text-sm font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl shadow-lg transition-colors"
      >
        <MessageCircle className="w-5 h-5 sm:w-4 sm:h-4 shrink-0" />
        <span className="hidden sm:inline">Atendimento WhatsApp</span>
      </a>

      {/* Modal: Entrar / Registrar para concluir reserva sem perder dados */}
      {authModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg my-8">
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              aria-label="Fechar janela de login"
              className="absolute right-4 top-4 z-10 p-1.5 text-[#575049] hover:text-[#171412] bg-[#FAF9F7] rounded-lg border border-[#E6E2DC]"
            >
              <X className="w-4 h-4" />
            </button>
            <AuthPanel
              user={user}
              title="Finalize seu Agendamento com Segurança"
              subtitle="Entre com Google ou crie sua conta com e-mail verificado para proteger seus dados e concluir a reserva."
              onAuthComplete={() => setAuthModalOpen(false)}
            />
          </div>
        </div>
      )}

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </main>
  );
};
