import type { SpinState, SpinAction } from './spin-types';
import { SEGMENT_COLORS } from './spin-types';


export const initialState: SpinState = {
  entries: [
    { id: 1, text: 'Fatima', weight: 1, color: '#FF6B6B' },
    { id: 2, text: 'Ali', weight: 1, color: '#4ECDC4' },
    { id: 3, text: 'Diya', weight: 1, color: '#45B7D1' },
    { id: 4, text: 'Beatriz', weight: 1, color: '#96CEB4' },
    { id: 5, text: 'Hanna', weight: 1, color: '#FFEAA7' },
    { id: 6, text: 'Gabriel', weight: 1, color: '#DDA0DD' },
    { id: 7, text: 'Charles', weight: 1, color: '#98D8C8' },
  ],
  results: [],
  spinning: false,
  currentAngle: 0,
  spinCount: 0,
  nextId: 8,
  winner: null,
  showWinner: false,
  showCustomize: false,
  showGallery: false,
  activeTab: 'entries',
  undoStack: [],
  multiQueue: [],
  multiIndex: 0,
  counting: false,
  countNum: 3,
  toast: null,
  lang: 'en',
  settings: {
    spinDuration: 6,
    showLabels: true,
    glowEffect: true,
    fontSize: 14,
    removeAfterPick: false,
    confetti: true,
    countdownEnabled: false,
    allowDuplicates: true,
    pickCount: 1,
    soundEnabled: true,
    winnerDisplay: 'popup',
    colorTheme: 0,
  },
};


export function loadPersistedState(): Partial<SpinState> {
  try {
    const raw = localStorage.getItem('spinfusion_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        entries: parsed.entries,
        results: parsed.results || [],
        spinCount: parsed.spinCount || 0,
        nextId: parsed.nextId || 8,
        settings: { ...initialState.settings, ...parsed.settings },
        lang: parsed.lang || 'en',
      };
    }
  } catch {
    // ignore
  }
  // Try URL hash