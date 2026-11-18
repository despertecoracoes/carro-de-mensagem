import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Unlock,
  Video,
  X,
} from 'lucide-react';
import {
  AvailabilityResponse,
  Booking,
  BookingStatus,
  GiftOption,
  InstagramPost,
  MessageSource,
  OccasionType,
  PropertyType,
  QuickTemplate,
  TemplateCategory,
} from '../types/booking';
import {
  formatBRL,
  GIFT_OPTIONS,
  NEIGHBORHOOD_ZONES,
  OCCASIONS,
  TEMPLATE_CATEGORIES,
} from '../constants/pricing';
import { User } from 'firebase/auth';
import {
  createBookingApi,
  createInstagramPostApi,
  createTemplateApi,
  deleteBookingApi,
  deleteInstagramPostApi,
  deleteTemplateApi,
  fetchAvailability,
  fetchBookings,
  fetchInstagramPosts,
  fetchTemplates,
  generateAiMessageApi,
  toggleSlotBlock,
  updateBookingApi,
  updateTemplateApi,
} from '../lib/api';
import { isAdminUser, signOutUser } from '../lib/firebase';

type WorkspaceTab = 'templates' | 'bookings' | 'schedule' | 'instagram';

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDatePtBr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function formatWhatsappHref(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const encoded = encodeURIComponent(message);
  if (digits.length >= 10) {
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    return `https://wa.me/${withCountry}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  Pendente: 'text-[#D97706]',
  Confirmado: 'text-[#16A34A]',
  'Em Rota': 'text-[#0284C7]',
  Concluído: 'text-[#575049]',
  Cancelado: 'text-[#DC2626]',
};

interface AttendanceCenterProps {
  user: User | null;
  authReady: boolean;
  refreshSignal: number;
  onPublicScheduleChanged: () => void;
}

export const AttendanceCenter: React.FC<AttendanceCenterProps> = ({
  user,
  authReady,
  refreshSignal,
  onPublicScheduleChanged,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('templates');

  // Shared Data
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');

  // Templates State & Dynamic Context
  const [ctxClient, setCtxClient] = useState('Priscila Louise');
  const [ctxPhone, setCtxPhone] = useState('(81) 99347-5454');
  const [ctxDate, setCtxDate] = useState('21/11/2026');
  const [ctxTime, setCtxTime] = useState('18:00');
  const [ctxNeighborhood, setCtxNeighborhood] = useState('Bairro São José, Recife');
  const [ctxAddress, setCtxAddress] = useState('Travessa do Gusmão, 91');
  const [ctxHonoree, setCtxHonoree] = useState('Dona Helena');
  const [ctxPrice, setCtxPrice] = useState('R$ 270,00');

  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [templateSearch, setTemplateSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuickTemplate | null>(null);
  const [tplTitle, setTplTitle] = useState('');
  const [tplCategory, setTplCategory] = useState<TemplateCategory>(
    TEMPLATE_CATEGORIES[0]
  );
  const [tplContent, setTplContent] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Bookings State
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('Todos');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [generatingScriptId, setGeneratingScriptId] = useState<string | null>(null);
  const [savingBookingAction, setSavingBookingAction] = useState(false);

  // Manual Booking Modal State
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [mDate, setMDate] = useState(getTodayStr);
  const [mTime, setMTime] = useState('18:00');
  const [mOccasion, setMOccasion] = useState<OccasionType>('Aniversário');
  const [mHonoree, setMHonoree] = useState('');
  const [mAge, setMAge] = useState('');
  const [mClient, setMClient] = useState('');
  const [mWhatsapp, setMWhatsapp] = useState('');
  const [mNeighborhood, setMNeighborhood] = useState(NEIGHBORHOOD_ZONES[0].label);
  const [mStreet, setMStreet] = useState('');
  const [mPropertyType, setMPropertyType] = useState<PropertyType>('Casa');
  const [mReference, setMReference] = useState('');
  const [mGift, setMGift] = useState<GiftOption>('champanhe');
  const [mFireworks, setMFireworks] = useState(true);
  const [mSong1, setMSong1] = useState('');
  const [mSong2, setMSong2] = useState('');
  const [mSong3, setMSong3] = useState('');
  const [mMsgSource, setMMsgSource] = useState<MessageSource>('empresa');
  const [mCustomMsg, setMCustomMsg] = useState('');
  const [mNotes, setMNotes] = useState('');
  const [manualError, setManualError] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // Schedule Management State
  const [scheduleDate, setScheduleDate] = useState(getTodayStr);
  const [scheduleAvailability, setScheduleAvailability] =
    useState<AvailabilityResponse | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);

  // Instagram @despertecoracoes Showcase State
  const [igTitle, setIgTitle] = useState('');
  const [igUrl, setIgUrl] = useState('');
  const [igViews, setIgViews] = useState('');
  const [igOccasion, setIgOccasion] = useState('Aniversário');
  const [igError, setIgError] = useState('');
  const [savingIg, setSavingIg] = useState(false);

  const loadWorkspaceData = useCallback(async () => {
    setLoadingData(true);
    setDataError('');
    try {
      const [tpls, bkgs, igs] = await Promise.all([
        fetchTemplates(),
        fetchBookings(),
        fetchInstagramPosts(),
      ]);
      setTemplates(tpls);
      setBookings(bkgs);
      setInstagramPosts(igs);
      setSelectedBookingId((prev) => {
        if (prev && bkgs.some((b) => b.id === prev)) return prev;
        return bkgs[0]?.id ?? null;
      });
    } catch (err) {
      setDataError(
        err instanceof Error ? err.message : 'Erro ao carregar dados do atendimento.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadScheduleDate = useCallback(async (date: string) => {
    setLoadingSchedule(true);
    try {
      const data = await fetchAvailability(date);
      setScheduleAvailability(data);
    } catch {
      // handled silently or via status
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady || !isAdminUser(user)) {
      setLoadingData(false);
      return;
    }
    loadWorkspaceData();
  }, [authReady, user, loadWorkspaceData, refreshSignal]);

  useEffect(() => {
    if (!authReady) return;
    loadScheduleDate(scheduleDate);
  }, [authReady, scheduleDate, loadScheduleDate, refreshSignal]);

  const interpolateTemplate = useCallback(
    (raw: string) => {
      return raw
        .replaceAll('{cliente}', ctxClient.trim() || '[Nome do cliente]')
        .replaceAll('{data}', ctxDate.trim() || '[Data]')
        .replaceAll('{horario}', ctxTime.trim() || '[Horário]')
        .replaceAll('{bairro}', ctxNeighborhood.trim() || '[Bairro]')
        .replaceAll('{endereco}', ctxAddress.trim() || '[Endereço completo]')
        .replaceAll('{homenageado}', ctxHonoree.trim() || '[Homenageado]')
        .replaceAll('{valor}', ctxPrice.trim() || '[Valor]');
    },
    [
      ctxAddress,
      ctxClient,
      ctxDate,
      ctxHonoree,
      ctxNeighborhood,
      ctxPrice,
      ctxTime,
    ]
  );

  const loadBookingIntoContext = (booking: Booking) => {
    setCtxClient(booking.clientName);
    setCtxPhone(booking.clientWhatsapp);
    setCtxDate(formatDatePtBr(booking.date));
    setCtxTime(booking.time);
    setCtxNeighborhood(booking.neighborhood);
    setCtxAddress(booking.streetAddress);
    setCtxHonoree(booking.honoreeName);
    setCtxPrice(formatBRL(booking.totalPrice));
    setActiveTab('templates');
  };

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesCat =
        selectedCategory === 'Todas' || t.category === selectedCategory;
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [templates, selectedCategory, templateSearch]);

  const filteredBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchesStatus =
        bookingStatusFilter === 'Todos' || b.status === bookingStatusFilter;
      const matchesSearch =
        !q ||
        b.clientName.toLowerCase().includes(q) ||
        b.honoreeName.toLowerCase().includes(q) ||
        b.protocol.toLowerCase().includes(q) ||
        b.neighborhood.toLowerCase().includes(q) ||
        b.streetAddress.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, bookingStatusFilter, bookingSearch]);

  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId]
  );

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    setTplTitle('');
    setTplCategory(TEMPLATE_CATEGORIES[0]);
    setTplContent('');
    setTemplateModalOpen(true);
  };

  const openEditTemplateModal = (tpl: QuickTemplate) => {
    setEditingTemplate(tpl);
    setTplTitle(tpl.title);
    setTplCategory(tpl.category);
    setTplContent(tpl.content);
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplTitle.trim() || !tplContent.trim()) return;
    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        const updated = await updateTemplateApi(editingTemplate.id, {
          title: tplTitle.trim(),
          category: tplCategory,
          content: tplContent.trim(),
        });
        setTemplates((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      } else {
        const created = await createTemplateApi({
          title: tplTitle.trim(),
          category: tplCategory,
          content: tplContent.trim(),
        });
        setTemplates((prev) => [...prev, created]);
      }
      setTemplateModalOpen(false);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteTemplateApi(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateBookingStatus = async (
    id: string,
    status: BookingStatus
  ) => {
    setSavingBookingAction(true);
    try {
      const updated = await updateBookingApi(id, { status });
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      await loadScheduleDate(scheduleDate);
      onPublicScheduleChanged();
    } finally {
      setSavingBookingAction(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    setSavingBookingAction(true);
    try {
      await deleteBookingApi(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      setSelectedBookingId(null);
      await loadScheduleDate(scheduleDate);
      onPublicScheduleChanged();
    } finally {
      setSavingBookingAction(false);
    }
  };

  const handleGenerateScriptForBooking = async (booking: Booking) => {
    setGeneratingScriptId(booking.id);
    try {
      const res = await generateAiMessageApi({
        occasion: booking.occasion,
        honoreeName: booking.honoreeName,
        honoreeAge: booking.honoreeAge,
        senderName: booking.clientName,
        songs: booking.songs,
      });
      const updated = await updateBookingApi(booking.id, {
        generatedScript: res.script,
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? updated : b))
      );
    } finally {
      setGeneratingScriptId(null);
    }
  };

  const handleToggleSlot = async (time: string) => {
    setTogglingSlot(time);
    try {
      const updated = await toggleSlotBlock(scheduleDate, time);
      setScheduleAvailability(updated);
      onPublicScheduleChanged();
    } finally {
      setTogglingSlot(null);
    }
  };

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    if (!mHonoree.trim() || !mClient.trim() || !mWhatsapp.trim() || !mStreet.trim()) {
      setManualError('Preencha homenageado, cliente, WhatsApp e rua.');
      return;
    }
    if (!mSong1.trim() || !mSong2.trim() || !mSong3.trim()) {
      setManualError('Informe as 3 músicas do evento.');
      return;
    }

    setSavingManual(true);
    try {
      const created = await createBookingApi({
        date: mDate,
        time: mTime,
        occasion: mOccasion,
        honoreeName: mHonoree.trim(),
        honoreeAge: mAge.trim(),
        clientName: mClient.trim(),
        clientWhatsapp: mWhatsapp.trim(),
        neighborhood: mNeighborhood,
        streetAddress: mStreet.trim(),
        propertyType: mPropertyType,
        referencePoint: mReference.trim(),
        giftOption: mGift,
        includeFireworks: mFireworks,
        songs: [mSong1.trim(), mSong2.trim(), mSong3.trim()],
        messageSource: mMsgSource,
        customMessage: mCustomMsg.trim(),
        status: 'Confirmado',
        notes: mNotes.trim(),
      });
      setBookings((prev) => [...prev, created]);
      setSelectedBookingId(created.id);
      setManualModalOpen(false);
      setMHonoree('');
      setMAge('');
      setMClient('');
      setMWhatsapp('');
      setMStreet('');
      setMReference('');
      setMSong1('');
      setMSong2('');
      setMSong3('');
      setMCustomMsg('');
      setMNotes('');
      await loadScheduleDate(scheduleDate);
      onPublicScheduleChanged();
    } catch (err) {
      setManualError(
        err instanceof Error ? err.message : 'Erro ao registrar agendamento.'
      );
    } finally {
      setSavingManual(false);
    }
  };

  const handleAddInstagramPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIgError('');
    const trimmedUrl = igUrl.trim();
    if (!/^https:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[a-zA-Z0-9_\-]+/.test(trimmedUrl)) {
      setIgError(
        'Cole um link válido de vídeo/Reel do Instagram (ex.: https://www.instagram.com/reel/...).'
      );
      return;
    }
    if (!igTitle.trim()) {
      setIgError('Informe um título curto para o vídeo.');
      return;
    }
    setSavingIg(true);
    try {
      const created = await createInstagramPostApi({
        title: igTitle.trim(),
        instagramUrl: trimmedUrl,
        viewsLabel: igViews.trim(),
        occasion: igOccasion.trim(),
        order: instagramPosts.length,
      });
      setInstagramPosts((prev) => [...prev, created]);
      setIgTitle('');
      setIgUrl('');
      setIgViews('');
      onPublicScheduleChanged();
    } catch (err) {
      setIgError(
        err instanceof Error ? err.message : 'Erro ao adicionar vídeo.'
      );
    } finally {
      setSavingIg(false);
    }
  };

  const handleDeleteInstagramPost = async (id: string) => {
    await deleteInstagramPostApi(id);
    setInstagramPosts((prev) => prev.filter((p) => p.id !== id));
    onPublicScheduleChanged();
  };

  if (!authReady || !isAdminUser(user)) {
    return null;
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Workspace Sidebar */}
        <aside className="w-full lg:w-[250px] shrink-0 bg-white border border-[#E6E2DC] rounded-xl p-4">
          <div className="pb-4 mb-4 border-b border-[#E6E2DC]">
            <p className="text-xs font-medium text-[#575049]">
              Painel Operacional
            </p>
            <h1 className="font-display text-lg font-semibold text-[#171412] mt-0.5">
              Centro de Atendimento
            </h1>
          </div>

          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'templates'
                  ? 'bg-[#991B1B] text-white'
                  : 'text-[#575049] hover:text-[#171412] hover:bg-[#FAF9F7]'
              }`}
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Mensagens Prontas
              </span>
              <span className="font-mono text-xs opacity-80 tabular-nums">
                {templates.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'bookings'
                  ? 'bg-[#991B1B] text-white'
                  : 'text-[#575049] hover:text-[#171412] hover:bg-[#FAF9F7]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Agenda de Eventos
              </span>
              <span className="font-mono text-xs opacity-80 tabular-nums">
                {bookings.filter((b) => b.status !== 'Cancelado').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'schedule'
                  ? 'bg-[#991B1B] text-white'
                  : 'text-[#575049] hover:text-[#171412] hover:bg-[#FAF9F7]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários Disponíveis
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('instagram')}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'instagram'
                  ? 'bg-[#991B1B] text-white'
                  : 'text-[#575049] hover:text-[#171412] hover:bg-[#FAF9F7]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Vídeos @despertecoracoes
              </span>
              <span className="font-mono text-xs opacity-80 tabular-nums">
                {instagramPosts.length}
              </span>
            </button>
          </nav>

          <div className="hidden lg:block mt-6 pt-4 border-t border-[#E6E2DC] space-y-2 text-xs text-[#575049]">
            <div className="flex justify-between">
              <span>Confirmados</span>
              <span className="font-mono font-medium text-[#171412] tabular-nums">
                {bookings.filter((b) => b.status === 'Confirmado').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Pendentes</span>
              <span className="font-mono font-medium text-[#D97706] tabular-nums">
                {bookings.filter((b) => b.status === 'Pendente').length}
              </span>
            </div>
            <div className="pt-3 border-t border-[#E6E2DC] flex items-center justify-between gap-2">
              <span className="truncate">{user?.email}</span>
              <button
                type="button"
                onClick={() => signOutUser()}
                className="text-[#991B1B] hover:underline shrink-0"
              >
                Sair
              </button>
            </div>
          </div>
        </aside>

        {/* Main Viewport */}
        <section className="flex-1 min-w-0 w-full">
          {dataError && (
            <div className="mb-4 p-4 rounded-xl bg-[#DC2626]/5 border border-[#DC2626]/20 text-sm text-[#DC2626]">
              {dataError}
            </div>
          )}

          {/* TAB 1: MENSAGENS PRONTAS */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#171412]">
                    Mensagens Prontas para WhatsApp
                  </h2>
                  <p className="text-sm text-[#575049] mt-0.5">
                    Preencha os dados do cliente uma vez e copie ou envie qualquer resposta pronta com 1 clique.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewTemplateModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Nova Mensagem Pronta
                </button>
              </div>

              {/* Dynamic Context Fill Bar */}
              <div className="bg-white border border-[#E6E2DC] rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <p className="text-sm font-semibold text-[#171412]">
                    Dados do Cliente em Atendimento
                  </p>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="quick-fill-booking"
                      className="text-xs text-[#575049]"
                    >
                      Puxar de agendamento:
                    </label>
                    <select
                      id="quick-fill-booking"
                      defaultValue=""
                      onChange={(e) => {
                        const found = bookings.find(
                          (b) => b.id === e.target.value
                        );
                        if (found) loadBookingIntoContext(found);
                      }}
                      className="px-2.5 py-1.5 text-xs bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    >
                      <option value="" disabled>
                        Selecionar cliente...
                      </option>
                      {bookings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.clientName} ({formatDatePtBr(b.date)} · {b.time})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#575049] mb-1">
                      Cliente
                    </label>
                    <input
                      type="text"
                      value={ctxClient}
                      onChange={(e) => setCtxClient(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#575049] mb-1">
                      WhatsApp do Cliente
                    </label>
                    <input
                      type="text"
                      value={ctxPhone}
                      onChange={(e) => setCtxPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#575049] mb-1">
                      Data
                    </label>
                    <input
                      type="text"
                      value={ctxDate}
                      onChange={(e) => setCtxDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#575049] mb-1">
                      Horário
                    </label>
                    <input
                      type="text"
                      value={ctxTime}
                      onChange={(e) => setCtxTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#575049] mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={ctxNeighborhood}
                      onChange={(e) => setCtxNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#575049] mb-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={ctxAddress}
                      onChange={(e) => setCtxAddress(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#575049] mb-1">
                      Homenageado(a)
                    </label>
                    <input
                      type="text"
                      value={ctxHonoree}
                      onChange={(e) => setCtxHonoree(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#575049] mb-1">
                      Valor (R$)
                    </label>
                    <input
                      type="text"
                      value={ctxPrice}
                      onChange={(e) => setCtxPrice(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Filter & Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-[#F3F1ED] rounded-lg overflow-x-auto">
                  {['Todas', ...TEMPLATE_CATEGORIES].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-white text-[#171412] shadow-xs'
                          : 'text-[#575049] hover:text-[#171412]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64 shrink-0">
                  <Search className="w-4 h-4 text-[#575049] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Buscar mensagem..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E6E2DC] rounded-lg"
                  />
                </div>
              </div>

              {/* Templates Grid */}
              {loadingData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-48 bg-white border border-[#E6E2DC] rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="bg-white border border-[#E6E2DC] rounded-xl p-8 text-center">
                  <p className="text-sm text-[#575049] mb-3">
                    Nenhuma mensagem pronta encontrada para esse filtro.
                  </p>
                  <button
                    type="button"
                    onClick={openNewTemplateModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#991B1B] rounded-lg"
                  >
                    Criar Mensagem Pronta
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((tpl) => {
                    const resolved = interpolateTemplate(tpl.content);
                    const isCopied = copiedId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        className="bg-white border border-[#E6E2DC] rounded-xl p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 className="font-semibold text-base text-[#171412]">
                                {tpl.title}
                              </h3>
                              <p className="text-xs text-[#575049] mt-0.5">
                                {tpl.category}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditTemplateModal(tpl)}
                                title="Editar mensagem"
                                className="p-1.5 text-[#575049] hover:text-[#171412] rounded-md"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(tpl.id)}
                                title="Excluir mensagem"
                                className="p-1.5 text-[#575049] hover:text-[#DC2626] rounded-md"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <p className="text-sm text-[#36312C] whitespace-pre-line leading-relaxed bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg p-3.5 my-3">
                            {resolved}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(tpl.id, resolved)}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                              isCopied
                                ? 'bg-[#16A34A] text-white'
                                : 'bg-[#171412] text-white hover:bg-[#2F2A26]'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copiar Mensagem
                              </>
                            )}
                          </button>

                          <a
                            href={formatWhatsappHref(ctxPhone, resolved)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-[#16A34A] bg-[#16A34A]/10 hover:bg-[#16A34A]/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Enviar WhatsApp
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AGENDAMENTOS */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#171412]">
                    Agenda de Eventos Ao Vivo
                  </h2>
                  <p className="text-sm text-[#575049] mt-0.5">
                    Pedidos recebidos pelo site automático e agendamentos lançados pelo WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManualModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Novo Agendamento Manual
                </button>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-[#F3F1ED] rounded-lg overflow-x-auto">
                  {(
                    [
                      'Todos',
                      'Pendente',
                      'Confirmado',
                      'Em Rota',
                      'Concluído',
                      'Cancelado',
                    ] as const
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setBookingStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        bookingStatusFilter === st
                          ? 'bg-white text-[#171412] shadow-xs'
                          : 'text-[#575049] hover:text-[#171412]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64 shrink-0">
                  <Search className="w-4 h-4 text-[#575049] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Buscar cliente, bairro..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E6E2DC] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Bookings Table */}
                <div className="xl:col-span-7 bg-white border border-[#E6E2DC] rounded-xl overflow-hidden">
                  {filteredBookings.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-[#575049] mb-3">
                        Nenhum evento encontrado para este filtro.
                      </p>
                      <button
                        type="button"
                        onClick={() => setManualModalOpen(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#991B1B] rounded-lg"
                      >
                        Registrar Primeiro Evento
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E6E2DC]">
                      {filteredBookings.map((b) => {
                        const isSelected = b.id === selectedBookingId;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBookingId(b.id)}
                            className={`w-full text-left p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isSelected ? 'bg-[#FAF9F7]' : 'hover:bg-[#FAF9F7]/60'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2 text-xs text-[#575049]">
                                <span className="font-mono font-semibold text-[#171412] tabular-nums">
                                  {formatDatePtBr(b.date)} · {b.time}
                                </span>
                                <span aria-hidden="true">/</span>
                                <span>{b.occasion}</span>
                                <span aria-hidden="true">/</span>
                                <span className={`font-semibold ${STATUS_STYLE[b.status]}`}>
                                  {b.status}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-[#171412] mt-1">
                                Para {b.honoreeName}
                                {b.honoreeAge ? ` (${b.honoreeAge} anos)` : ''} ·{' '}
                                <span className="font-normal text-[#575049]">
                                  Cliente: {b.clientName}
                                </span>
                              </p>
                              <p className="text-xs text-[#575049] mt-0.5 truncate max-w-md">
                                {b.streetAddress} · {b.neighborhood}
                              </p>
                            </div>
                            <div className="text-left sm:text-right shrink-0">
                              <p className="font-mono text-sm font-semibold text-[#171412] tabular-nums">
                                {formatBRL(b.totalPrice)}
                              </p>
                              <p className="font-mono text-[11px] text-[#575049]">
                                {b.protocol}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected Booking Details */}
                <div className="xl:col-span-5 bg-white border border-[#E6E2DC] rounded-xl p-6">
                  {!selectedBooking ? (
                    <p className="text-sm text-[#575049]">
                      Selecione um agendamento na lista para visualizar músicas, mimos, endereço e roteiro ao vivo.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E6E2DC]">
                        <div>
                          <p className="font-mono text-xs text-[#575049]">
                            {selectedBooking.protocol} ·{' '}
                            {formatDatePtBr(selectedBooking.date)} às{' '}
                            {selectedBooking.time}
                          </p>
                          <h3 className="font-display text-xl font-semibold text-[#171412] mt-1">
                            {selectedBooking.honoreeName}
                            {selectedBooking.honoreeAge
                              ? ` (${selectedBooking.honoreeAge})`
                              : ''}
                          </h3>
                          <p className="text-sm text-[#575049]">
                            {selectedBooking.occasion} · Contratante:{' '}
                            <span className="text-[#171412] font-medium">
                              {selectedBooking.clientName}
                            </span>{' '}
                            ({selectedBooking.clientWhatsapp})
                          </p>
                        </div>

                        <span
                          className={`text-xs font-semibold ${STATUS_STYLE[selectedBooking.status]}`}
                        >
                          {selectedBooking.status}
                        </span>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs font-medium text-[#575049]">
                            Endereço e Referência
                          </p>
                          <p className="text-[#171412] font-medium mt-0.5">
                            {selectedBooking.streetAddress} ({selectedBooking.propertyType})
                          </p>
                          <p className="text-xs text-[#575049]">
                            {selectedBooking.neighborhood}
                          </p>
                          {selectedBooking.referencePoint && (
                            <p className="text-xs text-[#575049] mt-0.5">
                              Ref.: {selectedBooking.referencePoint}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E6E2DC]">
                          <div>
                            <p className="text-xs font-medium text-[#575049]">
                              Mimos e Efeitos
                            </p>
                            <p className="text-sm text-[#171412] mt-0.5">
                              {GIFT_OPTIONS.find(
                                (g) => g.value === selectedBooking.giftOption
                              )?.label ?? 'Nenhum'}
                              {selectedBooking.includeFireworks
                                ? ' + 3 Fogos inclusos (12x1, Chuva de Prata, Vulcão)'
                                : ''}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#575049]">
                              Valor Total
                            </p>
                            <p className="font-mono text-base font-semibold text-[#991B1B] mt-0.5 tabular-nums">
                              {formatBRL(selectedBooking.totalPrice)}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#E6E2DC]">
                          <p className="text-xs font-medium text-[#575049] mb-1">
                            3 Músicas do Carro
                          </p>
                          <ol className="list-decimal list-inside text-sm text-[#171412] space-y-0.5">
                            {selectedBooking.songs.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ol>
                        </div>

                        <div className="pt-2 border-t border-[#E6E2DC]">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <p className="text-xs font-medium text-[#575049]">
                              Roteiro da Mensagem Ao Vivo (
                              {selectedBooking.messageSource === 'empresa'
                                ? 'Gerada pela empresa'
                                : 'Texto do cliente'}
                              )
                            </p>
                            <button
                              type="button"
                              disabled={generatingScriptId === selectedBooking.id}
                              onClick={() =>
                                handleGenerateScriptForBooking(selectedBooking)
                              }
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#991B1B] hover:underline"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {generatingScriptId === selectedBooking.id
                                ? 'Gerando...'
                                : 'Gerar Roteiro IA'}
                            </button>
                          </div>
                          <p className="text-sm text-[#36312C] bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg p-3 whitespace-pre-line">
                            {selectedBooking.generatedScript ||
                              selectedBooking.customMessage ||
                              'Ainda sem texto definido — clique em "Gerar Roteiro IA" para criar o texto para o locutor.'}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-[#E6E2DC] space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              'Confirmado',
                              'Em Rota',
                              'Concluído',
                              'Cancelado',
                            ] as BookingStatus[]
                          ).map((st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={
                                savingBookingAction || selectedBooking.status === st
                              }
                              onClick={() =>
                                handleUpdateBookingStatus(selectedBooking.id, st)
                              }
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                selectedBooking.status === st
                                  ? 'bg-[#171412] text-white border-[#171412]'
                                  : 'bg-[#FAF9F7] text-[#171412] border-[#E6E2DC] hover:border-[#991B1B]'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => loadBookingIntoContext(selectedBooking)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Abrir nas Mensagens Prontas
                          </button>

                          <button
                            type="button"
                            disabled={savingBookingAction}
                            onClick={() => handleDeleteBooking(selectedBooking.id)}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#DC2626]/5 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HORÁRIOS DISPONÍVEIS */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#171412]">
                    Controle de Horários Disponíveis
                  </h2>
                  <p className="text-sm text-[#575049] mt-0.5">
                    Bloqueie ou libere horários manualmente — o site online dos clientes reflete na hora.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="px-3.5 py-2 text-sm bg-white border border-[#E6E2DC] rounded-lg font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => loadScheduleDate(scheduleDate)}
                    className="p-2.5 bg-white border border-[#E6E2DC] rounded-lg text-[#575049] hover:text-[#171412]"
                    title="Recarregar horários"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loadingSchedule ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              </div>

              <div className="bg-white border border-[#E6E2DC] rounded-xl divide-y divide-[#E6E2DC]">
                {scheduleAvailability?.slots.map((slot) => {
                  const matchedBooking =
                    slot.state === 'booked'
                      ? bookings.find(
                          (b) =>
                            b.date === scheduleDate &&
                            b.time === slot.time &&
                            b.status !== 'Cancelado'
                        )
                      : undefined;
                  return (
                    <div
                      key={slot.time}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-base font-semibold text-[#171412] tabular-nums w-16">
                          {slot.time}
                        </span>
                        <div>
                          {slot.state === 'available' && (
                            <p className="text-sm font-medium text-[#16A34A]">
                              Disponível no site online
                            </p>
                          )}
                          {slot.state === 'blocked' && (
                            <p className="text-sm font-medium text-[#575049]">
                              Bloqueado manualmente pela empresa
                            </p>
                          )}
                          {slot.state === 'booked' && (
                            <div>
                              <p className="text-sm font-semibold text-[#171412]">
                                Reservado
                                {matchedBooking
                                  ? ` · ${matchedBooking.clientName} (Para ${matchedBooking.honoreeName})`
                                  : ''}
                              </p>
                              {matchedBooking && (
                                <p className="text-xs text-[#575049]">
                                  {matchedBooking.protocol} · {matchedBooking.occasion} ·{' '}
                                  {matchedBooking.neighborhood}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {slot.state === 'booked' && matchedBooking ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBookingId(matchedBooking.id);
                              setActiveTab('bookings');
                            }}
                            className="px-3.5 py-2 text-xs font-medium text-[#171412] bg-[#FAF9F7] border border-[#E6E2DC] hover:border-[#991B1B] rounded-lg"
                          >
                            Ver Agendamento
                          </button>
                        ) : slot.state === 'booked' ? (
                          <span className="text-xs font-medium text-[#575049]">
                            Horário reservado
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={togglingSlot === slot.time}
                            onClick={() => handleToggleSlot(slot.time)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                              slot.state === 'blocked'
                                ? 'bg-[#16A34A] text-white hover:bg-[#15803D]'
                                : 'bg-[#FAF9F7] text-[#171412] border border-[#E6E2DC] hover:border-[#991B1B]'
                            }`}
                          >
                            {slot.state === 'blocked' ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                Liberar Horário
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Bloquear Horário
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: VÍDEOS DO INSTAGRAM @despertecoracoes */}
          {activeTab === 'instagram' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#171412]">
                  Vídeos em Destaque (@despertecoracoes)
                </h2>
                <p className="text-sm text-[#575049] mt-0.5">
                  Cole aqui os links dos Reels mais visualizados do seu Instagram{' '}
                  <a
                    href="https://www.instagram.com/despertecoracoes/reels/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#991B1B] underline"
                  >
                    @despertecoracoes
                  </a>{' '}
                  para que apareçam reproduzidos direto no site público.
                </p>
              </div>

              <form
                onSubmit={handleAddInstagramPost}
                className="bg-white border border-[#E6E2DC] rounded-xl p-5 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#575049] mb-1">
                      Título da Homenagem *
                    </label>
                    <input
                      type="text"
                      value={igTitle}
                      onChange={(e) => setIgTitle(e.target.value)}
                      placeholder="Ex: Surpresa de Aniversário no Ipsep"
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#575049] mb-1">
                      Link do Reel ou Post no Instagram *
                    </label>
                    <input
                      type="url"
                      value={igUrl}
                      onChange={(e) => setIgUrl(e.target.value)}
                      placeholder="https://www.instagram.com/reel/..."
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#575049] mb-1">
                      Visualizações (opcional)
                    </label>
                    <input
                      type="text"
                      value={igViews}
                      onChange={(e) => setIgViews(e.target.value)}
                      placeholder="Ex: 145 mil visualizações"
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#575049] mb-1">
                      Ocasião
                    </label>
                    <input
                      type="text"
                      value={igOccasion}
                      onChange={(e) => setIgOccasion(e.target.value)}
                      placeholder="Aniversário / Reconciliação"
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    />
                  </div>
                </div>

                {igError && (
                  <p className="text-xs text-[#DC2626]">{igError}</p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingIg}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" />
                    {savingIg ? 'Publicando...' : 'Adicionar Vídeo no Site'}
                  </button>
                </div>
              </form>

              {instagramPosts.length === 0 ? (
                <div className="bg-white border border-[#E6E2DC] rounded-xl p-8 text-center text-sm text-[#575049]">
                  Nenhum vídeo cadastrado ainda. Adicione o link de um Reel do @despertecoracoes acima para exibir na vitrine do site.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {instagramPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white border border-[#E6E2DC] rounded-xl p-4 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-[#991B1B] font-medium">
                          {post.occasion || 'Homenagem'}
                          {post.viewsLabel ? ` · ${post.viewsLabel}` : ''}
                        </p>
                        <h3 className="text-sm font-semibold text-[#171412] mt-0.5">
                          {post.title}
                        </h3>
                        <a
                          href={post.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#575049] hover:text-[#171412] underline truncate block mt-1"
                        >
                          {post.instagramUrl}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteInstagramPost(post.id)}
                        aria-label="Remover vídeo"
                        className="p-2 text-[#575049] hover:text-[#DC2626] rounded shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Modal: Nova / Editar Mensagem Pronta */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E6E2DC] rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-semibold text-[#171412]">
                {editingTemplate
                  ? 'Editar Mensagem Pronta'
                  : 'Nova Mensagem Pronta'}
              </h3>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="p-1 text-[#575049] hover:text-[#171412]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#575049] mb-1">
                  Título do atalho
                </label>
                <input
                  type="text"
                  value={tplTitle}
                  onChange={(e) => setTplTitle(e.target.value)}
                  placeholder="Ex: 09. Confirmação de Sinal Pix"
                  className="w-full px-3.5 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#575049] mb-1">
                  Categoria
                </label>
                <select
                  value={tplCategory}
                  onChange={(e) =>
                    setTplCategory(e.target.value as TemplateCategory)
                  }
                  className="w-full px-3.5 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                >
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#575049] mb-1">
                  Texto da mensagem (use variáveis como {'{cliente}'}, {'{data}'}, {'{horario}'}, {'{bairro}'}, {'{valor}'})
                </label>
                <textarea
                  rows={5}
                  value={tplContent}
                  onChange={(e) => setTplContent(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#575049] hover:text-[#171412]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg"
                >
                  {savingTemplate ? 'Salvando...' : 'Salvar Mensagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Agendamento Manual */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E6E2DC] rounded-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl font-semibold text-[#171412]">
                Registrar Agendamento Manual (WhatsApp)
              </h3>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="p-1 text-[#575049] hover:text-[#171412]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualBooking} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Horário *
                  </label>
                  <select
                    value={mTime}
                    onChange={(e) => setMTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg font-mono"
                  >
                    {[
                      '09:00',
                      '10:30',
                      '12:00',
                      '14:00',
                      '15:30',
                      '17:00',
                      '18:00',
                      '19:30',
                      '21:00',
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Ocasião *
                  </label>
                  <select
                    value={mOccasion}
                    onChange={(e) =>
                      setMOccasion(e.target.value as OccasionType)
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  >
                    {OCCASIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Para quem é a mensagem *
                  </label>
                  <input
                    type="text"
                    value={mHonoree}
                    onChange={(e) => setMHonoree(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Idade
                  </label>
                  <input
                    type="text"
                    value={mAge}
                    onChange={(e) => setMAge(e.target.value)}
                    placeholder="Ex: 35"
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    value={mClient}
                    onChange={(e) => setMClient(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={mWhatsapp}
                    onChange={(e) => setMWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Região / Bairro
                  </label>
                  <select
                    value={mNeighborhood}
                    onChange={(e) => setMNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  >
                    {NEIGHBORHOOD_ZONES.map((z) => (
                      <option key={z.id} value={z.label}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Tipo
                  </label>
                  <select
                    value={mPropertyType}
                    onChange={(e) =>
                      setMPropertyType(e.target.value as PropertyType)
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  >
                    <option value="Casa">Casa</option>
                    <option value="Prédio">Prédio</option>
                    <option value="Comércio">Comércio</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Rua e Número *
                  </label>
                  <input
                    type="text"
                    value={mStreet}
                    onChange={(e) => setMStreet(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Referência
                  </label>
                  <input
                    type="text"
                    value={mReference}
                    onChange={(e) => setMReference(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Mimo (Champanhe / Chocolate)
                  </label>
                  <select
                    value={mGift}
                    onChange={(e) => setMGift(e.target.value as GiftOption)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  >
                    {GIFT_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-[#171412] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mFireworks}
                      onChange={(e) => setMFireworks(e.target.checked)}
                      className="w-4 h-4 accent-[#991B1B]"
                    />
                    3 Queimas de Fogos inclusas (12x1, Chuva de Prata e Árvore de Natal/Vulcão)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={mSong1}
                  onChange={(e) => setMSong1(e.target.value)}
                  placeholder="Música 1 *"
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  required
                />
                <input
                  type="text"
                  value={mSong2}
                  onChange={(e) => setMSong2(e.target.value)}
                  placeholder="Música 2 *"
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  required
                />
                <input
                  type="text"
                  value={mSong3}
                  onChange={(e) => setMSong3(e.target.value)}
                  placeholder="Música 3 *"
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Origem da Mensagem
                  </label>
                  <select
                    value={mMsgSource}
                    onChange={(e) =>
                      setMMsgSource(e.target.value as MessageSource)
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  >
                    <option value="empresa">Empresa cria a mensagem</option>
                    <option value="cliente">Cliente enviou texto próprio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#575049] mb-1">
                    Observações internas
                  </label>
                  <input
                    type="text"
                    value={mNotes}
                    onChange={(e) => setMNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                  />
                </div>
              </div>

              {mMsgSource === 'cliente' && (
                <textarea
                  rows={3}
                  value={mCustomMsg}
                  onChange={(e) => setMCustomMsg(e.target.value)}
                  placeholder="Texto enviado pelo cliente..."
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg"
                />
              )}

              {manualError && (
                <p className="text-sm text-[#DC2626]">{manualError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#575049]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingManual}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg"
                >
                  {savingManual ? 'Salvando...' : 'Salvar e Bloquear Horário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
