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
    themeMode: 'dark',
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
        settings: {
          ...initialState.settings,
          ...parsed.settings,
          themeMode:
            parsed.settings?.themeMode ||
            (parsed.settings?.lightMode ? 'light' : 'dark'),
        },
        lang: parsed.lang || 'en',
      };
    }
  } catch {
    // ignore
  }
  // Try URL hash
  try {
    if (window.location.hash && window.location.hash.length > 1) {
      const decoded = JSON.parse(atob(window.location.hash.slice(1)));
      if (decoded.entries && Array.isArray(decoded.entries)) {
        const entries = decoded.entries.map((t: string, i: number) => ({
          id: Date.now() + i,
          text: t,
          weight: 1,
          color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
        }));
        return { entries, nextId: Date.now() + entries.length };
      }
    }
  } catch {
    // ignore
  }
  return {};
}

export function saveState(state: SpinState) {
  try {
    localStorage.setItem('spinfusion_v1', JSON.stringify({
      entries: state.entries,
      results: state.results,
      spinCount: state.spinCount,
      nextId: state.nextId,
      settings: state.settings,
      lang: state.lang,
    }));
  } catch {
    // ignore
  }
}

export function spinReducer(state: SpinState, action: SpinAction): SpinState {
  switch (action.type) {
    case 'ADD_ENTRY': {
      const text = action.payload.trim();
      if (!text) return state;
      const newEntry: typeof state.entries[0] = {
        id: state.nextId,
        text,
        weight: 1,
        color: SEGMENT_COLORS[state.entries.length % SEGMENT_COLORS.length],
      };
      const nextState = {
        ...state,
        entries: [...state.entries, newEntry],
        nextId: state.nextId + 1,
      };
      saveState(nextState);
      return nextState;
    }
    case 'ADD_BULK_ENTRIES': {
      const texts = action.payload.map((t) => t.trim()).filter(Boolean);
      if (texts.length === 0) return state;
      const newEntries = texts.map((text, i) => ({
        id: state.nextId + i,
        text,
        weight: 1,
        color: SEGMENT_COLORS[(state.entries.length + i) % SEGMENT_COLORS.length],
      }));
      const nextState = {
        ...state,
        entries: [...state.entries, ...newEntries],
        nextId: state.nextId + newEntries.length,
      };
      saveState(nextState);
      return nextState;
    }
    case 'DELETE_ENTRY': {
      const entry = state.entries.find(e => e.id === action.payload);
      const nextState = {
        ...state,
        entries: state.entries.filter(e => e.id !== action.payload),
        undoStack: entry
          ? [...state.undoStack, state.entries].slice(-5)
          : state.undoStack,
      };
      saveState(nextState);
      return nextState;
    }
    case 'UPDATE_ENTRY': {
      const nextState = {
        ...state,
        entries: state.entries.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload } : e
        ),
      };
      saveState(nextState);
      return nextState;
    }
    case 'SHUFFLE': {
      const shuffled = [...state.entries];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const nextState = { ...state, entries: shuffled };
      saveState(nextState);
      return nextState;
    }
    case 'SORT': {
      const sorted = [...state.entries].sort((a, b) => a.text.localeCompare(b.text));
      const nextState = { ...state, entries: sorted };
      saveState(nextState);
      return nextState;
    }
    case 'CLEAR_ALL': {
      const nextState = { ...state, entries: [], undoStack: [...state.undoStack, state.entries].slice(-5) };
      saveState(nextState);
      return nextState;
    }
    case 'SET_SPINNING':
      return { ...state, spinning: action.payload };
    case 'SET_WINNER':
      return { ...state, winner: action.payload };
    case 'CLOSE_WINNER':
      return { ...state, showWinner: false };
    case 'LOG_RESULT': {
      const nextState = { ...state, results: [action.payload, ...state.results], spinCount: state.spinCount + 1 };
      saveState(nextState);
      return nextState;
    }
    case 'CLEAR_RESULTS': {
      const nextState = { ...state, results: [], spinCount: 0 };
      saveState(nextState);
      return nextState;
    }
    case 'UPDATE_SETTINGS': {
      const nextState = { ...state, settings: { ...state.settings, ...action.payload } };
      saveState(nextState);
      return nextState;
    }
    case 'SET_LANG': {
      const nextState = { ...state, lang: action.payload };
      if (action.payload === 'ar') {
        document.dir = 'rtl';
      } else {
        document.dir = 'ltr';
      }
      saveState(nextState);
      return nextState;
    }
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_TOAST':
      return { ...state, toast: action.payload };
    case 'UNDO_DELETE': {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      const nextState = {
        ...state,
        entries: prev,
        undoStack: state.undoStack.slice(0, -1),
      };
      saveState(nextState);
      return nextState;
    }
    case 'START_MULTI':
      return { ...state, multiQueue: action.payload, multiIndex: 0 };
    case 'NEXT_MULTI':
      return { ...state, multiIndex: state.multiIndex + 1 };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    case 'SET_COUNTING':
      return { ...state, counting: action.payload };
    case 'SET_COUNT_NUM':
      return { ...state, countNum: action.payload };
    case 'REMOVE_WINNER': {
      if (!state.winner) return state;
      const nextState = {
        ...state,
        entries: state.entries.filter(e => e.id !== state.winner!.id),
        showWinner: false,
      };
      saveState(nextState);
      return nextState;
    }
    case 'SET_ENTRIES': {
      const nextState = { ...state, entries: action.payload };
      saveState(nextState);
      return nextState;
    }
    default:
      return state;
  }
}
