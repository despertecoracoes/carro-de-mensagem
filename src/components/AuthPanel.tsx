import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  applyEmailVerificationCode,
  refreshVerifiedUser,
  registerWithEmail,
  resendVerificationEmail,
  sendResetPassword,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  translateAuthError,
} from '../lib/firebase';
import { upsertUserProfile } from '../lib/api';
import { HumanVerification } from './HumanVerification';
import { PrivacyModal } from './PrivacyModal';

type AuthTab = 'login' | 'register' | 'reset';

interface AuthPanelProps {
  user: User | null;
  onAuthComplete?: () => void;
  title?: string;
  subtitle?: string;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  user,
  onAuthComplete,
  title = 'Entrar ou Criar Conta',
  subtitle = 'Acesse com sua conta Google ou cadastre seu e-mail para reservar horários e acompanhar suas homenagens com segurança.',
}) => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [humanVerified, setHumanVerified] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Email verification step state
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const loggedUser = await signInWithGoogle();
      if (loggedUser.emailVerified) {
        try {
          await upsertUserProfile({
            displayName: loggedUser.displayName || 'Cliente',
            phone: '',
          });
        } catch {
          // Non-blocking profile sync
        }
        onAuthComplete?.();
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!humanVerified) {
      setErrorMsg('Confirme a verificação "Sou humano" antes de entrar.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await signInWithEmail(email, password);
      if (loggedUser.emailVerified) {
        onAuthComplete?.();
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
      setHumanVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Informe seu nome completo.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Escolha uma senha com pelo menos 6 caracteres.');
      return;
    }
    if (!lgpdAccepted) {
      setErrorMsg(
        'Concorde com a Política de Privacidade e Proteção de Dados (LGPD) para criar sua conta.'
      );
      return;
    }
    if (!humanVerified) {
      setErrorMsg('Confirme a verificação "Sou humano" antes de cadastrar.');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(name, email, password);
      setResendCooldown(60);
      setSuccessMsg(
        'Conta criada! Enviamos um e-mail de verificação para confirmar seu endereço.'
      );
    } catch (err) {
      setErrorMsg(translateAuthError(err));
      setHumanVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Informe o e-mail cadastrado para receber o link de redefinição.');
      return;
    }
    if (!humanVerified) {
      setErrorMsg('Confirme a verificação "Sou humano" para continuar.');
      return;
    }

    setLoading(true);
    try {
      await sendResetPassword(email);
      setSuccessMsg(
        'Se existir uma conta com este e-mail, você receberá as instruções para criar uma nova senha.'
      );
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const updated = await refreshVerifiedUser();
      if (updated?.emailVerified) {
        try {
          await upsertUserProfile({
            displayName: updated.displayName || name || 'Cliente',
            phone,
          });
        } catch {
          // Non-blocking profile sync
        }
        onAuthComplete?.();
      } else {
        setErrorMsg(
          'Ainda não identificamos a confirmação. Clique no link enviado ao seu e-mail (confira também o Spam/Lixo Eletrônico) e tente novamente.'
        );
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!verificationCode.trim()) {
      setErrorMsg('Cole o código ou link completo recebido no e-mail.');
      return;
    }
    setLoading(true);
    try {
      const updated = await applyEmailVerificationCode(verificationCode);
      if (updated?.emailVerified) {
        try {
          await upsertUserProfile({
            displayName: updated.displayName || name || 'Cliente',
            phone,
          });
        } catch {
          // Non-blocking
        }
        onAuthComplete?.();
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await resendVerificationEmail();
      setResendCooldown(60);
      setSuccessMsg('Novo e-mail de verificação enviado! Verifique sua caixa de entrada.');
    } catch (err) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // Screen for logged-in but unverified email/password user
  if (user && !user.emailVerified) {
    return (
      <div className="bg-white border border-[#E6E2DC] rounded-xl p-6 sm:p-8 max-w-lg mx-auto">
        <div className="flex items-center gap-2.5 text-[#991B1B] mb-2">
          <Mail className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Confirmação Obrigatória
          </span>
        </div>
        <h2 className="font-display text-2xl font-semibold text-[#171412] mb-2">
          Verifique seu e-mail
        </h2>
        <p className="text-sm text-[#575049] leading-relaxed mb-5">
          Por segurança dos seus dados, enviamos uma mensagem de verificação para{' '}
          <strong className="text-[#171412]">{user.email}</strong>. Abra seu e-mail, clique no link de confirmação e depois aperte o botão abaixo.
        </p>

        {errorMsg && (
          <p className="mb-4 text-xs text-[#DC2626] bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-lg p-3">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p className="mb-4 text-xs text-[#16A34A] bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-lg p-3">
            {successMsg}
          </p>
        )}

        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleCheckVerification}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Verificando...' : 'Já confirmei meu e-mail'}
          </button>

          <button
            type="button"
            disabled={loading || resendCooldown > 0}
            onClick={handleResend}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-[#171412] bg-[#FAF9F7] border border-[#E6E2DC] hover:border-[#CFC8BE] rounded-lg transition-colors disabled:opacity-60"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {resendCooldown > 0
              ? `Reenviar e-mail em ${resendCooldown}s`
              : 'Reenviar e-mail de verificação'}
          </button>
        </div>

        <form
          onSubmit={handleApplyCode}
          className="mt-6 pt-5 border-t border-[#E6E2DC] space-y-2.5"
        >
          <label
            htmlFor="oob-code-input"
            className="block text-xs font-medium text-[#575049]"
          >
            Se preferir, cole o código (`oobCode`) ou link recebido no e-mail:
          </label>
          <div className="flex gap-2">
            <input
              id="oob-code-input"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Cole o código ou link aqui..."
              className="flex-1 px-3 py-2 text-xs bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-[#171412] hover:bg-[#2F2A26] rounded-lg whitespace-nowrap shrink-0"
            >
              Validar Código
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t border-[#E6E2DC] flex items-center justify-between text-xs text-[#575049]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
            Proteção contra contas falsas
          </span>
          <button
            type="button"
            onClick={() => signOutUser()}
            className="underline hover:text-[#171412]"
          >
            Usar outra conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E6E2DC] rounded-xl p-6 sm:p-8 max-w-lg mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-[#991B1B] mb-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Ambiente Seguro · Dados Protegidos</span>
        </div>
        <h2 className="font-display text-2xl font-semibold text-[#171412]">
          {title}
        </h2>
        <p className="text-sm text-[#575049] mt-1 leading-relaxed">{subtitle}</p>
      </div>

      {/* Google Quick Sign-In */}
      <button
        type="button"
        disabled={loading}
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-2.5 py-3 px-4 text-sm font-semibold text-[#171412] bg-[#FAF9F7] hover:bg-[#F2EFEA] border border-[#E6E2DC] rounded-lg transition-colors disabled:opacity-60"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuar com Conta Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-[#575049]">
        <div className="flex-1 h-px bg-[#E6E2DC]" />
        <span>ou com e-mail e senha</span>
        <div className="flex-1 h-px bg-[#E6E2DC]" />
      </div>

      {/* Mode Switch Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg mb-5">
        <button
          type="button"
          onClick={() => {
            setTab('login');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            tab === 'login'
              ? 'bg-white text-[#171412] shadow-sm font-semibold'
              : 'text-[#575049] hover:text-[#171412]'
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('register');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            tab === 'register'
              ? 'bg-white text-[#171412] shadow-sm font-semibold'
              : 'text-[#575049] hover:text-[#171412]'
          }`}
        >
          Criar Conta
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('reset');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            tab === 'reset'
              ? 'bg-white text-[#171412] shadow-sm font-semibold'
              : 'text-[#575049] hover:text-[#171412]'
          }`}
        >
          Recuperar Senha
        </button>
      </div>

      {errorMsg && (
        <p className="mb-4 text-xs text-[#DC2626] bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-lg p-3">
          {errorMsg}
        </p>
      )}
      {successMsg && (
        <p className="mb-4 text-xs text-[#16A34A] bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-lg p-3">
          {successMsg}
        </p>
      )}

      {tab === 'login' && (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label
              htmlFor="auth-login-email"
              className="block text-xs font-medium text-[#575049] mb-1"
            >
              E-mail
            </label>
            <input
              id="auth-login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
              required
            />
          </div>

          <div>
            <label
              htmlFor="auth-login-password"
              className="block text-xs font-medium text-[#575049] mb-1"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="auth-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="Mostrar ou ocultar senha"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#575049] hover:text-[#171412]"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <HumanVerification
            verified={humanVerified}
            onVerifiedChange={setHumanVerified}
            compact
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar na Minha Conta'}
          </button>
        </form>
      )}

      {tab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="auth-reg-name"
                className="block text-xs font-medium text-[#575049] mb-1"
              >
                Nome Completo *
              </label>
              <input
                id="auth-reg-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                required
              />
            </div>
            <div>
              <label
                htmlFor="auth-reg-phone"
                className="block text-xs font-medium text-[#575049] mb-1"
              >
                WhatsApp
              </label>
              <input
                id="auth-reg-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(81) 99999-9999"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-reg-email"
              className="block text-xs font-medium text-[#575049] mb-1"
            >
              E-mail *
            </label>
            <input
              id="auth-reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
              required
            />
          </div>

          <div>
            <label
              htmlFor="auth-reg-password"
              className="block text-xs font-medium text-[#575049] mb-1"
            >
              Crie uma Senha (mínimo 6 caracteres) *
            </label>
            <div className="relative">
              <input
                id="auth-reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label="Mostrar ou ocultar senha"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#575049] hover:text-[#171412]"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <HumanVerification
            verified={humanVerified}
            onVerifiedChange={setHumanVerified}
            compact
          />

          <label className="flex items-start gap-2.5 text-xs text-[#575049] cursor-pointer">
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
                Política de Privacidade e Proteção de Dados (LGPD)
              </button>{' '}
              e autorizo o envio do link de verificação para meu e-mail.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-60"
          >
            {loading
              ? 'Criando conta...'
              : 'Criar Conta e Enviar Verificação por E-mail'}
          </button>
        </form>
      )}

      {tab === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="flex items-start gap-2.5 text-xs text-[#575049] bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg p-3">
            <KeyRound className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
            <span>
              Informe o e-mail usado no cadastro para receber um link seguro de redefinição de senha.
            </span>
          </div>

          <div>
            <label
              htmlFor="auth-reset-email"
              className="block text-xs font-medium text-[#575049] mb-1"
            >
              E-mail cadastrado
            </label>
            <input
              id="auth-reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#E6E2DC] rounded-lg focus:outline-none focus:border-[#991B1B]"
              required
            />
          </div>

          <HumanVerification
            verified={humanVerified}
            onVerifiedChange={setHumanVerified}
            compact
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
          </button>
        </form>
      )}

      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
};
