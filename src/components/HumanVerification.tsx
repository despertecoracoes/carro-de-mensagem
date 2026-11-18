import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Flame,
  Gift,
  Heart,
  Music,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface ChallengeOption {
  id: 'music' | 'heart' | 'gift' | 'flame';
  label: string;
}

const OPTIONS: ChallengeOption[] = [
  { id: 'music', label: 'Música' },
  { id: 'heart', label: 'Coração' },
  { id: 'gift', label: 'Presente' },
  { id: 'flame', label: 'Fogos' },
];

function renderOptionIcon(id: ChallengeOption['id']) {
  switch (id) {
    case 'music':
      return <Music className="w-4 h-4" />;
    case 'heart':
      return <Heart className="w-4 h-4" />;
    case 'gift':
      return <Gift className="w-4 h-4" />;
    case 'flame':
      return <Flame className="w-4 h-4" />;
  }
}

function pickRandomChallenge(): {
  target: ChallengeOption;
  shuffled: ChallengeOption[];
} {
  const shuffled = [...OPTIONS].sort(() => Math.random() - 0.5);
  const target = shuffled[Math.floor(Math.random() * shuffled.length)];
  return { target, shuffled };
}

interface HumanVerificationProps {
  verified: boolean;
  onVerifiedChange: (verified: boolean) => void;
  compact?: boolean;
}

export const HumanVerification: React.FC<HumanVerificationProps> = ({
  verified,
  onVerifiedChange,
  compact = false,
}) => {
  const mountedAtRef = useRef<number>(Date.now());
  const [honeypot, setHoneypot] = useState('');
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challenge, setChallenge] = useState(() => pickRandomChallenge());
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!verified) {
      mountedAtRef.current = Date.now();
    }
  }, [verified]);

  const handleResetChallenge = () => {
    setChallenge(pickRandomChallenge());
    setErrorMsg('');
  };

  const handleCheckboxClick = () => {
    if (honeypot.trim() !== '') {
      onVerifiedChange(false);
      setErrorMsg('Verificação bloqueada por atividade automatizada.');
      return;
    }
    if (verified) {
      onVerifiedChange(false);
      setChallengeOpen(false);
      return;
    }
    setErrorMsg('');
    setChallenge(pickRandomChallenge());
    setChallengeOpen((prev) => !prev);
  };

  const handleSelectOption = (opt: ChallengeOption) => {
    if (honeypot.trim() !== '') {
      onVerifiedChange(false);
      return;
    }
    const elapsedMs = Date.now() - mountedAtRef.current;
    if (elapsedMs < 600) {
      setErrorMsg('Aguarde um instante e tente novamente.');
      handleResetChallenge();
      return;
    }

    if (opt.id === challenge.target.id) {
      setErrorMsg('');
      setChallengeOpen(false);
      onVerifiedChange(true);
    } else {
      setErrorMsg('Ícone incorreto. Tente o novo desafio abaixo.');
      handleResetChallenge();
    }
  };

  return (
    <div
      className={`border rounded-lg transition-colors ${
        verified
          ? 'bg-[#16A34A]/5 border-[#16A34A]/40'
          : 'bg-[#FAF9F7] border-[#E6E2DC]'
      } ${compact ? 'p-3' : 'p-3.5'}`}
    >
      {/* Honeypot anti-bot invisível para humanos */}
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] top-[-9999px] w-px h-px overflow-hidden"
      >
        <label htmlFor="hp-company-fax">Não preencha este campo</label>
        <input
          id="hp-company-fax"
          name="companyFax"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => {
            setHoneypot(e.target.value);
            if (e.target.value.trim() !== '') {
              onVerifiedChange(false);
            }
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleCheckboxClick}
          className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#991B1B]"
        >
          <span
            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
              verified
                ? 'bg-[#16A34A] border-[#16A34A] text-white'
                : 'bg-white border-[#CFC8BE]'
            }`}
          >
            {verified && <Check className="w-3.5 h-3.5" />}
          </span>
          <span className="text-sm font-medium text-[#171412]">
            {verified ? 'Sou humano · Verificado' : 'Sou humano (verificação anti-robô)'}
          </span>
        </button>

        <ShieldCheck
          className={`w-4 h-4 shrink-0 ${
            verified ? 'text-[#16A34A]' : 'text-[#575049]'
          }`}
        />
      </div>

      {challengeOpen && !verified && (
        <div className="mt-3 pt-3 border-t border-[#E6E2DC] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#171412]">
              Confirme tocando no ícone:{' '}
              <strong className="text-[#991B1B]">{challenge.target.label}</strong>
            </p>
            <button
              type="button"
              onClick={handleResetChallenge}
              title="Gerar outro desafio"
              className="p-1 text-[#575049] hover:text-[#171412] rounded"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {challenge.shuffled.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt)}
                aria-label={opt.label}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 bg-white border border-[#E6E2DC] hover:border-[#991B1B] hover:text-[#991B1B] rounded-lg text-[11px] font-medium text-[#575049] transition-colors"
              >
                {renderOptionIcon(opt.id)}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {errorMsg && <p className="text-xs text-[#DC2626]">{errorMsg}</p>}
        </div>
      )}
    </div>
  );
};
