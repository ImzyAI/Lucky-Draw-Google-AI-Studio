export type EventStatus = 'OPEN' | 'PAUSED' | 'CLOSED';
export type ParticipantStatus = 'NOT_PLAYED' | 'PLAYED';
export type ClaimStatus = 'NOT_APPLICABLE' | 'UNCLAIMED' | 'CLAIMED';

export interface EventConfig {
  id: string;
  name: string;
  date: string;
  location: string;
  status: EventStatus;
  totalParticipants: number;
  updatedAt: string;
}

export const DIVISIONS = [
  'KP',
  'PKP',
  'Divisyen 1',
  'Divisyen 2',
  'Divisyen 3',
  'Divisyen 4',
  'Divisyen 5',
  'Divisyen 6',
  'Divisyen 7',
  'Divisyen 8',
  'Divisyen 9',
  'Divisyen 10',
] as const;
export type Division = typeof DIVISIONS[number];

export interface Participant {
  participantId: string;
  participantNumber: string; // e.g. "BP-001" or "001"
  participantName: string;
  className?: string; // e.g. "3 AMETIS", "4 MUMTAZ"
  division?: string; // "Divisyen 1" to "Divisyen 8"
  session?: 'Sesi Pagi' | 'Sesi Petang' | string; // Pengawas Sesi Pagi atau Sesi Petang
  role?: string; // kept for backwards compatibility
  secureToken: string;
  status: ParticipantStatus;
  prizeId?: string | null;
  prizeName?: string | null;
  claimCode?: string | null;
  claimStatus: ClaimStatus;
  playedAt?: string | null;
  claimedAt?: string | null;
  claimedBy?: string | null;
  // Dua peringkat cabutan Grand Prize (Kawalan Pentas)
  isGrandPrizeCandidate?: boolean;
  grandPrizeStatus?: 'PENDING_STAGE_DRAW' | 'REVEALED';
  stageDrawAt?: string | null;
}

export interface Prize {
  prizeId: string;
  prizeName: string;
  description: string;
  imageUrl?: string;
  totalQuantity: number;
  remainingQuantity: number;
  prizeCategory: 'Grand Prize' | 'Premium Prize' | 'Standard Prize' | 'Special Prize';
  active: boolean;
  order: number;
}

export interface ClaimRecord {
  claimId: string;
  claimCode: string;
  participantId: string;
  participantNumber: string;
  participantName: string;
  prizeId: string;
  prizeName: string;
  claimedAt: string;
  ajkEmail?: string;
  ajkName: string;
}

export interface AuditLog {
  logId: string;
  action: 'DRAW' | 'CLAIM' | 'STATUS_CHANGE' | 'PRIZE_UPDATE' | 'PARTICIPANT_ADD' | 'SYSTEM_SEED' | 'STAGE_DRAW';
  details: string;
  actor: string;
  timestamp: string;
}

export interface LiveStats {
  totalParticipants: number;
  totalPlayed: number;
  totalNotPlayed: number;
  totalPrizes: number;
  totalPrizesRemaining: number;
  totalPrizesWon: number;
  totalUnclaimed: number;
  totalClaimed: number;
}

export interface WinnerAnnouncement {
  id: string;
  type: 'BIG_WIN' | 'CLAIM_CONFIRMED';
  winnerName: string;
  participantNumber: string;
  participantId?: string;
  prizeName: string;
  prizeCategory?: 'Grand Prize' | 'Premium Prize' | 'Standard Prize' | 'Special Prize';
  claimCode?: string;
  claimedBy?: string;
  timestamp: string;
}

export interface AjkMember {
  id: string;
  role: string;
  name: string;
  className: string;
  date: string;
  venue: string;
}


