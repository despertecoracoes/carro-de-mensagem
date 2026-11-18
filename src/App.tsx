import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { AppMode, TopNav } from './components/TopNav';
import { BookingSite } from './components/BookingSite';
import { AttendanceCenter } from './components/AttendanceCenter';

export default function App() {
  const [mode, setMode] = useState<AppMode>('booking');
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
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
        onModeChange={setMode}
        onScrollToSection={handleScrollToSection}
      />

      {mode === 'booking' ? (
        <BookingSite
          user={user}
          onBookingCreated={() => setRefreshSignal((s) => s + 1)}
          onOpenAttendance={() => setMode('attendance')}
        />
      ) : (
        <AttendanceCenter
          user={user}
          authReady={authReady}
          refreshSignal={refreshSignal}
          onPublicScheduleChanged={() => setRefreshSignal((s) => s + 1)}
        />
      )}
    </div>
  );
}
