import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ParticipantView } from './components/ParticipantView';
import { StageControl } from './components/StageControl';
import { AdminDashboard } from './components/AdminDashboard';
import { GlobalWinnerNotification } from './components/GlobalWinnerNotification';
import { EventLockScreen } from './components/EventLockScreen';
import { InaugurationCountdownOverlay } from './components/InaugurationCountdownOverlay';
import { AjkPassModal } from './components/AjkPassModal';
import { Footer } from './components/Footer';
import { AnimatedBackground } from './components/AnimatedBackground';
import { testConnection } from './lib/firebase';
import { EventStatus } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<'participant' | 'stage' | 'admin'>('participant');
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [eventStatus, setEventStatus] = useState<EventStatus>('CLOSED');
  const [isAjkModalOpen, setIsAjkModalOpen] = useState<boolean>(false);
  const [inaugurationCountdown, setInaugurationCountdown] = useState<{
    active: boolean;
    count: number;
  } | null>(null);
  // Permanent Dark Mode only (vintage luxury obsidian & gold)
  const isLightMode = false;

  // Enforce dark mode class on body element and clear legacy light theme cache
  useEffect(() => {
    try {
      localStorage.removeItem('lucky_draw_theme');
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } catch (e) {}
  }, []);

  // Verify Firebase connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  const [adminTab, setAdminTab] = useState<'control' | 'ajk_hadiah' | 'participants' | 'prizes' | 'logs' | 'testing'>('control');

  // Check URL parameters for path routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const viewParam = params.get('view');
    const tabParam = params.get('tab') as any;

    if (tabParam && ['control', 'ajk_hadiah', 'participants', 'prizes', 'logs', 'testing'].includes(tabParam)) {
      setAdminTab(tabParam);
    }

    const pathMatch = window.location.pathname.match(/\/play\/([^/]+)/);
    if (pathMatch) {
      setSelectedToken(pathMatch[1]);
      setCurrentView('participant');
    } else if (token) {
      setSelectedToken(token);
      setCurrentView('participant');
    } else if (viewParam === 'admin') {
      setCurrentView('admin');
    } else if (viewParam === 'stage') {
      setCurrentView('stage');
    } else if (viewParam === 'ajk' || tabParam === 'ajk') {
      setIsAjkModalOpen(true);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/event');
      if (res.ok) {
        const d = await res.json();
        if (d.event?.status) {
          setEventStatus(d.event.status);
        }
        if (d.inauguration?.active) {
          setInaugurationCountdown({
            active: true,
            count: d.inauguration.count,
          });
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchStatus();
    // Gentle 20s background sync (SSE already handles instant updates in real-time)
    const interval = setInterval(fetchStatus, 20000);
    const onFocus = () => fetchStatus();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchStatus]);

  // Real-time SSE listener for instant event status and synchronized countdown updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('event_status', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.status) {
            setEventStatus(payload.status);
          }
        } catch (err) {}
      });

      // Synchronized live inauguration countdown listener for all devices (Stage & Participants)
      eventSource.addEventListener('inauguration_tick', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload) {
            setInaugurationCountdown({
              active: true,
              count: payload.count,
            });
          }
        } catch (err) {}
      });

      eventSource.addEventListener('inauguration_end', () => {
        setInaugurationCountdown(null);
      });
    } catch (err) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const handleSelectParticipantFromAdmin = (token: string) => {
    setSelectedToken(token);
    setCurrentView('participant');
  };

  return (
    <div
      className={`min-h-screen font-sans flex flex-col relative transition-colors ${
        isLightMode
          ? 'bg-[#f7f4ed] text-[#2c2416] selection:bg-[#c5a059]/30 selection:text-[#704e12]'
          : 'bg-[#0b0c10] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200'
      }`}
    >
      {/* Dynamic Animated Ambient Background */}
      <AnimatedBackground isLightMode={isLightMode} />

      {/* Global Real-time Winner Notification Banner */}
      <GlobalWinnerNotification isLightMode={isLightMode} />

      {/* AJK ID Card Modal (Accessible anywhere in app) */}
      <AjkPassModal
        isOpen={isAjkModalOpen}
        onClose={() => setIsAjkModalOpen(false)}
      />

      {/* Synchronized 5-Second Official Inauguration Countdown Overlay (For All Users) */}
      <InaugurationCountdownOverlay
        active={Boolean(inaugurationCountdown?.active)}
        countdownNumber={inaugurationCountdown ? inaugurationCountdown.count : null}
        onFinished={() => setInaugurationCountdown(null)}
        isLightMode={isLightMode}
      />

      {/* Lock Screen for Participants when Draw is CLOSED or PAUSED */}
      {currentView === 'participant' && eventStatus !== 'OPEN' && (
        <EventLockScreen
          status={eventStatus}
          onOpenAdmin={() => setCurrentView('admin')}
          onCheckStatus={fetchStatus}
          isLightMode={isLightMode}
          isCountingDown={Boolean(inaugurationCountdown?.active)}
          countdownNumber={inaugurationCountdown ? inaugurationCountdown.count : null}
        />
      )}

      {/* Top Navigation Bar with Audio Controls & Navigation (Hidden in Stage Mode for pure cinema theater presentation) */}
      {currentView !== 'stage' && (
        <Header
          currentView={currentView}
          onSelectView={(view, tab) => {
            setCurrentView(view);
            if (tab) setAdminTab(tab);
          }}
          eventStatus={eventStatus}
          onOpenAjkPass={() => setIsAjkModalOpen(true)}
        />
      )}

      {/* Main Content View */}
      <main
        className={`flex-1 w-full flex flex-col items-center justify-start relative z-10 ${
          currentView === 'stage' ? 'p-0' : 'pt-3 sm:pt-6'
        }`}
      >
        {currentView === 'participant' && (
          <ParticipantView
            key={selectedToken || 'default'}
            initialToken={selectedToken}
            isLightMode={isLightMode}
          />
        )}

        {currentView === 'stage' && (
          <StageControl
            onClose={() => setCurrentView('participant')}
            isLightMode={isLightMode}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard
            onSelectParticipantForPlay={handleSelectParticipantFromAdmin}
            onOpenStageControl={() => setCurrentView('stage')}
            isLightMode={isLightMode}
            initialTab={adminTab}
          />
        )}
      </main>

      {/* Global Footer (Hidden in Stage Mode) */}
      {currentView !== 'stage' && <Footer isLightMode={isLightMode} />}
    </div>
  );
}
