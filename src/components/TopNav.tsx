import React from 'react';
import { User } from 'firebase/auth';
import { isAdminUser } from '../lib/firebase';

export type AppMode = 'booking' | 'account';

interface TopNavProps {
  mode: AppMode;
  user: User | null;
  onModeChange: (mode: AppMode) => void;
  onScrollToSection: (sectionId: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  mode,
  user,
  onModeChange,
  onScrollToSection,
}) => {
  const handleNavClick = (sectionId: string) => {
    if (mode !== 'booking') {
      onModeChange('booking');
      setTimeout(() => onScrollToSection(sectionId), 60);
    } else {
      onScrollToSection(sectionId);
    }
  };

  const accountLabel = isAdminUser(user)
    ? 'Painel Admin'
    : user && user.emailVerified
      ? 'Minha Conta'
      : 'Entrar / Registrar';

  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F7]/95 backdrop-blur-sm border-b border-[#E6E2DC]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => {
            onModeChange('booking');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-xl font-semibold tracking-tight text-[#171412] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#991B1B]"
        >
          Desperte Corações
        </button>

        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#575049]"
        >
          <button
            type="button"
            onClick={() => handleNavClick('agendar')}
            className="hover:text-[#171412] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Agendar
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('mimos')}
            className="hover:text-[#171412] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Mimos
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('instagram')}
            className="hover:text-[#171412] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
          >
            @despertecoracoes
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('como-funciona')}
            className="hover:text-[#171412] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-2"
          >
            Como Funciona
          </button>
          <button
            type="button"
            onClick={() => onModeChange('account')}
            className={`transition-colors whitespace-nowrap shrink-0 py-2 ${
              mode === 'account'
                ? 'text-[#991B1B] underline underline-offset-4 font-semibold'
                : 'hover:text-[#171412] hover:underline underline-offset-4'
            }`}
          >
            {accountLabel}
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (mode === 'account') {
                onModeChange('booking');
              } else {
                handleNavClick('agendar');
              }
            }}
            className="px-4 py-2.5 text-sm font-medium text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991B1B]"
          >
            {mode === 'account' ? 'Voltar ao Site' : 'Reservar Horário'}
          </button>
        </div>
      </div>

      <div className="md:hidden border-t border-[#E6E2DC] px-4 py-2 flex items-center justify-between gap-4 text-xs font-medium text-[#575049] overflow-x-auto">
        <button
          type="button"
          onClick={() => handleNavClick('agendar')}
          className="whitespace-nowrap shrink-0 py-1.5"
        >
          Agendar
        </button>
        <button
          type="button"
          onClick={() => handleNavClick('mimos')}
          className="whitespace-nowrap shrink-0 py-1.5"
        >
          Mimos
        </button>
        <button
          type="button"
          onClick={() => handleNavClick('instagram')}
          className="whitespace-nowrap shrink-0 py-1.5"
        >
          Instagram
        </button>
        <button
          type="button"
          onClick={() => handleNavClick('como-funciona')}
          className="whitespace-nowrap shrink-0 py-1.5"
        >
          Como Funciona
        </button>
        <button
          type="button"
          onClick={() => onModeChange('account')}
          className={`whitespace-nowrap shrink-0 py-1.5 ${
            mode === 'account' ? 'text-[#991B1B] font-semibold' : ''
          }`}
        >
          {accountLabel}
        </button>
      </div>
    </header>
  );
};
