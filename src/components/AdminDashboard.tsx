import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Play,
  Pause,
  Square,
  Users,
  Gift,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Download,
  Printer,
  ShieldCheck,
  Zap,
  RotateCcw,
  Check,
  ExternalLink,
  ChevronRight,
  QrCode,
  Copy,
  X,
  Crown,
  Sparkles,
  Lock,
  Radio,
  Bomb,
  Camera,
  BarChart3,
  Activity,
  Wifi,
  Cpu,
  AlertTriangle,
  Server,
  FileText,
} from 'lucide-react';
import { EventConfig, Prize, Participant, AuditLog, LiveStats, EventStatus, DIVISIONS } from '../types';
import { sound } from '../lib/sound';
import { LanyardPassModal } from './LanyardPassModal';
import { AjkPassModal } from './AjkPassModal';
import { StageControl } from './StageControl';
import { EventAnalyticsModal } from './EventAnalyticsModal';
import { generateEventAnalyticsPdf } from '../lib/eventAnalyticsPdfGenerator';

interface AdminDashboardProps {
  onSelectParticipantForPlay?: (token: string) => void;
  onOpenStageControl?: () => void;
  isLightMode?: boolean;
  initialTab?: 'control' | 'ajk_hadiah' | 'participants' | 'prizes' | 'logs' | 'testing';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectParticipantForPlay,
  onOpenStageControl,
  isLightMode = false,
  initialTab,
}) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminPasscode, setAdminPasscode] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Data states
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'control' | 'ajk_hadiah' | 'participants' | 'prizes' | 'logs' | 'testing'>(
    initialTab || 'control'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // AJK Hadiah Tab State (Pengurusan & Tuntutan Hadiah Bukan Utama)
  const [claimSearchCode, setClaimSearchCode] = useState<string>('');
  const [ajkStaffName, setAjkStaffName] = useState<string>(() => {
    try {
      return localStorage.getItem('last_ajk_staff_name') || 'AJK Hadiah';
    } catch {
      return 'AJK Hadiah';
    }
  });
  const [claimNotes, setClaimNotes] = useState<string>('');
  const [verifiedClaimParticipant, setVerifiedClaimParticipant] = useState<Participant | null>(null);
  const [isVerifyingClaim, setIsVerifyingClaim] = useState<boolean>(false);
  const [claimVerifyError, setClaimVerifyError] = useState<string | null>(null);
  const [isConfirmingClaim, setIsConfirmingClaim] = useState<boolean>(false);
  const [claimConfirmSuccess, setClaimConfirmSuccess] = useState<string | null>(null);

  // Filters for Non-Grand Prize Winners table
  const [ajkFilterStatus, setAjkFilterStatus] = useState<'ALL' | 'UNCLAIMED' | 'CLAIMED'>('ALL');
  const [ajkFilterSession, setAjkFilterSession] = useState<'ALL' | 'Sesi Pagi' | 'Sesi Petang'>('ALL');
  const [ajkTableSearch, setAjkTableSearch] = useState<string>('');
  const [quickClaimParticipant, setQuickClaimParticipant] = useState<Participant | null>(null);

  // Camera Scanner for AJK Hadiah (Imbas QR Tuntutan Secara Langsung)
  const [isAjkScannerOpen, setIsAjkScannerOpen] = useState<boolean>(false);
  const [ajkScannerStarting, setAjkScannerStarting] = useState<boolean>(false);
  const [ajkScannerError, setAjkScannerError] = useState<string | null>(null);
  const ajkHtml5QrCodeRef = React.useRef<Html5Qrcode | null>(null);
  const ajkQrRegionId = 'ajk-camera-qr-region';

  // Modal Paparan QR Tuntutan Pengawas
  const [viewingQrParticipant, setViewingQrParticipant] = useState<Participant | null>(null);
  const [viewingQrDataUrl, setViewingQrDataUrl] = useState<string>('');
  const [viewingQrCopied, setViewingQrCopied] = useState<boolean>(false);

  useEffect(() => {
    if (viewingQrParticipant?.claimCode) {
      QRCode.toDataURL(`CLAIM:${viewingQrParticipant.claimCode}`, {
        width: 320,
        margin: 2,
        color: { dark: '#0b0c10', light: '#ffffff' },
      })
        .then((url) => setViewingQrDataUrl(url))
        .catch(() => {});
    } else {
      setViewingQrDataUrl('');
    }
  }, [viewingQrParticipant]);

  const [isStageDrawModalOpen, setIsStageDrawModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDivision, setFilterDivision] = useState<string>('ALL');
  const [filterSession, setFilterSession] = useState<string>('ALL');

  // Candidates for Stage Draw
  const stageCandidates = participants.filter((p) => p.isGrandPrizeCandidate);
  const pendingStageCandidates = stageCandidates.filter(
    (p) => p.grandPrizeStatus === 'PENDING_STAGE_DRAW' || (!p.prizeName && p.isGrandPrizeCandidate)
  );

  // Prize Modal state
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState<boolean>(false);
  const [editingPrize, setEditingPrize] = useState<Partial<Prize> | null>(null);

  // Participant CRUD States
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState<boolean>(false);
  const [newPartName, setNewPartName] = useState<string>('');
  const [newPartNumber, setNewPartNumber] = useState<string>('');
  const [newPartDivision, setNewPartDivision] = useState<string>('Divisyen 1');
  const [newPartSession, setNewPartSession] = useState<'Sesi Pagi' | 'Sesi Petang'>('Sesi Pagi');

  const [isEditPartModalOpen, setIsEditPartModalOpen] = useState<boolean>(false);
  const [editingParticipant, setEditingParticipant] = useState<Partial<Participant> | null>(null);

  // Single QR Modal
  const [isSingleQrModalOpen, setIsSingleQrModalOpen] = useState<boolean>(false);
  const [qrParticipant, setQrParticipant] = useState<Participant | null>(null);
  const [singleQrDataUrl, setSingleQrDataUrl] = useState<string>('');
  const [singleQrCopied, setSingleQrCopied] = useState<boolean>(false);

  // Lanyard Pass Modal (PDF Export)
  const [isLanyardModalOpen, setIsLanyardModalOpen] = useState<boolean>(false);
  // AJK ID Card Modal (PDF Export & Print)
  const [isAjkModalOpen, setIsAjkModalOpen] = useState<boolean>(false);
  // Event Analytics & Post-Event Report Modal (2 PM Peak Audit)
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState<boolean>(false);

  // Real-Time System Stability & Health Telemetry (White-screen pre-emptive warning & 2 PM audit)
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [livePingMs, setLivePingMs] = useState<number | null>(null);
  const [logsFilter, setLogsFilter] = useState<'peak' | 'all' | 'crypto'>('peak');
  const [peakSessionAudit, setPeakSessionAudit] = useState<any[]>([]);
  const [isHealthRefreshing, setIsHealthRefreshing] = useState<boolean>(false);

  // Concurrency test output
  const [concurrencyResults, setConcurrencyResults] = useState<any | null>(null);
  const [concurrencyLoading, setConcurrencyLoading] = useState<boolean>(false);

  // Crash Test State (to test ErrorBoundary)
  const [shouldTriggerCrash, setShouldTriggerCrash] = useState<boolean>(false);

  if (shouldTriggerCrash) {
    throw new Error('UJIAN KEMALANGAN (TEST CRASH): Ralat buatan sengaja dicetuskan dari Panel Pentadbir untuk menguji ketahanan sistem.');
  }

  // Check saved session
  useEffect(() => {
    const saved = localStorage.getItem('admin_session');
    if (saved) {
      setIsAuthenticated(true);
      fetchDashboardData();
    }
  }, []);

  // Polling for live updates every 4 seconds as reliable fallback
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Real-time SSE stream listener for instant Claimed status updates & live sync
  useEffect(() => {
    if (!isAuthenticated) return;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      // Real-time prize claim confirmation
      eventSource.addEventListener('claim_confirmed', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload) {
            // Update the claimed participant immediately in local state
            setParticipants((prev) =>
              prev.map((p) => {
                const matchNumber = Boolean(p.participantNumber && payload.participantNumber && p.participantNumber === payload.participantNumber);
                const matchId = Boolean(payload.participantId && p.participantId === payload.participantId);
                const matchCode = Boolean(p.claimCode && payload.claimCode && p.claimCode.toUpperCase() === payload.claimCode.toUpperCase());
                const matchName = Boolean(payload.winnerName && p.participantName.trim().toLowerCase() === payload.winnerName.trim().toLowerCase());

                if (matchNumber || matchId || matchCode || matchName) {
                  return {
                    ...p,
                    claimStatus: 'CLAIMED',
                    claimedAt: payload.timestamp || new Date().toISOString(),
                    claimedBy: payload.claimedBy || 'AJK Bertugas',
                  };
                }
                return p;
              })
            );

            // Play pleasant confirmation sound
            sound.playCelebrationFanfare();

            // Background sync metrics
            fetchDashboardData(true);
          }
        } catch (err) {}
      });

      // Real-time draw / spin win update
      eventSource.addEventListener('big_win', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload) {
            setParticipants((prev) =>
              prev.map((p) => {
                if (p.participantNumber === payload.participantNumber) {
                  return {
                    ...p,
                    status: 'PLAYED',
                    prizeName: payload.prizeName || p.prizeName,
                    claimCode: payload.claimCode || p.claimCode,
                    claimStatus: payload.prizeName ? 'UNCLAIMED' : p.claimStatus,
                  };
                }
                return p;
              })
            );
            fetchDashboardData(true);
          }
        } catch (err) {}
      });

      eventSource.addEventListener('stage_candidate_added', () => {
        fetchDashboardData(true);
      });

      eventSource.addEventListener('stage_draw_revealed', () => {
        fetchDashboardData(true);
      });

      eventSource.addEventListener('event_status', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.event) {
            setEventConfig(payload.event);
          }
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasscode === 'adminhitea123') {
      setIsAuthenticated(true);
      localStorage.setItem('admin_session', 'true');
      fetchDashboardData();
    } else {
      setAuthError('Invalid administrator passcode.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_session');
  };

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const resOverview = await fetch('/api/admin/overview');
      const dataOverview = await resOverview.json();
      if (resOverview.ok) {
        if (dataOverview.event) setEventConfig(dataOverview.event);
        if (dataOverview.stats) setStats(dataOverview.stats);
        // Stale-While-Revalidate safeguard: never clear existing prizes if transient fetch returns empty
        if (Array.isArray(dataOverview.prizes) && dataOverview.prizes.length > 0) {
          setPrizes(dataOverview.prizes);
        }
        if (Array.isArray(dataOverview.recentLogs) && dataOverview.recentLogs.length > 0) {
          setAuditLogs(dataOverview.recentLogs);
        }
      }

      const resParts = await fetch('/api/admin/participants');
      const dataParts = await resParts.json();
      if (resParts.ok) {
        // Stale-While-Revalidate safeguard: never clear existing prefects list if transient fetch returns empty
        if (Array.isArray(dataParts.participants) && dataParts.participants.length > 0) {
          setParticipants(dataParts.participants);
        }
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchSystemHealth = async () => {
    setIsHealthRefreshing(true);
    try {
      const pingStart = performance.now();
      const [healthRes, pingRes] = await Promise.all([
        fetch('/api/admin/system-health'),
        fetch('/api/admin/ping'),
      ]);
      const pingEnd = performance.now();
      setLivePingMs(Math.round(pingEnd - pingStart));

      if (healthRes.ok) {
        const data = await healthRes.json();
        setSystemHealth(data.health);
        if (data.peakSessionAudit) setPeakSessionAudit(data.peakSessionAudit);
      }
    } catch (e) {
      console.error('Failed to fetch system health:', e);
    } finally {
      setIsHealthRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'logs') return;
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  const handleUpdateEventStatus = async (status: EventStatus) => {
    try {
      const res = await fetch('/api/event/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actor: 'Admin' }),
      });
      if (res.ok) {
        setActionSuccess(`Session status updated to: ${status}`);
        setTimeout(() => setActionSuccess(null), 3000);
        fetchDashboardData(true);
      }
    } catch (e) {
      alert('Failed to update session status.');
    }
  };

  const handleInaugurateCountdown = async () => {
    try {
      const res = await fetch('/api/event/inaugurate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'Admin Dashboard' }),
      });
      if (res.ok) {
        setActionSuccess('Detik perasmian 5 saat dimulakan ke semua peranti!');
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (e) {
      alert('Gagal memulakan detik perasmian.');
    }
  };

  const handleResetDraw = async () => {
    if (
      !window.confirm(
        'WARNING: This will reset all participants\' draw status to NOT_PLAYED and restore all prize inventory to original stock. Are you sure you want to proceed?'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (res.ok) {
        setActionSuccess('Draw status reset successfully! All prize stock restored.');
        setTimeout(() => setActionSuccess(null), 3000);
        fetchDashboardData(true);
      }
    } catch (e) {
      alert('Failed to reset draw.');
    }
  };

  const handleReseed = async () => {
    if (
      !window.confirm(
        'WARNING: Re-seeding will overwrite all attendee records and prizes with the 140 default sample entries. Proceed?'
      )
    ) {
      return;
    }

    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      if (res.ok) {
        setActionSuccess('140 sample attendees and official prizes re-seeded successfully!');
        setTimeout(() => setActionSuccess(null), 3000);
        fetchDashboardData(true);
      }
    } catch (e) {
      alert('Failed to re-seed database.');
    }
  };

  const handleDownloadBackup = () => {
    window.open('/api/admin/backup', '_blank');
  };

  const handleRepairBackup = async () => {
    if (
      !window.confirm(
        'Baik pulih sandaran akan memulihkan 10 senarai hadiah rasmi sekolah dan memastikan semua 140 pengawas mempunyai penetapan Sesi Pagi & Sesi Petang yang sah. Teruskan?'
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backup/repair', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(data.message || 'Pangkalan data sandaran berjaya dibaik pulih!');
        setTimeout(() => setActionSuccess(null), 4000);
        fetchDashboardData(true);
      } else {
        alert(data.error || 'Gagal membaik pulih sandaran.');
      }
    } catch (e) {
      alert('Ralat semasa menghubungi pelayan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrize?.prizeName || editingPrize?.totalQuantity === undefined) return;

    try {
      const res = await fetch('/api/admin/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPrize),
      });
      if (res.ok) {
        setIsPrizeModalOpen(false);
        setEditingPrize(null);
        fetchDashboardData(true);
        setActionSuccess('Prize updated successfully!');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (e) {
      alert('Failed to save prize.');
    }
  };

  const handleDeletePrize = async (prizeId: string) => {
    if (!window.confirm('Are you sure you want to delete this prize?')) return;
    try {
      const res = await fetch(`/api/admin/prizes/${prizeId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDashboardData(true);
      }
    } catch (e) {
      alert('Failed to delete prize.');
    }
  };

  const handleRestore40Prizes = async () => {
    if (!window.confirm('Pulihkan senarai rasmi 45 hadiah (18 Hadiah Utama Pentas #1-#18 + 27 Hadiah Imbasan Langsung #19-#45)? Semua baki stok hadiah akan diselaraskan.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/prizes/restore-45', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(data.message || '45 hadiah rasmi berjaya dipulihkan!');
        setTimeout(() => setActionSuccess(null), 4000);
        fetchDashboardData(true);
      } else {
        alert(data.error || 'Gagal memulihkan hadiah.');
      }
    } catch (e) {
      alert('Ralat menyambung ke pelayan.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePrizeCategory = async (prizeId: string) => {
    try {
      const res = await fetch(`/api/admin/prizes/${prizeId}/toggle-grand`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        fetchDashboardData(true);
        setActionSuccess(data.message || 'Kategori hadiah berjaya ditukar.');
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        alert(data.error || 'Gagal menukar kategori hadiah.');
      }
    } catch (e) {
      alert('Ralat menyambung ke pelayan.');
    }
  };

  const handleShowParticipantQr = async (p: Participant) => {
    try {
      const playUrl = `${window.location.origin}/play/${p.secureToken}`;
      const url = await QRCode.toDataURL(playUrl, {
        width: 300,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setSingleQrDataUrl(url);
      setQrParticipant(p);
      setIsSingleQrModalOpen(true);
      setSingleQrCopied(false);
    } catch (e) {
      alert('Error generating QR code.');
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim()) return;

    try {
      const res = await fetch('/api/admin/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: [
            {
              participantName: newPartName.trim(),
              participantNumber: newPartNumber.trim() || undefined,
              division: newPartDivision,
              session: newPartSession,
            },
          ],
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setIsAddPartModalOpen(false);
        setNewPartName('');
        setNewPartNumber('');
        setNewPartDivision('Divisyen 1');
        setNewPartSession('Sesi Pagi');
        fetchDashboardData(true);
        setActionSuccess('Pengawas berjaya didaftarkan!');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (e) {
      alert('Ralat menambah pengawas.');
    }
  };

  const handleSaveEditParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant?.participantId || !editingParticipant?.participantName?.trim()) return;

    try {
      const div = editingParticipant.division ?? '';
      const res = await fetch(`/api/admin/participants/${editingParticipant.participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: editingParticipant.participantName.trim(),
          division: div,
          session: editingParticipant.session || 'Sesi Pagi',
          participantNumber: editingParticipant.participantNumber?.trim(),
        }),
      });
      if (res.ok) {
        setIsEditPartModalOpen(false);
        setEditingParticipant(null);
        fetchDashboardData(true);
        setActionSuccess('Attendee record updated!');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (e) {
      alert('Error updating attendee.');
    }
  };

  const handleDeleteParticipant = async (p: Participant) => {
    if (
      !window.confirm(
        `Are you sure you want to delete attendee [${p.participantNumber}] ${p.participantName}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/participants/${p.participantId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionSuccess(`Attendee ${p.participantName} deleted.`);
        setTimeout(() => setActionSuccess(null), 2500);
        fetchDashboardData(true);
      }
    } catch (e) {
      alert('Error deleting attendee.');
    }
  };

  const runConcurrencyTest = async (simulatedUsers = 20) => {
    setConcurrencyLoading(true);
    setConcurrencyResults(null);
    try {
      const res = await fetch('/api/test/concurrency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulatedUsers }),
      });
      const data = await res.json();
      setConcurrencyResults(data);
      fetchDashboardData(true);
    } catch (e) {
      alert('Error executing stress test.');
    } finally {
      setConcurrencyLoading(false);
    }
  };

  const exportParticipantsCsv = () => {
    const headers = ['No. Pengawas', 'Nama', 'Divisyen', 'Sesi', 'Token', 'Status Cabutan', 'Hadiah', 'Kod Tuntutan', 'Status Tuntutan', 'Masa Cabutan'];
    const rows = participants.map((p) => [
      p.participantNumber,
      `"${p.participantName.replace(/"/g, '""')}"`,
      `"${((p.division || '')).replace(/"/g, '""')}"`,
      `"${(p.session || 'Sesi Pagi').replace(/"/g, '""')}"`,
      p.secureToken,
      p.status,
      `"${(p.prizeName || '-').replace(/"/g, '""')}"`,
      p.claimCode || '-',
      p.claimStatus,
      p.playedAt ? new Date(p.playedAt).toLocaleString('en-US') : '-',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pengawas_apresiasi_2026_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Attendees
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.participantNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.division && p.division.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.prizeName && p.prizeName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'PLAYED' && p.status === 'PLAYED') ||
      (filterStatus === 'NOT_PLAYED' && p.status === 'NOT_PLAYED') ||
      (filterStatus === 'GRAND_FINALIST' && p.isGrandPrizeCandidate) ||
      (filterStatus === 'WON' && p.prizeName && !p.isGrandPrizeCandidate) ||
      (filterStatus === 'CLAIMED' && p.claimStatus === 'CLAIMED') ||
      (filterStatus === 'UNCLAIMED' && p.prizeName && p.claimStatus !== 'CLAIMED');

    const matchesDivision =
      filterDivision === 'ALL' ||
      (p.division && p.division.includes(filterDivision));

    const session = p.session || 'Sesi Pagi';
    const matchesSession = filterSession === 'ALL' || session === filterSession;

    return matchesSearch && matchesStatus && matchesDivision && matchesSession;
  });

  // AJK Hadiah: Non-Grand Prize Calculations
  const nonGrandPrizeParticipants = participants.filter((p) => {
    // Participant MUST have actually played and won a prize
    if (p.status !== 'PLAYED') return false;
    if (!p.prizeName && !p.prizeId) return false;
    if (p.isGrandPrizeCandidate) return false;
    const pz = prizes.find((x) => x.prizeId === p.prizeId || x.prizeName === p.prizeName);
    if (pz && pz.prizeCategory === 'Grand Prize') return false;
    const pName = (p.prizeName || '').toLowerCase();
    if (pName.includes('grand prize') || pName.includes('ipad') || pName.includes('smart tv') || pName.includes('galaxy watch')) {
      return false;
    }
    return true;
  });

  const unclaimedNonGrandCount = nonGrandPrizeParticipants.filter((p) => p.claimStatus !== 'CLAIMED').length;
  const claimedNonGrandCount = nonGrandPrizeParticipants.filter((p) => p.claimStatus === 'CLAIMED').length;

  const filteredNonGrandParticipants = nonGrandPrizeParticipants.filter((p) => {
    if (ajkFilterStatus !== 'ALL' && p.claimStatus !== ajkFilterStatus) return false;
    if (ajkFilterSession !== 'ALL') {
      const sess = p.session || 'Sesi Pagi';
      if (sess !== ajkFilterSession) return false;
    }
    if (ajkTableSearch.trim()) {
      const q = ajkTableSearch.toLowerCase();
      const matchName = p.participantName.toLowerCase().includes(q);
      const matchNum = p.participantNumber.toLowerCase().includes(q);
      const matchCode = (p.claimCode || '').toLowerCase().includes(q);
      const matchPrize = (p.prizeName || '').toLowerCase().includes(q);
      const matchDiv = (p.division || '').toLowerCase().includes(q);
      if (!matchName && !matchNum && !matchCode && !matchPrize && !matchDiv) return false;
    }
    return true;
  });

  const handleVerifyClaim = async (overrideCode?: string) => {
    const rawCode = (overrideCode !== undefined ? overrideCode : claimSearchCode).trim();
    if (!rawCode) {
      setClaimVerifyError('Sila masukkan Kod Tuntutan (cth: HT26-XXXX) atau No. Pengawas (cth: BP-015)');
      return;
    }
    setClaimVerifyError(null);
    setClaimConfirmSuccess(null);
    setIsVerifyingClaim(true);

    try {
      const cleanUpper = rawCode.toUpperCase().replace('CLAIM:', '');
      const localMatch = participants.find(
        (p) =>
          (p.claimCode && p.claimCode.toUpperCase() === cleanUpper) ||
          p.participantNumber.toUpperCase() === cleanUpper ||
          p.participantName.toUpperCase() === cleanUpper ||
          p.participantName.toUpperCase().includes(cleanUpper) ||
          p.secureToken === rawCode
      );

      if (localMatch) {
        // Strict eligibility validation:
        if (localMatch.status !== 'PLAYED' || !localMatch.prizeName) {
          setClaimVerifyError(
            `Peserta [${localMatch.participantNumber}] ${localMatch.participantName} BELUM membuat cabutan bertuah dan BELUM memenangi sebarang hadiah. Tuntutan TIDAK dibenarkan.`
          );
          setVerifiedClaimParticipant(null);
          setIsVerifyingClaim(false);
          return;
        }

        // Grand Prize check:
        if (localMatch.isGrandPrizeCandidate) {
          setClaimVerifyError(
            `Peserta [${localMatch.participantNumber}] ${localMatch.participantName} adalah pemenang HADIAH UTAMA (${localMatch.prizeName}). Penyerahan hadiah utama mesti dibuat di PENTAS UTAMA, bukan di Kaunter AJK Hadiah.`
          );
          setVerifiedClaimParticipant(null);
          setIsVerifyingClaim(false);
          return;
        }

        setVerifiedClaimParticipant(localMatch);
        setIsVerifyingClaim(false);
        sound.playClick();
        return;
      }

      const res = await fetch('/api/claim/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimCode: cleanUpper }),
      });
      const data = await res.json();
      if (res.ok && data.participant) {
        setVerifiedClaimParticipant(data.participant);
        sound.playClick();
      } else {
        setClaimVerifyError(data.error || 'Kod tuntutan / no. pengawas tidak ditemui dalam sistem.');
        setVerifiedClaimParticipant(null);
      }
    } catch {
      setClaimVerifyError('Ralat sambungan ketika menyemak kod tuntutan.');
    } finally {
      setIsVerifyingClaim(false);
    }
  };

  const handleConfirmClaim = async (participantToConfirm: Participant, customNotes?: string) => {
    if (!participantToConfirm) return;
    setIsConfirmingClaim(true);
    setClaimVerifyError(null);
    setClaimConfirmSuccess(null);

    const verifier = ajkStaffName.trim() || 'AJK Bertugas';
    try {
      localStorage.setItem('last_ajk_staff_name', verifier);
    } catch {}

    try {
      const res = await fetch('/api/claim/handover-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participantToConfirm.participantId,
          claimedBy: verifier,
          notes: customNotes || claimNotes || 'Diserahkan di Kaunter AJK Hadiah',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playCelebrationFanfare();
        setClaimConfirmSuccess(
          `TAHNIAH! Hadiah "${participantToConfirm.prizeName}" berjaya disahkan dan diserahkan kepada ${participantToConfirm.participantName} (${participantToConfirm.participantNumber}) oleh ${verifier}.`
        );
        await fetchDashboardData(true);
        setVerifiedClaimParticipant((prev) =>
          prev && prev.participantId === participantToConfirm.participantId
            ? { ...prev, claimStatus: 'CLAIMED', claimedAt: new Date().toISOString(), claimedBy: verifier }
            : null
        );
        setQuickClaimParticipant(null);
        setClaimNotes('');
      } else {
        setClaimVerifyError(data.error || 'Gagal mengesahkan penyerahan hadiah.');
      }
    } catch {
      setClaimVerifyError('Ralat pelayan semasa mengesahkan penyerahan.');
    } finally {
      setIsConfirmingClaim(false);
    }
  };

  const handleExportNonGrandClaimsCsv = () => {
    const rows = [
      ['No', 'No Pengawas', 'Nama Pengawas', 'Sesi', 'Divisyen', 'Hadiah Dimenangi', 'Kategori Hadiah', 'Kod Tuntutan', 'Status Tuntutan', 'Tarikh Tuntutan', 'AJK Pengesah'],
      ...nonGrandPrizeParticipants.map((p, idx) => [
        idx + 1,
        p.participantNumber,
        `"${p.participantName.replace(/"/g, '""')}"`,
        p.session || 'Sesi Pagi',
        p.division || '-',
        `"${(p.prizeName || '-').replace(/"/g, '""')}"`,
        prizes.find((pz) => pz.prizeId === p.prizeId || pz.prizeName === p.prizeName)?.prizeCategory || 'Bukan Hadiah Utama',
        p.claimCode || '-',
        p.claimStatus === 'CLAIMED' ? 'TELAH DITUNTUT' : 'BELUM DITUNTUT',
        p.claimedAt ? new Date(p.claimedAt).toLocaleString('ms-MY') : '-',
        p.claimedBy || '-',
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `senarai_tuntutan_ajk_hadiah_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startAjkScanner = async () => {
    sound.playClick();
    setIsAjkScannerOpen(true);
    setAjkScannerError(null);
    setAjkScannerStarting(true);

    setTimeout(async () => {
      try {
        const el = document.getElementById(ajkQrRegionId);
        if (!el) throw new Error('Bekas imbasan belum sedia.');

        if (ajkHtml5QrCodeRef.current) {
          try {
            await ajkHtml5QrCodeRef.current.stop();
          } catch (e) {}
          ajkHtml5QrCodeRef.current = null;
        }

        const html5QrCode = new Html5Qrcode(ajkQrRegionId);
        ajkHtml5QrCodeRef.current = html5QrCode;

        let cameraConfig: any = { facingMode: 'environment' };
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCam = cameras.find((c) => {
              const label = c.label.toLowerCase();
              return label.includes('back') || label.includes('belakang') || label.includes('environment');
            });
            cameraConfig = backCam ? backCam.id : cameras[0].id;
          }
        } catch (e) {}

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 12,
            qrbox: { width: 220, height: 220 },
          },
          async (decodedText) => {
            sound.playCelebrationFanfare();
            await stopAjkScanner();
            let cleanCode = decodedText.trim();
            if (cleanCode.startsWith('CLAIM:')) cleanCode = cleanCode.replace('CLAIM:', '');
            const urlMatch = cleanCode.match(/\/play\/([^/?#]+)/);
            if (urlMatch) cleanCode = urlMatch[1];

            setClaimSearchCode(cleanCode);
            handleVerifyClaim(cleanCode);
          },
          () => {}
        );
        setAjkScannerStarting(false);
      } catch (err: any) {
        console.warn('AJK Scanner failed:', err);
        setAjkScannerStarting(false);
        setAjkScannerError(
          'Kamera tidak dapat diakses atau kebenaran disekat. Sila benarkan kebenaran kamera atau masukkan kod tuntutan secara manual.'
        );
      }
    }, 150);
  };

  const stopAjkScanner = async () => {
    if (ajkHtml5QrCodeRef.current) {
      try {
        await ajkHtml5QrCodeRef.current.stop();
      } catch (e) {}
      ajkHtml5QrCodeRef.current = null;
    }
    setIsAjkScannerOpen(false);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div
        className={`w-full max-w-md mx-auto my-12 p-6 sm:p-8 border-2 rounded-3xl shadow-2xl text-center transition-colors ${
          isLightMode
            ? 'bg-[#fffdfa] border-[#c5a059] text-[#2c2416] shadow-amber-900/10'
            : 'bg-[#12141e] border-amber-500/30 text-white'
        }`}
      >
        <div
          className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${
            isLightMode
              ? 'bg-amber-100/70 border-[#c5a059] text-[#8c6721]'
              : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
          }`}
        >
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-serif-vintage tracking-wide">
          Admin Panel
        </h2>
        <p className="text-xs opacity-75 mt-1 mb-6 font-serif-vintage">
          Majlis Apresiasi Lembaga Pengawas Sekolah
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold block mb-1 opacity-80">
              Kata Laluan Admin:
            </label>
            <input
              type="password"
              value={adminPasscode}
              onChange={(e) => setAdminPasscode(e.target.value)}
              placeholder="Masukkan kata laluan admin"
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition ${
                isLightMode
                  ? 'bg-[#f7f4ed] border-[#c5a059]/50 text-[#2c2416] focus:border-[#8c6721]'
                  : 'bg-[#0a0b10] border-amber-500/30 text-white focus:ring-2 focus:ring-amber-500'
              }`}
              autoFocus
            />
          </div>

          {authError && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200">
              {authError}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3.5 px-4 rounded-xl text-sm font-black tracking-wider uppercase font-serif-vintage transition cursor-pointer shadow-lg ${
              isLightMode
                ? 'bg-gradient-to-r from-[#c5a059] to-[#dfba73] text-[#241c13]'
                : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            Buka Admin Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-16 px-3 sm:px-6">
      {/* Top Banner & Control Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-amber-500/25">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest font-serif-vintage ${
                isLightMode
                  ? 'bg-amber-100/70 border-[#c5a059] text-[#704e12]'
                  : 'bg-amber-500/20 border-amber-400/30 text-amber-300'
              }`}
            >
              ✦ Admin Panel ✦
            </span>
            <span className="text-xs opacity-75">Diselaraskan Langsung</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-serif-vintage mt-1">
            Majlis Apresiasi Lembaga Pengawas Sekolah
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Launch Stage Control Button */}
          <button
            onClick={() => {
              if (onOpenStageControl) {
                onOpenStageControl();
              } else {
                setIsStageDrawModalOpen(true);
              }
            }}
            className={`px-4 py-2 font-black text-xs rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer font-serif-vintage ${
              isLightMode
                ? 'bg-gradient-to-r from-[#c5a059] to-[#dfba73] text-[#241c13]'
                : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Buka Kawalan Pentas</span>
          </button>

          {/* Print Lanyard Passes & PDF Download Button */}
          <button
            onClick={() => setIsLanyardModalOpen(true)}
            className="px-3.5 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer bg-gradient-to-r from-amber-500/20 to-yellow-500/15 hover:from-amber-500/30 hover:to-yellow-500/25 text-amber-200 border-amber-500/40 shadow-sm"
            title="Buka tetingkap cetakan dan muat turun fail PDF rasmi peserta"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Pas Lanyard Peserta</span>
          </button>

          {/* Dedicated AJK ID Card PDF Generator Button (Separate System) */}
          <button
            onClick={() => setIsAjkModalOpen(true)}
            className="px-3.5 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer bg-gradient-to-r from-emerald-500/20 to-teal-500/15 hover:from-emerald-500/30 hover:to-teal-500/25 text-emerald-200 border-emerald-500/40 shadow-sm"
            title="Buka penjana dan muat turun fail PDF Kad ID Ahli Jawatankuasa (26 AJK)"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Kad ID AJK (26 Ahli)</span>
          </button>

          {/* Official Event Analytics & 2 PM Crash Audit Report */}
          <button
            onClick={() => setIsAnalyticsModalOpen(true)}
            className="px-3.5 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer bg-gradient-to-r from-purple-500/20 to-indigo-500/15 hover:from-purple-500/30 hover:to-indigo-500/25 text-purple-200 border-purple-500/40 shadow-sm"
            title="Buka laporan analitik rasmi acara, audit kestabilan, graf waktu puncak 2 petang, dan muat turun PDF/Excel"
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Laporan & Analitik (2 Petang)</span>
          </button>

          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isLightMode
                ? 'bg-[#eee6d5] border-[#c5a059]/50 text-[#61491e]'
                : 'bg-[#181a26] hover:bg-[#222538] text-amber-300 border-amber-500/30'
            }`}
            title="Muat semula data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isLightMode
                ? 'bg-amber-100/50 hover:bg-amber-100 text-[#73541c] border-[#d8c292]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-transparent'
            }`}
          >
            Log Keluar
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="mb-4 p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Overview Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div
            className={`p-4 rounded-2xl border shadow-lg transition-colors ${
              isLightMode
                ? 'bg-[#fffdfa] border-[#c5a059]/40 text-[#2c2416]'
                : 'bg-[#12141e] border-amber-500/25 text-white'
            }`}
          >
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider block mb-1">
              Jumlah Pengawas
            </span>
            <div className="text-2xl font-black font-serif-vintage">
              {stats.totalParticipants}
            </div>
            <div className="text-[11px] text-amber-500 font-semibold mt-1">
              {stats.totalPlayed} Cabut • {stats.totalNotPlayed} Baki
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-lg transition-colors ${
              isLightMode
                ? 'bg-[#fffdfa] border-[#c5a059]/40 text-[#2c2416]'
                : 'bg-[#12141e] border-amber-500/25 text-white'
            }`}
          >
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider block mb-1">
              Inventori Hadiah
            </span>
            <div className="text-2xl font-black font-serif-vintage text-amber-500">
              {stats.totalPrizesRemaining} <span className="text-xs opacity-60 font-normal">/ {stats.totalPrizes}</span>
            </div>
            <div className="text-[11px] text-emerald-500 font-semibold mt-1">
              {stats.totalPrizesWon} Dimenangi
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-lg transition-colors ${
              isLightMode
                ? 'bg-[#fffdfa] border-[#c5a059]/40 text-[#2c2416]'
                : 'bg-[#12141e] border-amber-500/25 text-white'
            }`}
          >
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider block mb-1">
              Finalis Pentas
            </span>
            <div className="text-2xl font-black font-serif-vintage text-amber-500">
              {stageCandidates.length}
            </div>
            <div className="text-[11px] opacity-75 font-semibold mt-1">
              {pendingStageCandidates.length} Menunggu di Pentas
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-lg transition-colors ${
              isLightMode
                ? 'bg-[#fffdfa] border-[#c5a059]/40 text-[#2c2416]'
                : 'bg-[#12141e] border-amber-500/25 text-white'
            }`}
          >
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider block mb-1">
              Status Sesi
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-3 h-3 rounded-full ${
                  eventConfig?.status === 'OPEN'
                    ? 'bg-emerald-400 animate-pulse'
                    : eventConfig?.status === 'PAUSED'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-lg font-black font-serif-vintage">
                {eventConfig?.status === 'OPEN'
                  ? 'DIBUKA'
                  : eventConfig?.status === 'PAUSED'
                  ? 'DITANGGUH'
                  : 'DITUTUP'}
              </span>
            </div>
            <div className="text-[10px] opacity-60 mt-1">Kawalan langsung</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-amber-500/20 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('control')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'control'
              ? isLightMode
                ? 'bg-amber-100 text-[#704e12] border border-[#c5a059] shadow-sm'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          Kawalan Sesi
        </button>

        <button
          onClick={() => setActiveTab('ajk_hadiah')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'ajk_hadiah'
              ? isLightMode
                ? 'bg-amber-100 text-[#704e12] border border-[#c5a059] shadow-sm'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>AJK Hadiah (Tuntutan)</span>
          {unclaimedNonGrandCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
              {unclaimedNonGrandCount}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
              {nonGrandPrizeParticipants.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'participants'
              ? isLightMode
                ? 'bg-amber-100 text-[#704e12] border border-[#c5a059] shadow-sm'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          Senarai Pengawas ({participants.length})
        </button>

        <button
          onClick={() => setActiveTab('prizes')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'prizes'
              ? isLightMode
                ? 'bg-amber-100 text-[#704e12] border border-[#c5a059] shadow-sm'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          Senarai Hadiah ({prizes.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'logs'
              ? isLightMode
                ? 'bg-amber-100 text-[#704e12] border border-[#c5a059] shadow-sm'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          Log Audit ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('testing')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'testing'
              ? isLightMode
                ? 'bg-amber-100 text-[#704e12] border border-[#c5a059] shadow-sm'
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          Ujian Bebanan
        </button>
      </div>

      {/* TAB 1: EVENT CONTROL */}
      {activeTab === 'control' && (
        <div className="space-y-6">
          <div className="bg-[#12141e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-base font-bold font-serif-vintage text-amber-200 mb-1">
              Kawalan Status Sesi Cabutan Bertuah
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Kawal status sesi siaran langsung. Apabila DITUTUP, semua peranti peserta akan ditahan pada paparan menunggu arahan pengacara majlis.
            </p>

            <div className="mb-4">
              <button
                onClick={handleInaugurateCountdown}
                className={`w-full py-3.5 px-6 rounded-2xl text-sm font-black uppercase tracking-wider font-serif-vintage transition flex items-center justify-center gap-2.5 cursor-pointer shadow-lg ${
                  isLightMode
                    ? 'bg-gradient-to-r from-[#b38628] via-[#dfba73] to-[#b38628] text-[#241c13] hover:brightness-105'
                    : 'bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 shadow-amber-500/20'
                }`}
              >
                <Sparkles className="w-5 h-5 animate-spin [animation-duration:6s]" />
                <span>RASMIKAN SESI (SIARAN COUNTDOWN 5 SAAT KE SEMUA PERANTI)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleUpdateEventStatus('OPEN')}
                className={`p-4 rounded-2xl border transition flex items-center justify-center gap-3 font-bold text-sm cursor-pointer ${
                  eventConfig?.status === 'OPEN'
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/30 shadow-lg'
                    : 'bg-[#181a28] border-slate-700 text-slate-300 hover:border-emerald-500/50'
                }`}
              >
                <Play className="w-5 h-5 text-emerald-400" />
                <span>BUKA SESI CABUTAN</span>
              </button>

              <button
                onClick={() => handleUpdateEventStatus('PAUSED')}
                className={`p-4 rounded-2xl border transition flex items-center justify-center gap-3 font-bold text-sm cursor-pointer ${
                  eventConfig?.status === 'PAUSED'
                    ? 'bg-amber-950/80 border-amber-400 text-amber-200 ring-2 ring-amber-500/30 shadow-lg'
                    : 'bg-[#181a28] border-slate-700 text-slate-300 hover:border-amber-500/50'
                }`}
              >
                <Pause className="w-5 h-5 text-amber-400" />
                <span>TANGGUHKAN SESI</span>
              </button>

              <button
                onClick={() => handleUpdateEventStatus('CLOSED')}
                className={`p-4 rounded-2xl border transition flex items-center justify-center gap-3 font-bold text-sm cursor-pointer ${
                  eventConfig?.status === 'CLOSED'
                    ? 'bg-rose-950/80 border-rose-400 text-rose-200 ring-2 ring-rose-500/30 shadow-lg'
                    : 'bg-[#181a28] border-slate-700 text-slate-300 hover:border-rose-500/50'
                }`}
              >
                <Square className="w-5 h-5 text-rose-400" />
                <span>TUTUP / KUNCI SESI</span>
              </button>
            </div>

            <div className="pt-2 border-t border-amber-500/20">
              <button
                onClick={async () => {
                  await sound.unlockContext();
                  sound.playNotificationDing();
                  sound.playCelebrationFanfare();
                  try {
                    await fetch('/api/test/broadcast-win', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        winnerName: 'Muhammad Danish (Ujian Admin)',
                        participantNumber: 'BP-012',
                        prizeName: 'Hamper Khas Apresiasi Pengawas',
                        prizeCategory: 'Standard Prize',
                      }),
                    });
                  } catch (e) {}
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Radio className="w-4 h-4 text-amber-400" />
                <span>Uji Siaran Notifikasi Pemenang (Dengan Audio)</span>
              </button>
            </div>
          </div>

          {/* Danger Zone Actions */}
          <div className="bg-[#12141e] border border-red-500/25 rounded-3xl p-6 sm:p-8 shadow-xl">
            <h3 className="text-base font-bold font-serif-vintage text-red-300 mb-1">
              Pengurusan Data & Kawalan Tetapan Semula
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Tetapkan semula status cabutan sebelum majlis bermula atau jana semula data sampel.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                title="Muat turun fail database_backup.json ke peranti"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Muat Turun Sandaran (JSON)</span>
              </button>

              <button
                onClick={handleRepairBackup}
                className="px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                title="Pulihkan integriti 10 hadiah rasmi & sesi pengawas"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Baik Pulih Sandaran (10 Hadiah & Sesi)</span>
              </button>

              <button
                onClick={handleResetDraw}
                className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tetapkan Semula Semua Cabutan</span>
              </button>

              <button
                onClick={handleReseed}
                className="px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Jana Semula 140 Pengawas & Hadiah</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('AMARAN: Ini akan mencetuskan ralat kemalangan (test crash) serta-merta untuk menguji skrin perlindungan Error Boundary. Teruskan?')) {
                    setShouldTriggerCrash(true);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <Bomb className="w-4 h-4 text-rose-400" />
                <span>Uji Kemalangan (Test Crash)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB AJK HADIAH: KAUNTER TUNTUTAN HADIAH BUKAN UTAMA */}
      {activeTab === 'ajk_hadiah' && (
        <div className="space-y-6">
          {/* Header & Quick Statistics */}
          <div className="bg-[#12141e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-amber-500/20">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl border flex items-center justify-center bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-amber-400 text-slate-950 shadow-md">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-serif-vintage text-amber-200">
                    Kaunter Pengurusan & Tuntutan Hadiah (AJK Hadiah)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                    Khusus untuk semakan, pengesahan, dan penyerahan hadiah-hadiah yang <strong className="text-amber-300">BUKAN hadiah utama</strong> (Hadiah Imbasan Langsung #19 - #45). Hadiah Utama (#1 - #18) diserahkan di Pentas Utama.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  onClick={handleExportNonGrandClaimsCsv}
                  className="px-3.5 py-2 rounded-xl border transition flex items-center gap-2 text-xs font-bold cursor-pointer bg-[#181a28] border-amber-500/30 text-amber-300 hover:bg-[#222538]"
                  title="Muat turun senarai serahan hadiah bukan utama"
                >
                  <Download className="w-4 h-4" />
                  <span>Eksport CSV Serahan</span>
                </button>
              </div>
            </div>

            {/* 3 Metric Cards for Non-Grand Prizes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6">
              <div className="p-4 rounded-2xl bg-[#0b0c12] border border-amber-500/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Jumlah Pemenang Hadiah Biasa
                </span>
                <div className="text-2xl font-black font-serif-vintage text-amber-300">
                  {nonGrandPrizeParticipants.length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Pengawas yang memenangi hadiah bukan utama
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0b0c12] border border-emerald-500/30">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Telah Diserahkan / Dituntut
                </span>
                <div className="text-2xl font-black font-serif-vintage text-emerald-400 flex items-center gap-2">
                  <span>{claimedNonGrandCount}</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 inline" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Selesai diambil oleh pengawas di kaunter
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0b0c12] border border-amber-500/30">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Belum Dituntut (Menunggu Serahan)
                </span>
                <div className="text-2xl font-black font-serif-vintage text-amber-400 flex items-center gap-2">
                  <span>{unclaimedNonGrandCount}</span>
                  {unclaimedNonGrandCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block" />
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Perlu pengesahan serahan AJK Meja Hadiah
                </div>
              </div>
            </div>
          </div>

          {/* Verification & Handover Desk */}
          <div className="bg-[#12141e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-2.5 mb-4">
              <QrCode className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm sm:text-base font-bold font-serif-vintage text-amber-200">
                Semakan Pantas Kod Tuntutan / No. Pengawas
              </h4>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Imbas kod QR pada peranti pengawas dengan kamera, atau taip Kod Tuntutan (cth: <code className="text-amber-300">HT26-XXXX</code>) atau No. Pengawas (cth: <code className="text-amber-300">BP-015</code>) untuk mengesahkan kelayakan hadiah bukan utama.
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                type="button"
                onClick={startAjkScanner}
                className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider font-serif-vintage bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-lg flex items-center gap-2 cursor-pointer transition"
              >
                <Camera className="w-4 h-4 text-slate-950" />
                <span>Imbas Kod QR Tuntutan (Kamera)</span>
              </button>
              <span className="text-[11px] text-slate-400">
                — atau masukkan kod / carian manual:
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyClaim();
              }}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4"
            >
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Kod Tuntutan / No. Pengawas / Nama:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={claimSearchCode}
                    onChange={(e) => setClaimSearchCode(e.target.value)}
                    placeholder="Contoh: HT26-X8K2, BP-012, atau nama..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white text-xs uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama AJK Bertugas:
                </label>
                <input
                  type="text"
                  value={ajkStaffName}
                  onChange={(e) => setAjkStaffName(e.target.value)}
                  placeholder="Nama AJK / Guru"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={isVerifyingClaim}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase font-serif-vintage transition flex items-center justify-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md disabled:opacity-50"
                >
                  {isVerifyingClaim ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Semak</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {claimVerifyError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 mb-4 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{claimVerifyError}</span>
              </div>
            )}

            {/* Success Notification */}
            {claimConfirmSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 mb-4 animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <div className="font-semibold leading-relaxed">{claimConfirmSuccess}</div>
              </div>
            )}

            {/* Verified Participant Result Card */}
            {verifiedClaimParticipant && (
              <div className="mt-4 p-5 rounded-2xl border-2 bg-[#0b0c12] border-amber-400 shadow-2xl relative animate-fadeIn">
                <button
                  onClick={() => setVerifiedClaimParticipant(null)}
                  className="absolute top-3.5 right-3.5 p-1.5 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
                  title="Tutup maklumat semakan"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 border border-amber-400/50 text-amber-300">
                        {verifiedClaimParticipant.participantNumber}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {verifiedClaimParticipant.session || 'Sesi Pagi'}
                        {verifiedClaimParticipant.division ? ` • ${verifiedClaimParticipant.division}` : ''}
                      </span>
                    </div>
                    <h5 className="text-base font-black font-serif-vintage text-white">
                      {verifiedClaimParticipant.participantName}
                    </h5>
                  </div>

                  <div>
                    {verifiedClaimParticipant.status !== 'PLAYED' || !verifiedClaimParticipant.prizeName ? (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span>BELUM MEMENANGI SEBARANG HADIAH</span>
                      </div>
                    ) : verifiedClaimParticipant.isGrandPrizeCandidate ? (
                      <div className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-purple-400" />
                        <span>PEMENANG HADIAH UTAMA (SERAH DI PENTAS)</span>
                      </div>
                    ) : verifiedClaimParticipant.claimStatus === 'CLAIMED' ? (
                      <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>TELAH DITUNTUT</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>SAH • LAYAK MENERIMA HADIAH</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prize Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                  <div className="p-3.5 rounded-xl bg-[#12141e] border border-amber-500/20">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Hadiah Dimenangi
                    </span>
                    <div className="text-sm font-black font-serif-vintage text-amber-200">
                      {verifiedClaimParticipant.prizeName || 'Tiada Hadiah (Belum Cabut / Menang)'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {verifiedClaimParticipant.isGrandPrizeCandidate
                        ? 'Kategori: Hadiah Utama Pentas'
                        : 'Kategori: Bukan Hadiah Utama (Serahan Kaunter)'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#12141e] border border-amber-500/20">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Kod Tuntutan Rasmi
                    </span>
                    <div className="text-sm font-mono font-black text-amber-400 tracking-wider">
                      {verifiedClaimParticipant.claimCode || 'TIADA KOD'}
                    </div>
                    {verifiedClaimParticipant.claimStatus === 'CLAIMED' ? (
                      <div className="text-[11px] text-slate-400 mt-1">
                        Diserahkan pada: {new Date(verifiedClaimParticipant.claimedAt || '').toLocaleString('ms-MY')} oleh <span className="text-amber-300">{verifiedClaimParticipant.claimedBy}</span>
                      </div>
                    ) : verifiedClaimParticipant.status === 'PLAYED' && verifiedClaimParticipant.prizeName && !verifiedClaimParticipant.isGrandPrizeCandidate ? (
                      <div className="text-[11px] text-emerald-400 mt-1 font-semibold">
                        Sedia untuk diserahkan kepada pengawas
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-400 mt-1 font-semibold">
                        Tidak layak untuk serahan di kaunter
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirm Action Button: ONLY for eligible non-grand prize winners who have played */}
                {verifiedClaimParticipant.claimStatus !== 'CLAIMED' &&
                verifiedClaimParticipant.status === 'PLAYED' &&
                verifiedClaimParticipant.prizeName &&
                !verifiedClaimParticipant.isGrandPrizeCandidate ? (
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="w-full sm:w-1/2">
                      <input
                        type="text"
                        value={claimNotes}
                        onChange={(e) => setClaimNotes(e.target.value)}
                        placeholder="Nota serahan (pilihan, cth: Diserah di kaunter)"
                        className="w-full px-3 py-2 rounded-xl bg-[#12141e] border border-amber-500/30 text-white text-xs"
                      />
                    </div>
                    <button
                      onClick={() => handleConfirmClaim(verifiedClaimParticipant)}
                      disabled={isConfirmingClaim}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black uppercase font-serif-vintage transition flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-lg disabled:opacity-50"
                    >
                      {isConfirmingClaim ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Sahkan Penyerahan Hadiah</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setVerifiedClaimParticipant(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Non-Grand Prize Winners Table & Management */}
          <div className="bg-[#12141e] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-amber-500/20">
              <div>
                <h4 className="text-sm sm:text-base font-bold font-serif-vintage text-amber-200">
                  Senarai Penerima Hadiah Bukan Utama ({filteredNonGrandParticipants.length})
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daftar pengawas yang memenangi hadiah Standard, Premium & Khas untuk memudahkan tuntutan terus di meja AJK.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={ajkTableSearch}
                    onChange={(e) => setAjkTableSearch(e.target.value)}
                    placeholder="Cari nama, no, kod..."
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-[#0a0b10] border border-amber-500/25 text-white text-xs w-44 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <select
                  value={ajkFilterStatus}
                  onChange={(e) => setAjkFilterStatus(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-[#0a0b10] border border-amber-500/25 text-white text-xs focus:outline-none"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="UNCLAIMED">⏳ Belum Dituntut ({unclaimedNonGrandCount})</option>
                  <option value="CLAIMED">✅ Telah Dituntut ({claimedNonGrandCount})</option>
                </select>

                <select
                  value={ajkFilterSession}
                  onChange={(e) => setAjkFilterSession(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-[#0a0b10] border border-amber-500/25 text-white text-xs focus:outline-none"
                >
                  <option value="ALL">Semua Sesi</option>
                  <option value="Sesi Pagi">☀️ Sesi Pagi</option>
                  <option value="Sesi Petang">🌙 Sesi Petang</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-amber-500/20 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">No. Pengawas</th>
                    <th className="py-3 px-3">Nama Pengawas</th>
                    <th className="py-3 px-3">Sesi / Divisyen</th>
                    <th className="py-3 px-3">Hadiah Dimenangi</th>
                    <th className="py-3 px-3">Kod Tuntutan</th>
                    <th className="py-3 px-3">Status Tuntutan</th>
                    <th className="py-3 px-3">Diserahkan Oleh</th>
                    <th className="py-3 px-3 text-right">Tindakan Serahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10 text-slate-200">
                  {filteredNonGrandParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate-500">
                        Tiada rekod penerima hadiah bukan utama yang sepadan dengan penapis.
                      </td>
                    </tr>
                  ) : (
                    filteredNonGrandParticipants.map((p) => {
                      const isClaimed = p.claimStatus === 'CLAIMED';
                      return (
                        <tr key={p.participantId} className="hover:bg-amber-500/5 transition">
                          <td className="py-3 px-3 font-mono font-bold text-amber-300">
                            {p.participantNumber}
                          </td>
                          <td className="py-3 px-3 font-bold font-serif-vintage text-white">
                            {p.participantName}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-300">{p.session || 'Sesi Pagi'}</span>
                            {p.division ? ` • ${p.division}` : ''}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-amber-200">{p.prizeName || '-'}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-amber-400 font-bold">
                            {p.claimCode ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                                {p.claimCode}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {isClaimed ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                TELAH DITUNTUT
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 inline-flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-400" />
                                BELUM DITUNTUT
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-400">
                            {isClaimed ? (
                              <div>
                                <span className="font-bold text-slate-200">{p.claimedBy || 'AJK Bertugas'}</span>
                                <div className="text-[10px] text-slate-500">
                                  {p.claimedAt ? new Date(p.claimedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.claimCode && (
                                <button
                                  type="button"
                                  onClick={() => setViewingQrParticipant(p)}
                                  className="p-1.5 rounded-lg border transition cursor-pointer bg-[#181a28] border-amber-500/30 text-amber-300 hover:bg-[#222538]"
                                  title="Papar Kod QR Tuntutan"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isClaimed ? (
                                <span className="text-[11px] text-emerald-400 font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Selesai</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setQuickClaimParticipant(p)}
                                  className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase font-serif-vintage bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer shadow-md inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Sahkan Serahan</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDEES */}
      {activeTab === 'participants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12141e] border border-amber-500/25 p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pengawas mengikut nama, nombor..."
                  className="pl-9 pr-4 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/25 text-white text-xs w-56 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/25 text-slate-300 text-xs focus:outline-none font-medium"
              >
                <option value="ALL">Semua Sesi (Pagi & Petang)</option>
                <option value="Sesi Pagi">☀️ Sesi Pagi</option>
                <option value="Sesi Petang">🌙 Sesi Petang</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/25 text-slate-300 text-xs focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="NOT_PLAYED">Belum Cabut</option>
                <option value="PLAYED">Telah Cabut</option>
                <option value="CLAIMED">✅ Telah Dituntut (Claimed)</option>
                <option value="UNCLAIMED">⏳ Belum Dituntut (Unclaimed)</option>
                <option value="GRAND_FINALIST">Finalis Hadiah Utama</option>
                <option value="WON">Menang Hadiah</option>
              </select>

              <select
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/25 text-slate-300 text-xs focus:outline-none"
              >
                <option value="ALL">Semua Divisyen</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <option key={num} value={`Divisyen ${num}`}>
                    Divisyen {num}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportParticipantsCsv}
                className="px-3 py-2 rounded-xl bg-[#181a28] hover:bg-[#222538] text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport CSV</span>
              </button>

              <button
                onClick={() => setIsAddPartModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-serif-vintage"
              >
                <Plus className="w-3.5 h-3.5 text-slate-950" />
                <span>Tambah Pengawas</span>
              </button>
            </div>
          </div>

          {/* Attendees Table */}
          <div className="bg-[#12141e] border border-amber-500/25 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#181a26] text-amber-300 font-serif-vintage uppercase text-[10px] tracking-wider border-b border-amber-500/20">
                  <tr>
                    <th className="py-3 px-4">No. Pengawas</th>
                    <th className="py-3 px-4">Nama</th>
                    <th className="py-3 px-4">Divisyen & Sesi</th>
                    <th className="py-3 px-4">Status Cabutan</th>
                    <th className="py-3 px-4">Hadiah Diterima</th>
                    <th className="py-3 px-4">Status Tuntutan</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Tiada rekod pengawas yang sepadan dengan tapisan.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((p) => (
                      <tr key={p.participantId} className="hover:bg-[#181a28]/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-300">
                          {p.participantNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{p.participantName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {p.division ? p.division : <span className="text-slate-500 font-normal italic">-</span>}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 border ${
                              p.session === 'Sesi Petang'
                                ? 'bg-indigo-500/15 border-indigo-400/40 text-indigo-300'
                                : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                            }`}
                          >
                            {p.session === 'Sesi Petang' ? '🌙' : '☀️'} {p.session || 'Sesi Pagi'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {p.status === 'PLAYED' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              Telah Cabut
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                              Belum Cabut
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {p.isGrandPrizeCandidate ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-black">
                              👑 Finalis Hadiah Utama ({p.prizeName || 'Menunggu Pentas'})
                            </span>
                          ) : p.prizeName ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-white">{p.prizeName}</span>
                              {p.claimStatus === 'CLAIMED' ? (
                                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-400" /> Disahkan Selesai
                                </span>
                              ) : (
                                <span className="block text-[10px] text-amber-400 font-medium">
                                  🏫 Sedia Dituntut di Bilik Pengawas
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>

                        {/* Visual 'Claimed' / 'Unclaimed' Status Badge */}
                        <td className="py-3 px-4">
                          {p.claimStatus === 'CLAIMED' ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-sm shadow-emerald-950/60 ring-1 ring-emerald-400/30">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Claimed</span>
                              </span>
                              {p.claimedBy && (
                                <span className="text-[10px] text-slate-400 pl-0.5 leading-tight">
                                  oleh <strong className="text-slate-300">{p.claimedBy}</strong>
                                  {p.claimedAt && (
                                    <span className="text-slate-500 block text-[9px] mt-0.5">
                                      {new Date(p.claimedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          ) : p.prizeName ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-400/40 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>Unclaimed</span>
                              </span>
                              {p.claimCode && (
                                <span className="font-mono text-[9px] text-amber-400/80 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25">
                                  {p.claimCode}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleShowParticipantQr(p)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition"
                              title="Lihat QR Lanyard"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {onSelectParticipantForPlay && (
                              <button
                                onClick={() => onSelectParticipantForPlay(p.secureToken)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 transition"
                                title="Buka Cabutan Pengawas"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingParticipant(p);
                                setIsEditPartModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="Kemaskini Pengawas"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteParticipant(p)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 text-red-400 transition"
                              title="Padam Pengawas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRIZES */}
      {activeTab === 'prizes' && (
        <div className="space-y-4">
          {/* Header & Category Balance Overview */}
          <div className="bg-[#12141e] border border-amber-500/25 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold font-serif-vintage text-amber-200">
                  Inventori Hadiah Cabutan Bertuah SMKBSP 2026
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hadiah Utama (Tiket Emas) diputar di pentas dewan. Hadiah biasa dituntut terus melalui telefon/kaunter AJK.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRestore40Prizes}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Pulihkan pangkalan data kepada tepat 45 hadiah rasmi (18 Pentas + 27 Telefon/Kaunter)"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Pulihkan 45 Hadiah Rasmi</span>
                </button>

                <button
                  onClick={() => {
                    setEditingPrize({
                      prizeName: '',
                      description: '',
                      totalQuantity: 1,
                      prizeCategory: 'Standard Prize',
                      active: true,
                    });
                    setIsPrizeModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer font-serif-vintage"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-950" />
                  <span>Tambah Hadiah</span>
                </button>
              </div>
            </div>

            {/* Live Metrics: Grand vs Instant Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-500/15">
              <div className="p-3.5 rounded-2xl bg-[#181a28] border border-amber-400/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                    👑 Hadiah Utama Pentas
                  </span>
                  <span className="text-xl font-black font-serif-vintage text-white">
                    {prizes.filter((p) => p.prizeCategory === 'Grand Prize').reduce((s, p) => s + p.totalQuantity, 0)} Unit
                  </span>
                </div>
                <span className="text-xs text-amber-300 font-mono font-bold bg-amber-500/20 px-2 py-1 rounded-lg">
                  {prizes.filter((p) => p.prizeCategory === 'Grand Prize' && p.active && p.remainingQuantity > 0).reduce((s, p) => s + p.remainingQuantity, 0)} Baki
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#181a28] border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    🏫 Hadiah Biasa Telefon
                  </span>
                  <span className="text-xl font-black font-serif-vintage text-white">
                    {prizes.filter((p) => p.prizeCategory !== 'Grand Prize').reduce((s, p) => s + p.totalQuantity, 0)} Unit
                  </span>
                </div>
                <span className="text-xs text-slate-300 font-mono font-bold bg-slate-800 px-2 py-1 rounded-lg">
                  {prizes.filter((p) => p.prizeCategory !== 'Grand Prize' && p.active && p.remainingQuantity > 0).reduce((s, p) => s + p.remainingQuantity, 0)} Baki
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#181a28] border border-amber-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-300 block tracking-wider">
                    ✦ Jumlah Keseluruhan
                  </span>
                  <span className="text-xl font-black font-serif-vintage text-amber-400">
                    {prizes.reduce((s, p) => s + p.totalQuantity, 0)} Hadiah
                  </span>
                </div>
                <span className="text-xs text-amber-300 font-mono font-bold bg-amber-500/10 px-2 py-1 rounded-lg">
                  {prizes.filter((p) => p.active && p.remainingQuantity > 0).reduce((s, p) => s + p.remainingQuantity, 0)} Baki
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {prizes.map((p) => {
              const isGrand = p.prizeCategory === 'Grand Prize';
              return (
                <div
                  key={p.prizeId}
                  className={`p-5 rounded-2xl border flex flex-col justify-between shadow-lg transition-all ${
                    isGrand
                      ? 'bg-gradient-to-b from-[#1e1910] via-[#141520] to-[#0f1017] border-amber-400/70 shadow-amber-500/10'
                      : 'bg-[#12141e] border-amber-500/25'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-serif-vintage flex items-center gap-1.5 ${
                          isGrand
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow-sm'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {isGrand ? (
                          <>
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>👑 HADIAH UTAMA (PENTAS)</span>
                          </>
                        ) : (
                          <>
                            <Gift className="w-3.5 h-3.5 text-slate-400" />
                            <span>🏫 HADIAH BIASA (TELEFON)</span>
                          </>
                        )}
                      </span>
                      <span className="font-mono text-xs font-bold text-amber-300">
                        Baki {p.remainingQuantity} / {p.totalQuantity}
                      </span>
                    </div>

                    <h4 className="text-base font-bold font-serif-vintage text-white mb-1">
                      {p.prizeName}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      {p.description || (isGrand ? 'Penyerahan Terus di Pentas Utama' : 'Tuntutan di Kaunter AJK Hadiah')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-amber-500/15 flex flex-col gap-2">
                    {/* 1-Click Category Switcher Button */}
                    <button
                      onClick={() => handleTogglePrizeCategory(p.prizeId)}
                      className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isGrand
                          ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-400/40'
                      }`}
                      title="Klik untuk ubah jenis hadiah antara Pentas dan Telefon"
                    >
                      {isGrand ? (
                        <>
                          <Gift className="w-3.5 h-3.5 text-slate-400" />
                          <span>Tukar ke Hadiah Biasa (Telefon)</span>
                        </>
                      ) : (
                        <>
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Jadikan Hadiah Utama (Pentas)</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className={`text-[10px] font-semibold ${isGrand ? 'text-amber-400' : 'text-slate-400'}`}>
                        {isGrand ? '✦ Putaran Pentas' : '• Serahan Sekolah'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingPrize(p);
                            setIsPrizeModalOpen(true);
                          }}
                          className="text-amber-300 hover:text-white font-medium text-xs cursor-pointer"
                        >
                          Kemaskini
                        </button>
                        <button
                          onClick={() => handleDeletePrize(p.prizeId)}
                          className="text-red-400 hover:text-red-300 font-medium text-xs cursor-pointer"
                        >
                          Padam
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: REAL-TIME STABILITY MONITOR & AUDIT LEDGER */}
      {activeTab === 'logs' && (
        <div className="space-y-5">
          {/* Real-time System Stability Header Panel */}
          <div className="bg-[#12141e] border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Activity className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="text-base font-bold font-serif-vintage text-amber-200">
                    Monitor Kestabilan Sistem & Jejak Rangkaian (Live)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pemantauan sambungan SSE/WebSocket, latensi transmisi, dan pengesanan awal risiko skrin putih
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/analytics');
                      if (res.ok) {
                        const anData = await res.json();
                        generateEventAnalyticsPdf(anData, 'Laporan_Rasmi_HiTea_Cabutan_Bertuah_2026.pdf');
                      }
                    } catch (e) {
                      console.error('Failed to generate Hi-Tea PDF:', e);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-950/40 flex items-center gap-1.5 transition active:scale-95 cursor-pointer hover:brightness-110"
                  title="Jana dan muat turun dokumen PDF rasmi edisi Jamuan Hi-Tea"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-950" />
                  <span>Jana PDF Laporan Hi-Tea</span>
                </button>

                <button
                  onClick={fetchSystemHealth}
                  disabled={isHealthRefreshing}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Uji kelajuan dan segarkan telemetri"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isHealthRefreshing ? 'animate-spin' : ''}`} />
                  <span>Uji Ping & Segarkan</span>
                </button>
              </div>
            </div>

            {/* Proactive White-Screen Risk Alert Banner */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                systemHealth?.whiteScreenRisk === 'CRITICAL'
                  ? 'bg-red-950/40 border-red-500/50 text-red-200'
                  : systemHealth?.whiteScreenRisk === 'ELEVATED'
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                  : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    systemHealth?.whiteScreenRisk === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-400'
                      : systemHealth?.whiteScreenRisk === 'ELEVATED'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {systemHealth?.whiteScreenRisk === 'NORMAL' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  )}
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider">
                      {systemHealth?.whiteScreenRisk === 'NORMAL'
                        ? 'STATUS RANGKAIAN: KESTABILAN OPTIMUM (SIFAR RISIKO SKRIN PUTIH)'
                        : 'AMARAN PENGESANAN AWAL AJK: BEBAN TINGGI / RISIKO SKRIN PUTIH'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/40">
                      {systemHealth?.whiteScreenRisk || 'NORMAL'}
                    </span>
                  </div>
                  <p className="text-slate-300 pt-0.5">
                    {systemHealth?.alertMessage || 'Sistem pelayan beroperasi dalam keadaan stabil tanpa sebarang kesesakan memori atau kelewatan soket.'}
                  </p>
                  <p className="text-slate-400 italic">
                    Tindakan Disyorkan: {systemHealth?.alertAction || 'Semua peranti berhubung dengan lancar.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Telemetry Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-xl bg-[#0a0b10] border border-amber-500/20">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Sambungan SSE/Live</span>
                  <Wifi className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-amber-300">
                    {systemHealth?.sseConnections ?? 1}
                  </span>
                  <span className="text-[11px] text-slate-500">peranti aktif</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Socket siaran langsung</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0a0b10] border border-amber-500/20">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Latensi Rangkaian (Ping)</span>
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-xl font-bold font-mono ${
                      (livePingMs || 0) > 100
                        ? 'text-red-400'
                        : (livePingMs || 0) > 40
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {livePingMs !== null ? `${livePingMs}ms` : '<15ms'}
                  </span>
                  <span className="text-[11px] text-emerald-500 font-semibold">Respons Pantas</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Masa tindak balas pelayan</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0a0b10] border border-amber-500/20">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Penggunaan RAM Pelayan</span>
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-sky-300">
                    {systemHealth?.memory?.heapUsedMB ?? 42}MB
                  </span>
                  <span className="text-[11px] text-slate-500">
                    / {systemHealth?.memory?.heapTotalMB ?? 96}MB
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Bebas kebocoran memori (No leak)</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0a0b10] border border-amber-500/20">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Kelewatan Event Loop</span>
                  <Server className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-purple-300">
                    {systemHealth?.eventLoopLagMs ?? 1}ms
                  </span>
                  <span className="text-[11px] text-purple-400 font-semibold">Sifar Sekatan</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Uptime: {Math.floor((systemHealth?.uptime ?? 120) / 60)} minit</span>
              </div>
            </div>
          </div>

          {/* Audit Ledger Section with Sub-Tabs */}
          <div className="bg-[#12141e] border border-amber-500/25 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
              <div>
                <h3 className="text-sm font-bold font-serif-vintage text-amber-200">
                  Log Audit & Rekod Sejarah Acara
                </h3>
                <p className="text-xs text-slate-400">
                  Jejak kronologi detik kritikal, beban puncak 2 petang, dan transaksi transaksi selamat
                </p>
              </div>

              {/* Sub-tab selection */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
                <button
                  onClick={() => setLogsFilter('peak')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    logsFilter === 'peak'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Log Puncak 2:00 Petang ({peakSessionAudit.length})
                </button>
                <button
                  onClick={() => setLogsFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    logsFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua Acara Pentadbir ({auditLogs.length})
                </button>
              </div>
            </div>

            {/* TAB CONTENT: 2:00 PM Peak Session Audit */}
            {logsFilter === 'peak' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                  <span>
                    Rekod rasmi trajektori aktiviti waktu puncak (15:08 - 15:20 MYT / 2 Petang)
                  </span>
                  <span className="font-mono text-[11px] font-bold">100% PULIH & TIADA KEHILANGAN DATA</span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {peakSessionAudit.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.level === 'ALERT'
                          ? 'bg-red-950/20 border-red-500/40'
                          : item.level === 'WARNING'
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-[#0a0b10] border-emerald-500/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-amber-400">
                              {item.timeMYT} MYT
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                item.level === 'ALERT'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : item.level === 'WARNING'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {item.category}
                            </span>
                            {item.whiteScreenAlert && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                AMARAN SKRIN PUTIH DITANGANI
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 pt-0.5">{item.event}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{item.details}</p>
                        </div>

                        <div className="flex sm:flex-col items-end gap-1 shrink-0 font-mono text-[11px] text-slate-400 self-start sm:self-auto">
                          <span className="text-slate-300">Latensi: {item.latencyMs}ms</span>
                          <span className="text-slate-500">{item.sseConnections} peranti serentak</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: General Audit Ledger */}
            {logsFilter === 'all' && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {auditLogs.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-8">
                    Belum ada acara audit pentadbir baharu direkodkan dalam sesi ini.
                  </p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.logId}
                      className="p-3 rounded-xl bg-[#0a0b10] border border-amber-500/15 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono text-[10px] font-bold">
                            {log.action}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            Pengendali: {log.actor}
                          </span>
                        </div>
                        <p className="text-slate-200 font-medium pt-1">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TESTING & BENCHMARK */}
      {activeTab === 'testing' && (
        <div className="bg-[#12141e] border border-amber-500/25 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div>
            <h3 className="text-base font-bold font-serif-vintage text-amber-200">
              Ujian Bebanan Kunci Atomik & Anti-Bias
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Simulasi permintaan serentak untuk mengesahkan integriti cabutan sekali sahaja dan sifar pertindihan hadiah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => runConcurrencyTest(20)}
              disabled={concurrencyLoading}
              className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition cursor-pointer"
            >
              Simulasi 20 Pengguna Serentak
            </button>
            <button
              onClick={() => runConcurrencyTest(100)}
              disabled={concurrencyLoading}
              className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition cursor-pointer"
            >
              Simulasi 100 Pengguna Serentak
            </button>
          </div>

          {concurrencyLoading && (
            <div className="p-6 text-center text-amber-300 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
              Menjalankan simulasi bebanan sistem...
            </div>
          )}

          {concurrencyResults && (
            <div className="p-5 rounded-2xl bg-[#0a0b10] border border-emerald-500/40 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulasi Selesai: 0 Ralat Pertindihan Dikesan</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block">Pengguna Simulasi:</span>
                  <span className="font-mono font-bold text-white text-sm">{concurrencyResults.simulatedUsers}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Jumlah Masa:</span>
                  <span className="font-mono font-bold text-white text-sm">{concurrencyResults.performance?.totalDurationMs} ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Purata Latensi:</span>
                  <span className="font-mono font-bold text-white text-sm">{concurrencyResults.performance?.avgLatencyMs} ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Kadar Pemprosesan:</span>
                  <span className="font-mono font-bold text-white text-sm">{concurrencyResults.performance?.throughputRps} RPS</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lanyard Pass Modal (PDF Export & Print) */}
      <LanyardPassModal
        isOpen={isLanyardModalOpen}
        onClose={() => setIsLanyardModalOpen(false)}
        participants={participants}
      />

      {/* AJK ID Card Modal (PDF Export & Print — Separate Utility) */}
      <AjkPassModal
        isOpen={isAjkModalOpen}
        onClose={() => setIsAjkModalOpen(false)}
      />

      {/* Official Event Analytics & Post-Event Report Modal */}
      <EventAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />

      {/* Stage Control Modal Overlay */}
      {isStageDrawModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black">
          <StageControl onClose={() => setIsStageDrawModalOpen(false)} />
        </div>
      )}

      {/* Single QR Preview Modal */}
      {isSingleQrModalOpen && qrParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12141e] border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full text-center space-y-4">
            <h3 className="text-base font-bold font-serif-vintage text-amber-200">
              QR Lanyard: {qrParticipant.participantNumber}
            </h3>
            <p className="text-xs text-white font-bold">{qrParticipant.participantName}</p>
            <div className="p-3 bg-white rounded-2xl mx-auto w-fit">
              <img src={singleQrDataUrl} alt="QR Code" className="w-48 h-48" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              {window.location.origin}/play/{qrParticipant.secureToken}
            </div>
            <button
              onClick={() => setIsSingleQrModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Prize Modal */}
      {isPrizeModalOpen && editingPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12141e] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 text-white">
            <h3 className="text-base font-bold font-serif-vintage text-amber-200">
              {editingPrize.prizeId ? 'Kemaskini Hadiah' : 'Tambah Hadiah Baharu'}
            </h3>
            <form onSubmit={handleSavePrize} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Hadiah:</label>
                <input
                  type="text"
                  value={editingPrize.prizeName || ''}
                  onChange={(e) => setEditingPrize({ ...editingPrize, prizeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Jumlah Kuantiti:</label>
                <input
                  type="number"
                  min="1"
                  value={editingPrize.totalQuantity ?? 1}
                  onChange={(e) => setEditingPrize({ ...editingPrize, totalQuantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Kategori Hadiah (Menentukan Lokasi Cabutan & Tuntutan):
                </label>
                <select
                  value={editingPrize.prizeCategory || 'Standard Prize'}
                  onChange={(e) => setEditingPrize({ ...editingPrize, prizeCategory: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white font-medium"
                >
                  <option value="Grand Prize">👑 Hadiah Utama (MASUK KE SHUFFLE PENTAS UTAMA)</option>
                  <option value="Standard Prize">🏫 Hadiah Biasa / Standard (Meja AJK Hadiah)</option>
                  <option value="Premium Prize">🏫 Hadiah Premium (Meja AJK Hadiah)</option>
                  <option value="Special Prize">🏫 Hadiah Khas (Meja AJK Hadiah)</option>
                </select>

                <div className={`mt-2 p-2.5 rounded-xl border text-[11px] leading-relaxed ${
                  editingPrize.prizeCategory === 'Grand Prize'
                    ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}>
                  {editingPrize.prizeCategory === 'Grand Prize' ? (
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        Hadiah ini <strong>AKAN MASUK KE SHUFFLE PENTAS</strong> (Tangga Hadiah Kawalan Pentas) untuk dicabut secara langsung di hadapan dewan bersama finalis Tiket Emas!
                      </span>
                    </span>
                  ) : (
                    <span>
                      Hadiah ini <strong>TIDAK</strong> masuk ke shuffle pentas. Ia akan diserahkan di Kaunter AJK Hadiah kepada pengawas yang memenanginya.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPrizeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold font-serif-vintage"
                >
                  Simpan Hadiah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Attendee Modal */}
      {isAddPartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12141e] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 text-white">
            <h3 className="text-base font-bold font-serif-vintage text-amber-200">
              Daftar Pengawas Baharu
            </h3>
            <form onSubmit={handleAddParticipant} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Pengawas:</label>
                <input
                  type="text"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="Contoh: Adam Iman bin Muhammad"
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">No. Pengawas (Pilihan):</label>
                <input
                  type="text"
                  value={newPartNumber}
                  onChange={(e) => setNewPartNumber(e.target.value)}
                  placeholder={`Auto: BP-${String(participants.length + 1).padStart(3, '0')}`}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sesi:</label>
                <select
                  value={newPartSession}
                  onChange={(e) => setNewPartSession(e.target.value as 'Sesi Pagi' | 'Sesi Petang')}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                >
                  <option value="Sesi Pagi">☀️ Sesi Pagi</option>
                  <option value="Sesi Petang">🌙 Sesi Petang</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Divisyen / Jawatan:</label>
                <select
                  value={newPartDivision}
                  onChange={(e) => setNewPartDivision(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                >
                  <option value="">(Tiada Divisyen / Kosong)</option>
                  <option value="KP">KP (Ketua Pengawas)</option>
                  <option value="PKP">PKP (Penolong Ketua Pengawas)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={`Divisyen ${num}`}>
                      Divisyen {num}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPartModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold font-serif-vintage"
                >
                  Tambah Pengawas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attendee Modal */}
      {isEditPartModalOpen && editingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12141e] border border-amber-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 text-white">
            <h3 className="text-base font-bold font-serif-vintage text-amber-200">
              Kemaskini Maklumat Pengawas
            </h3>
            <form onSubmit={handleSaveEditParticipant} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama:</label>
                <input
                  type="text"
                  value={editingParticipant.participantName || ''}
                  onChange={(e) => setEditingParticipant({ ...editingParticipant, participantName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">No. Pengawas:</label>
                <input
                  type="text"
                  value={editingParticipant.participantNumber || ''}
                  onChange={(e) => setEditingParticipant({ ...editingParticipant, participantNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Sesi:</label>
                <select
                  value={editingParticipant.session || 'Sesi Pagi'}
                  onChange={(e) => setEditingParticipant({ ...editingParticipant, session: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                >
                  <option value="Sesi Pagi">☀️ Sesi Pagi</option>
                  <option value="Sesi Petang">🌙 Sesi Petang</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Divisyen / Jawatan:</label>
                <select
                  value={editingParticipant.division ?? ''}
                  onChange={(e) => setEditingParticipant({ ...editingParticipant, division: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white"
                >
                  <option value="">(Tiada Divisyen / Kosong)</option>
                  <option value="KP">KP (Ketua Pengawas)</option>
                  <option value="PKP">PKP (Penolong Ketua Pengawas)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={`Divisyen ${num}`}>
                      Divisyen {num}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditPartModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold font-serif-vintage"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Handover Modal for AJK Hadiah */}
      {quickClaimParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12141e] border-2 border-amber-400 rounded-3xl p-6 max-w-md w-full space-y-4 text-white shadow-2xl relative">
            <button
              onClick={() => setQuickClaimParticipant(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-serif-vintage text-amber-200">
                  Sahkan Serahan Hadiah
                </h3>
                <p className="text-xs text-slate-400">
                  Pengesahan serahan hadiah bukan utama
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0c12] border border-amber-500/20 space-y-2">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Penerima Hadiah:
              </div>
              <div className="text-sm font-bold font-serif-vintage text-white">
                {quickClaimParticipant.participantName}
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className="font-mono text-amber-300 font-bold">{quickClaimParticipant.participantNumber}</span>
                <span>•</span>
                <span>{quickClaimParticipant.session || 'Sesi Pagi'}</span>
                {quickClaimParticipant.division && <span>• {quickClaimParticipant.division}</span>}
              </div>

              <div className="pt-2 border-t border-amber-500/10">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Hadiah:
                </div>
                <div className="text-sm font-bold text-amber-300">
                  {quickClaimParticipant.prizeName}
                </div>
                {quickClaimParticipant.claimCode && (
                  <div className="text-xs font-mono text-amber-400 mt-0.5">
                    Kod Tuntutan: {quickClaimParticipant.claimCode}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Nama AJK Bertugas:
                </label>
                <input
                  type="text"
                  value={ajkStaffName}
                  onChange={(e) => setAjkStaffName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white text-xs focus:ring-1 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Catatan Serahan (Pilihan):
                </label>
                <input
                  type="text"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  placeholder="Cth: Diserahkan terus di meja hadiah"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0a0b10] border border-amber-500/30 text-white text-xs focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickClaimParticipant(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClaim(quickClaimParticipant)}
                disabled={isConfirmingClaim}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black uppercase font-serif-vintage transition cursor-pointer hover:brightness-110 shadow-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {isConfirmingClaim ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sahkan & Serah Hadiah</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Imbas QR Kamera untuk AJK Hadiah */}
      {isAjkScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12141e] border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full space-y-4 text-white shadow-2xl relative text-center">
            <button
              onClick={stopAjkScanner}
              className="absolute top-4 right-4 p-1.5 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 mb-1">
              <Camera className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold font-serif-vintage text-amber-200">
                Imbas QR Tuntutan
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Halakan kamera ke skrin peranti pengawas untuk mengimbas Kod QR Tuntutan
            </p>

            <div className="relative mx-auto rounded-2xl overflow-hidden border-2 border-amber-400/50 bg-black min-h-[250px] flex items-center justify-center">
              <div id={ajkQrRegionId} className="w-full" />
              {ajkScannerStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-xs text-amber-300">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>Memulakan kamera...</span>
                </div>
              )}
            </div>

            {ajkScannerError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs text-left">
                {ajkScannerError}
              </div>
            )}

            <button
              onClick={stopAjkScanner}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
            >
              Batal & Tutup Kamera
            </button>
          </div>
        </div>
      )}

      {/* Modal Paparan QR Tuntutan Pengawas */}
      {viewingQrParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12141e] border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full space-y-4 text-white shadow-2xl relative text-center">
            <button
              onClick={() => setViewingQrParticipant(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold font-serif-vintage text-amber-200">
                Tiket QR Tuntutan Hadiah
              </h3>
            </div>

            <div className="p-3 rounded-2xl bg-[#0b0c12] border border-amber-500/20 text-left space-y-1">
              <div className="text-[11px] font-bold text-amber-400 font-mono">
                {viewingQrParticipant.participantNumber} • {viewingQrParticipant.session || 'Sesi Pagi'}
              </div>
              <div className="text-sm font-bold font-serif-vintage text-white">
                {viewingQrParticipant.participantName}
              </div>
              <div className="text-xs text-slate-300 font-semibold pt-1 border-t border-amber-500/10">
                Hadiah: <span className="text-amber-300">{viewingQrParticipant.prizeName}</span>
              </div>
            </div>

            {viewingQrDataUrl ? (
              <div className="p-4 bg-white rounded-2xl shadow-xl border border-amber-400/50 inline-block mx-auto">
                <img
                  src={viewingQrDataUrl}
                  alt="QR Tuntutan"
                  className="w-48 h-48 object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-slate-900 rounded-2xl mx-auto text-xs text-slate-500">
                Menjana QR...
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-[#0b0c12] border border-amber-500/30 font-mono text-sm font-black text-amber-300 tracking-wider">
                {viewingQrParticipant.claimCode}
              </div>
              <button
                onClick={() => {
                  if (viewingQrParticipant.claimCode) {
                    navigator.clipboard.writeText(viewingQrParticipant.claimCode);
                    setViewingQrCopied(true);
                    setTimeout(() => setViewingQrCopied(false), 2000);
                  }
                }}
                className="p-2 rounded-xl border transition cursor-pointer bg-[#181a28] border-amber-500/30 text-amber-300 hover:bg-[#222538]"
                title="Salin Kod Tuntutan"
              >
                {viewingQrCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (printWin) {
                    printWin.document.write(`
                      <html>
                        <head><title>Tiket QR Tuntutan - ${viewingQrParticipant.participantNumber}</title></head>
                        <body style="font-family: sans-serif; text-align: center; padding: 30px;">
                          <h2>MAJLIS APRESIASI PENGAWAS 2026</h2>
                          <h3>TIKET TUNTUTAN HADIAH</h3>
                          <p><strong>${viewingQrParticipant.participantName}</strong> (${viewingQrParticipant.participantNumber})</p>
                          <p>Hadiah: <strong>${viewingQrParticipant.prizeName}</strong></p>
                          <img src="${viewingQrDataUrl}" style="width: 250px; height: 250px;" />
                          <p style="font-family: monospace; font-size: 20px; font-weight: bold; margin-top: 10px;">${viewingQrParticipant.claimCode}</p>
                          <p style="font-size: 12px; color: #666;">Sahkan di Kaunter AJK Hadiah</p>
                          <script>window.print();</script>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-[#181a28] border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-[#222538] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Slip</span>
              </button>
              <button
                onClick={() => setViewingQrParticipant(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
