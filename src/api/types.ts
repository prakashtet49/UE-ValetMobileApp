export type ShiftResponse = {
  id: string;
  driverId: string;
  status: 'active' | 'paused' | 'ended';
  startedAt: string;
  endedAt?: string | null;
  pausedAt?: string | null;
  totalPausedMinutes: number;
  pauseCount: number;
  lastActivityAt?: string | null;
  currentDurationMinutes: number;
};
