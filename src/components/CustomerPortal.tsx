import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Music,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Booking, BookingStatus } from '../types/booking';
import { formatBRL, GIFT_OPTIONS } from '../constants/pricing';
import { fetchBookings, updateBookingApi } from '../lib/api';
import { signOutUser } from '../lib/firebase';

function formatDatePtBr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function maskPhone(phone: string): string {
  const clean = phone.trim();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)} •••••-${clean.slice(-4)}`;
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  Pendente: 'text-[#D97706]',
  Confirmado: 'text-[#16A34A]',
  'Em Rota': 'text-[#0284C7]',
  Concluído: 'text-[#575049]',
  Cancelado: 'text-[#DC2626]',
};

interface CustomerPortalProps {
  user: User;
  refreshSignal: number;
  onGoToBooking: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  user,
  refreshSignal,
  onGoToBooking,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>(
    {}
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftMsg, setDraftMsg] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadMyBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchBookings();
      setBookings(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar seus agendamentos.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyBookings();
  }, [loadMyBookings, refreshSignal]);

  const handleSaveCustomMessage = async (bookingId: string) => {
    setSavingEdit(true);
    try {
      const updated = await updateBookingApi(bookingId, {
        customMessage: draftMsg.trim(),
      });
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b))
      );
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="max-w-[1040px] mx-auto px-4 sm:px-8 py-10 space-y-6">
      <div className="bg-white border border-[#E6E2DC] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#991B1B] flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Conta Verificada · Acesso Isolado aos Seus Dados
          </p>
          <h1 className="font-display text-2xl font-semibold text-[#171412]">
            Olá, {user.displayName || 'Cliente'}
          </h1>
          <p className="text-sm text-[#575049]">{user.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onGoToBooking}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </button>
          <button
            type="button"
            onClick={() => signOutUser()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-[#575049] hover:text-[#171412] bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#DC2626]/5 border border-[#DC2626]/20 text-sm text-[#DC2626]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#E6E2DC] rounded-xl p-10 text-center text-sm text-[#575049]">
          Carregando seus agendamentos...
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-[#E6E2DC] rounded-xl p-10 text-center space-y-4">
          <Calendar className="w-8 h-8 text-[#991B1B] mx-auto" />
          <div>
            <h2 className="font-display text-xl font-semibold text-[#171412]">
              Você ainda não possui homenagens agendadas
            </h2>
            <p className="text-sm text-[#575049] mt-1 max-w-md mx-auto">
              Escolha a data, horário disponível, 3 músicas e champanhe ou chocolate para surpreender quem você ama.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToBooking}
            className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors"
          >
            Agendar Minha Homenagem
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#171412]">
            Meus Agendamentos ({bookings.length})
          </h2>

          {bookings.map((b) => {
            const giftLabel =
              GIFT_OPTIONS.find((g) => g.value === b.giftOption)?.label ??
              b.giftOption;
            const phoneVisible = Boolean(revealedPhones[b.id]);

            return (
              <div
                key={b.id}
                className="bg-white border border-[#E6E2DC] rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#E6E2DC]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#575049] mb-1">
                      <span className="font-mono font-semibold text-[#171412]">
                        {b.protocol}
                      </span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">
                        {formatDatePtBr(b.date)} às {b.time}
                      </span>
                      <span>·</span>
                      <span>{b.occasion}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[#171412]">
                      Homenagem para {b.honoreeName}
                      {b.honoreeAge ? ` (${b.honoreeAge} anos)` : ''}
                    </h3>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${STATUS_STYLE[b.status]}`}
                    >
                      {b.status}
                    </p>
                    <p className="font-mono text-base font-semibold text-[#991B1B] tabular-nums mt-0.5">
                      {formatBRL(b.totalPrice)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1.5 text-[#575049]">
                    <p>
                      <strong className="text-[#171412]">Local:</strong>{' '}
                      {b.streetAddress} — {b.neighborhood} ({b.propertyType})
                    </p>
                    <p className="flex items-center gap-2">
                      <span>
                        <strong className="text-[#171412]">WhatsApp:</strong>{' '}
                        <span className="font-mono">
                          {phoneVisible
                            ? b.clientWhatsapp
                            : maskPhone(b.clientWhatsapp)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedPhones((prev) => ({
                            ...prev,
                            [b.id]: !prev[b.id],
                          }))
                        }
                        className="text-xs text-[#991B1B] hover:underline inline-flex items-center gap-1"
                      >
                        {phoneVisible ? (
                          <>
                            <EyeOff className="w-3 h-3" /> Ocultar
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" /> Ver
                          </>
                        )}
                      </button>
                    </p>
                    <p>
                      <strong className="text-[#171412]">Mimo:</strong> {giftLabel}
                      {b.includeFireworks ? ' + 3 Queimas de Fogos' : ''}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-[#575049]">
                    <p className="font-semibold text-[#171412] flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-[#991B1B]" />
                      3 Músicas Escolhidas
                    </p>
                    <ol className="list-decimal list-inside text-xs space-y-0.5">
                      <li>{b.songs[0]}</li>
                      <li>{b.songs[1]}</li>
                      <li>{b.songs[2]}</li>
                    </ol>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E6E2DC]">
                  {editingId === b.id ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-[#575049]">
                        Editar texto da mensagem:
                      </label>
                      <textarea
                        rows={3}
                        value={draftMsg}
                        onChange={(e) => setDraftMsg(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-xs text-[#575049]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={savingEdit}
                          onClick={() => handleSaveCustomMessage(b.id)}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg"
                        >
                          {savingEdit ? 'Salvando...' : 'Salvar Texto'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-[#575049]">
                        Mensagem:{' '}
                        {b.customMessage
                          ? b.customMessage
                          : b.messageSource === 'empresa'
                            ? 'Roteiro personalizado preparado pela equipe'
                            : 'Texto próprio'}
                      </span>

                      <div className="flex items-center gap-3">
                        {b.status === 'Pendente' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(b.id);
                              setDraftMsg(b.customMessage);
                            }}
                            className="text-[#991B1B] font-medium hover:underline"
                          >
                            Editar mensagem
                          </button>
                        )}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Olá! Gostaria de falar sobre o meu agendamento ${b.protocol} (${formatDatePtBr(b.date)} às ${b.time}) para ${b.honoreeName}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#16A34A] font-medium hover:underline"
                        >
                          Falar no WhatsApp
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
