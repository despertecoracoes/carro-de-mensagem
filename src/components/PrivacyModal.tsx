import React from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lgpd-modal-title"
    >
      <div className="bg-white border border-[#E6E2DC] rounded-xl max-w-xl w-full p-6 my-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E6E2DC]">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#991B1B] shrink-0" />
            <h2
              id="lgpd-modal-title"
              className="font-display text-xl font-semibold text-[#171412]"
            >
              Proteção de Dados e Segurança (LGPD)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 text-[#575049] hover:text-[#171412] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-4 text-sm text-[#575049] leading-relaxed">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-[#991B1B] shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-[#171412]">
                1. Isolamento Estrito por Conta Verificada
              </p>
              <p>
                Seu nome, WhatsApp, endereço da homenagem e músicas ficam protegidos por regras de acesso no servidor: apenas sua própria conta autenticada (com e-mail verificado) e a equipe autorizada da Desperte Corações podem visualizar sua reserva.
              </p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-[#171412]">
              2. Agenda Pública Sem Dados Pessoais
            </p>
            <p>
              A grade de horários exibida na página inicial consulta exclusivamente a disponibilidade (livre ou ocupado), sem nunca expor nomes, telefones ou endereços de clientes.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[#171412]">
              3. Criptografia em Trânsito e Anti-Robô
            </p>
            <p>
              Todas as comunicações utilizam protocolo HTTPS/TLS, autenticação oficial Firebase e verificação anti-robô ("Sou humano") para evitar cadastros automatizados ou abusos.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[#171412]">
              4. Uso Exclusivo para a Homenagem
            </p>
            <p>
              Não vendemos nem compartilhamos seus dados com terceiros. As informações coletadas servem exclusivamente para organizar a rota do carro, preparar a locução ao vivo e entregar seu mimo no horário combinado.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E6E2DC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
