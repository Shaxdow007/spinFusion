export interface SpinEntry {
  id: number;
  text: string;
  weight: number;
  color: string;
}


export interface SpinResult {
  id: number;
  text: string;
  color: string;
  spin: number;
  time: string;
}


export interface SpinSettings {
  spinDuration: number;
  showLabels: boolean;
  glowEffect: boolean;
  fontSize: number;
  removeAfterPick: boolean;
  confetti: boolean;
  countdownEnabled: boolean;
  allowDuplicates: boolean;
  pickCount: number;
  soundEnabled: boolean;
  winnerDisplay: 'popup' | 'toast' | 'none';
  colorTheme: number;
}


export interface SpinState {
  entries: SpinEntry[];
  results: SpinResult[];
  spinning: boolean;
  currentAngle: number;
  spinCount: number;
  nextId: number;
  winner: SpinEntry | null;
  showWinner: boolean;
  showCustomize: boolean;
  showGallery: boolean;
  activeTab: 'entries' | 'results' | 'stats';
  undoStack: SpinEntry[][];
  multiQueue: SpinEntry[];
  multiIndex: number;
  counting: boolean;
  countNum: number;
  toast: string | null;
  lang: string;
  settings: SpinSettings;
}


export type SpinAction =
  | { type: 'ADD_ENTRY'; payload: string }
  | { type: 'ADD_BULK_ENTRIES'; payload: string[] }
  | { type: 'DELETE_ENTRY'; payload: number }
  | { type: 'UPDATE_ENTRY'; payload: { id: number; text?: string; weight?: number } }
  | { type: 'SHUFFLE' }
  | { type: 'SORT' }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_SPINNING'; payload: boolean }
  | { type: 'SET_WINNER'; payload: SpinEntry | null }
  | { type: 'CLOSE_WINNER' }
  | { type: 'LOG_RESULT'; payload: SpinResult }