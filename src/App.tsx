import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  applyEmailVerificationCode,
  auth,
  isAdminUser,
} from './lib/firebase';
import { AppMode, TopNav } from './components/TopNav';
import { BookingSite } from './components/BookingSite';
import { AttendanceCenter } from './components/AttendanceCenter';
import { AuthPanel } from './components/AuthPanel';
import { CustomerPortal } from './components/CustomerPortal';

export default function App() {
  const [mode, setMode] = useState<AppMode>('booking');
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const actionMode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (actionMode === 'verifyEmail' && oobCode) {
      applyEmailVerificationCode(oobCode)
        .then((updatedUser) => {
          if (updatedUser) {
            setUser(updatedUser);
          }
          window.history.replaceState({}, '', window.location.pathname);
          setMode('account');
        })
        .catch(() => {
          // Ignore invalid/expired URL code silently
        });
    }

    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#171412]">
      <TopNav
        mode={mode}
        user={user}
        onModeChange={setMode}
        onScrollToSection={handleScrollToSection}
      />

      {mode === 'booking' ? (
        <BookingSite
          user={user}
          onBookingCreated={() => setRefreshSignal((s) => s + 1)}
          onOpenAccount={() => setMode('account')}
          refreshSignal={refreshSignal}
        />
      ) : !authReady ? (
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-16 text-center text-sm text-[#575049]">
          Conectando com segurança...
        </div>
      ) : isAdminUser(user) ? (
        <AttendanceCenter
          user={user}
          authReady={authReady}
          refreshSignal={refreshSignal}
          onPublicScheduleChanged={() => setRefreshSignal((s) => s + 1)}
        />
      ) : user && user.emailVerified ? (
        <CustomerPortal
          user={user}
          refreshSignal={refreshSignal}
          onGoToBooking={() => {
            setMode('booking');
            setTimeout(() => handleScrollToSection('agendar'), 60);
          }}
        />
      ) : (
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12">
          <AuthPanel user={user} />
        </div>
      )}
    </div>
  );
}
