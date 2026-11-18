import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Flame,
  Gift,
  Heart,
  MapPin,
  Music,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  AvailabilityResponse,
  Booking,
  GiftOption,
  MessageSource,
  OccasionType,
  PropertyType,
} from '../types/booking';
import {
  calculatePrices,
  FIREWORKS_PRICE,
  formatBRL,
  GIFT_OPTIONS,
  MINIMUM_BASE_PRICE,
  NEIGHBORHOOD_ZONES,
  OCCASIONS,
} from '../constants/pricing';
import { User } from 'firebase/auth';
import {
  createBookingApi,
  fetchAvailability,
  generateAiMessageApi,
  subscribeAvailability,
} from '../lib/api';
import { signInWithGoogle, signOutUser } from '../lib/firebase';
import HERO_IMAGE from '../assets/images/hero_tribute_car_1794681123231.jpg';
import CHAMPAGNE_IMAGE from '../assets/images/addon_champagne_gift_1794681123622.jpg';
import CHOCOLATE_IMAGE from '../assets/images/addon_chocolate_box_1794681123620.jpg';

function getDateString(offsetDays = 0): string {
  const base = new Date();
  base.setDate(base.getDate() + offsetDays);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDatePtBr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

interface BookingSiteProps {
  user: User | null;
  onBookingCreated: (booking: Booking) => void;
  onOpenAttendance: () => void;
}

export const BookingSite: React.FC<BookingSiteProps> = ({
  user,
  onBookingCreated,
  onOpenAttendance,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [champagneImgFailed, setChampagneImgFailed] = useState(false);
  const [chocolateImgFailed, setChocolateImgFailed] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(() => getDateString(0));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [occasion, setOccasion] = useState<OccasionType>('Aniversário');
  const [honoreeName, setHonoreeName] = useState('');
  const [honoreeAge, setHonoreeAge] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');

  const [neighborhood, setNeighborhood] = useState(NEIGHBORHOOD_ZONES[0].label);
  const [streetAddress, setStreetAddress] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('Casa');
  const [referencePoint, setReferencePoint] = useState('');

  const [giftOption, setGiftOption] = useState<GiftOption>('champanhe');
  const [includeFireworks, setIncludeFireworks] = useState(true);

  const [song1, setSong1] = useState('');
  const [song2, setSong2] = useState('');
  const [song3, setSong3] = useState('');

  const [messageSource, setMessageSource] = useState<MessageSource>('empresa');
  const [participationMode, setParticipationMode] = useState<
    'Microfone ao vivo (até 5 pessoas)' | 'Envio de até 10 áudios (máx. 40s cada)' | 'Apenas locução do carro'
  >('Microfone ao vivo (até 5 pessoas)');
  const [customMessage, setCustomMessage] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [messageTone, setMessageTone] = useState('Emocionante e caloroso');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const quickDates = useMemo(
    () => [
      { label: 'Hoje', date: getDateString(0) },
      { label: 'Amanhã', date: getDateString(1) },
      { label: 'Em 2 dias', date: getDateString(2) },
      { label: 'Próxima semana', date: getDateString(7) },
    ],
    []
  );

  const loadSlots = useCallback(async (dateToLoad: string) => {
    setLoadingSlots(true);
    setSlotsError('');
    try {
      const res = await fetchAvailability(dateToLoad);
      setAvailability(res);
      setSelectedTime((prev) => {
        if (!prev) return '';
        const stillOpen = res.slots.some(
          (s) => s.time === prev && s.state === 'available'
        );
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
          const stillOpen = res.slots.some(
            (s) => s.time === prev && s.state === 'available'
          );
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

  const pricing = useMemo(
    () => calculatePrices(neighborhood, giftOption, includeFireworks),
    [neighborhood, giftOption, includeFireworks]
  );

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedTime) {
      setSubmitError('Escolha um horário disponível na etapa 01.');
      return;
    }
    if (!honoreeName.trim() || !clientName.trim() || !clientWhatsapp.trim()) {
      setSubmitError('Preencha o nome do homenageado, seu nome e seu WhatsApp.');
      return;
    }
    if (!streetAddress.trim()) {
      setSubmitError('Informe a rua e o número do endereço da homenagem.');
      return;
    }
    if (!song1.trim() || !song2.trim() || !song3.trim()) {
      setSubmitError('Preencha os nomes das 3 músicas que devem tocar no carro.');
      return;
    }
    if (messageSource === 'cliente' && !customMessage.trim()) {
      setSubmitError(
        'Digite o texto da mensagem ou selecione para a empresa gerar.'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (!user) {
        await signInWithGoogle();
      }
      const booking = await createBookingApi({
        date: selectedDate,
        time: selectedTime,
        occasion,
        honoreeName: honoreeName.trim(),
        honoreeAge: honoreeAge.trim(),
        clientName: clientName.trim(),
        clientWhatsapp: clientWhatsapp.trim(),
        neighborhood,
        streetAddress: streetAddress.trim(),
        propertyType,
        referencePoint: referencePoint.trim(),
        giftOption,
        includeFireworks,
        songs: [song1.trim(), song2.trim(), song3.trim()],
        messageSource,
        customMessage: customMessage.trim(),
        generatedScript: generatedScript.trim(),
        notes: `Participação escolhida: ${participationMode}`,
      });
      setConfirmedBooking(booking);
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
    setSelectedTime('');
    setHonoreeName('');
    setHonoreeAge('');
    setStreetAddress('');
    setReferencePoint('');
    setSong1('');
    setSong2('');
    setSong3('');
    setCustomMessage('');
    setGeneratedScript('');
    setGiftOption('champanhe');
    setIncludeFireworks(true);
    loadSlots(selectedDate);
  };

  const buildWhatsappSummaryUrl = (booking: Booking) => {
    const giftLabel =
      GIFT_OPTIONS.find((g) => g.value === booking.giftOption)?.label ?? 'Nenhum';
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
    ]
      .filter(Boolean)
      .join('\n');
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <main className="pb-20">
      {/* Hero Split */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-10 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-sm font-medium text-[#991B1B] mb-3">
                Carro de Mensagem ao Vivo · Recife e Região Metropolitana
              </p>
              <h1
                className="font-display font-semibold tracking-tight text-[#171412] leading-[1.08] mb-5"
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                Surpreenda quem você ama com música, voz ao vivo e horário reservado na hora.
              </h1>
              <p className="text-base sm:text-lg text-[#575049] leading-relaxed max-w-xl mb-8">
                Consulte os horários disponíveis em tempo real, escolha champanhe ou chocolate, fogos, suas 3 músicas preferidas e o roteiro da locução para aniversário, reconciliação ou declaração.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#agendar"
                className="px-6 py-3 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Escolher Data e Horário
              </a>
              <button
                type="button"
                onClick={onOpenAttendance}
                className="px-5 py-3 text-sm font-medium text-[#171412] bg-white border border-[#E6E2DC] hover:border-[#CFC8BE] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Área da Empresa / Mensagens Prontas
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[300px] sm:min-h-[380px] rounded-xl overflow-hidden border border-[#E6E2DC] bg-[#EDE9E2]">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE}
                  alt="Carro de mensagem ao vivo preparado com flores e iluminação suave ao entardecer"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#F3EFE8] to-[#E6DFD5]">
                  <Heart className="w-10 h-10 text-[#991B1B] mb-3" />
                  <p className="font-display text-xl text-[#171412]">
                    Desperte Corações ao Vivo
                  </p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <p className="text-sm font-medium text-white">
                  Locução ao vivo no local · Som de alta definição · Entrega de mimos
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-column Service Strip */}
        <div className="mt-10 pt-8 border-t border-[#E6E2DC] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm font-semibold text-[#171412] mb-1">
              01. Locução e Microfone
            </p>
            <p className="text-sm text-[#575049]">
              Microfone para até 5 pessoas ao vivo ou envio de até 10 áudios de até 40s cada.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#171412] mb-1">
              02. 3 Músicas Exclusivas
            </p>
            <p className="text-sm text-[#575049]">
              Você escolhe a trilha sonora completa para tocar durante a apresentação.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#171412] mb-1">
              03. Champanhe ou Chocolate
            </p>
            <p className="text-sm text-[#575049]">
              Adicione espumante com taças ou caixa artesanal entregue no momento da surpresa.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#171412] mb-1">
              04. 3 Queimas de Fogos Inclusas
            </p>
            <p className="text-sm text-[#575049]">
              Já incluso no pacote: 1x 12x1, Chuva de Prata e Árvore de Natal (Vulcão).
            </p>
          </div>
        </div>
      </section>

      {/* Mimos Section */}
      <section
        id="mimos"
        className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 border-t border-[#E6E2DC]"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#171412] tracking-tight">
              Mimos e Efeitos para Completar a Surpresa
            </h2>
            <p className="text-sm sm:text-base text-[#575049] mt-1">
              Selecione no formulário abaixo para incluir no seu carro de mensagem.
            </p>
          </div>
          <p className="text-sm text-[#575049] tabular-nums">
            A partir de {formatBRL(MINIMUM_BASE_PRICE)} no Ipsep · Valor conforme distância
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E6E2DC] rounded-xl overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-[#F3F1ED] overflow-hidden">
              {!champagneImgFailed ? (
                <img
                  src={CHAMPAGNE_IMAGE}
                  alt="Garrafa de champanhe com duas taças de cristal e caixa presente"
                  referrerPolicy="no-referrer"
                  onError={() => setChampagneImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gift className="w-8 h-8 text-[#991B1B]" />
                </div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-base text-[#171412]">
                    Champanhe (Espumante)
                  </h3>
                  <span className="font-mono text-xs font-semibold text-[#16A34A]">
                    Incluso no pacote
                  </span>
                </div>
                <p className="text-sm text-[#575049]">
                  Espumante gelado já incluso no valor do pacote (a partir de R$ 250,00 no Ipsep).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGiftOption('champanhe');
                  document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-4 w-full py-2.5 px-4 text-sm font-medium text-[#171412] bg-[#FAF9F7] hover:bg-[#F3EFE8] border border-[#E6E2DC] rounded-lg transition-colors"
              >
                Escolher Champanhe
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#E6E2DC] rounded-xl overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-[#F3F1ED] overflow-hidden">
              {!chocolateImgFailed ? (
                <img
                  src={CHOCOLATE_IMAGE}
                  alt="Caixa artesanal de bombons e trufas com laço de cetim"
                  referrerPolicy="no-referrer"
                  onError={() => setChocolateImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gift className="w-8 h-8 text-[#991B1B]" />
                </div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-base text-[#171412]">
                    Caixa de Chocolates Finos
                  </h3>
                  <span className="font-mono text-xs font-semibold text-[#16A34A]">
                    Incluso no pacote
                  </span>
                </div>
                <p className="text-sm text-[#575049]">
                  Caixa artesanal de chocolates já inclusa como sua opção de brinde no pacote.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGiftOption('chocolate');
                  document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-4 w-full py-2.5 px-4 text-sm font-medium text-[#171412] bg-[#FAF9F7] hover:bg-[#F3EFE8] border border-[#E6E2DC] rounded-lg transition-colors"
              >
                Escolher Chocolates
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#E6E2DC] rounded-xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#575049] mb-2">
                Fogos Inclusos & Segundo Brinde
              </p>
              <h3 className="font-display text-xl font-semibold text-[#171412] mb-3">
                3 Queimas de Fogos já inclusas no pacote
              </h3>
              <p className="text-sm text-[#575049] leading-relaxed mb-6">
                Além de 1 mimo à escolha (Champanhe ou Chocolate), o pacote já inclui 3 queimas de fogos: 1x 12x1, Chuva de Prata e Árvore de Natal (Vulcão).
              </p>

              <div className="space-y-3 pt-4 border-t border-[#E6E2DC] text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#575049]">3 Fogos (12x1, Chuva de Prata, Vulcão)</span>
                  <span className="font-mono text-xs font-semibold text-[#16A34A]">
                    Incluso
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#575049]">Segundo mimo (os dois juntos)</span>
                  <span className="font-mono font-medium text-[#171412] tabular-nums">
                    + {formatBRL(65)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGiftOption('ambos');
                setIncludeFireworks(true);
                document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-6 w-full py-2.5 px-4 text-sm font-medium text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors"
            >
              Escolher os Dois Mimos
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Online Automatic Booking */}
      <section
        id="agendar"
        className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 border-t border-[#E6E2DC]"
      >
        <div className="mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#171412] tracking-tight">
            Agendamento Automático Online
          </h2>
          <p className="text-sm sm:text-base text-[#575049] mt-1">
            Os horários abaixo são atualizados automaticamente conforme nossa agenda ao vivo.
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
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={buildWhatsappSummaryUrl(confirmedBooking)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                Enviar Comprovante no WhatsApp
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
            onSubmit={handleSubmit}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Form Steps */}
            <div className="lg:col-span-8 space-y-10 bg-white border border-[#E6E2DC] rounded-xl p-6 sm:p-8">
              {/* Step 1: Date and Live Available Times */}
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
                      min={getDateString(0)}
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
                            selectedDate === q.date
                              ? 'bg-[#171412] text-white border-[#171412]'
                              : 'bg-[#FAF9F7] text-[#575049] border-[#E6E2DC] hover:text-[#171412]'
                          }`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {slotsError && (
                  <p className="text-sm text-[#DC2626] mb-3">{slotsError}</p>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {availability?.slots.map((slot) => {
                    const isAvailable = slot.state === 'available';
                    const isSelected = selectedTime === slot.time;
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
                          {slot.state === 'available'
                            ? 'Disponível'
                            : slot.state === 'booked'
                              ? 'Reservado'
                              : 'Indisponível'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Occasion, Honoree, Age, Client */}
              <div className="pt-8 border-t border-[#E6E2DC]">
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

              {/* Step 3: Address */}
              <div className="pt-8 border-t border-[#E6E2DC]">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-[#991B1B]" />
                  <h3 className="text-lg font-semibold text-[#171412]">
                    03. Endereço da Homenagem
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-12">
                    <label
                      htmlFor="neighborhood"
                      className="block text-xs font-medium text-[#575049] mb-1.5"
                    >
                      Bairro / Região (a partir de R$ 250,00 no Ipsep — varia pela distância) *
                    </label>
                    <select
                      id="neighborhood"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                    >
                      {NEIGHBORHOOD_ZONES.map((zone) => (
                        <option key={zone.id} value={zone.label}>
                          {zone.label} — {formatBRL(zone.basePrice)}
                        </option>
                      ))}
                    </select>
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
                      placeholder="Ex: Travessa do Gusmão, 91"
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
                </div>
              </div>

              {/* Step 4: Champagne/Chocolate, Fireworks, 3 Songs */}
              <div className="pt-8 border-t border-[#E6E2DC]">
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

              {/* Step 5: Message for the car theme */}
              <div className="pt-8 border-t border-[#E6E2DC]">
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
            </div>

            {/* Sticky Summary Sidebar */}
            <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-white border border-[#E6E2DC] rounded-xl p-6">
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
                <div className="flex justify-between">
                  <span className="text-[#575049]">Pacote base + região</span>
                  <span className="font-mono text-[#171412] tabular-nums">
                    {formatBRL(pricing.basePrice)}
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
                  <span className="font-mono text-2xl font-semibold text-[#991B1B] tabular-nums">
                    {formatBRL(pricing.totalPrice)}
                  </span>
                </div>
              </div>

              {submitError && (
                <p className="mt-4 text-sm text-[#DC2626] bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-lg p-3">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full py-3.5 px-5 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-60"
              >
                {submitting
                  ? 'Confirmando Reserva...'
                  : user
                    ? 'Confirmar Agendamento Automático'
                    : 'Entrar com Google e Confirmar'}
              </button>

              {user ? (
                <div className="mt-3 flex items-center justify-between text-xs text-[#575049]">
                  <span className="truncate max-w-[200px]">
                    Conta: {user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOutUser()}
                    className="underline hover:text-[#171412]"
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#575049] text-center">
                  Ao confirmar, você entra com Google em 1 clique para reservar o horário com segurança.
                </p>
              )}
            </aside>
          </form>
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

      <footer className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-8 border-t border-[#E6E2DC] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#575049]">
        <p>Desperte Corações · Carro de Mensagem ao Vivo em Recife e RMR</p>
        <button
          type="button"
          onClick={onOpenAttendance}
          className="hover:text-[#171412] underline underline-offset-4"
        >
          Acesso ao Centro de Atendimento e Agenda
        </button>
      </footer>
    </main>
  );
};
