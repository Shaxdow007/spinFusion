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
  lightMode: boolean;
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
  | { type: 'CLEAR_RESULTS' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<SpinSettings> }
  | { type: 'SET_LANG'; payload: string }
  | { type: 'SET_TAB'; payload: 'entries' | 'results' | 'stats' }
  | { type: 'SET_TOAST'; payload: string | null }
  | { type: 'UNDO_DELETE' }
  | { type: 'START_MULTI'; payload: SpinEntry[] }
  | { type: 'NEXT_MULTI' }
  | { type: 'LOAD_STATE'; payload: Partial<SpinState> }
  | { type: 'SET_COUNTING'; payload: boolean }
  | { type: 'SET_COUNT_NUM'; payload: number }
  | { type: 'REMOVE_WINNER' }
  | { type: 'SET_ENTRIES'; payload: SpinEntry[] };

export const SEGMENT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#82E0AA', '#F1948A', '#85929E', '#F8C471', '#7FB3D3', '#A9CCE3',
];

export const COLOR_THEMES = [
  { name: 'Neon Fusion', colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'] },
  { name: 'Ocean Breeze', colors: ['#006994', '#0096C7', '#48CAE4', '#90E0EF', '#CAF0F8', '#0077B6', '#023E8A', '#03045E'] },
  { name: 'Sunset Fire', colors: ['#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FF6347', '#FF1493', '#DC143C', '#B22222'] },
  { name: 'Forest Glow', colors: ['#228B22', '#32CD32', '#90EE90', '#00FF7F', '#3CB371', '#2E8B57', '#006400', '#556B2F'] },
  { name: 'Galaxy', colors: ['#4B0082', '#8A2BE2', '#9400D3', '#9932CC', '#BA55D3', '#DA70D6', '#EE82EE', '#DDA0DD'] },
  { name: 'Cotton Candy', colors: ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FF1493', '#DB7093', '#FFA07A', '#FA8072', '#E9967A'] },
  { name: 'Monochrome', colors: ['#FFFFFF', '#D3D3D3', '#A9A9A9', '#808080', '#696969', '#505050', '#303030', '#101010'] },
  { name: 'Tropical', colors: ['#FF7F50', '#FF6347', '#FFD700', '#32CD32', '#00CED1', '#FF69B4', '#FFA500', '#20B2AA'] },
];

export const LANGS: Record<string, Record<string, string>> = {
  en: {
    spin: 'SPIN!', entries: 'Entries', results: 'Results',
    winner: '🎉 Winner!', addPlaceholder: 'Type a name...',
    shuffle: 'Shuffle', sort: 'Sort', import: 'Import',
    export: 'Export', copy: 'Copy', clear: 'Clear',
    removeAndSpin: 'Remove & Spin Again',
    keepAndSpin: 'Keep & Spin Again', close: 'Close',
    stats: 'Stats', noResults: 'No results yet',
    noEntries: 'Add entries to start spinning',
    customize: 'Customize', gallery: 'Gallery',
    new: 'New', open: 'Open', save: 'Save', share: 'Share',
    appearance: 'Appearance', spinSettings: 'Spin Settings',
    winnerDisplay: 'Winner Display', behavior: 'Behavior',
    shareExport: 'Share & Export', duration: 'Duration',
    rotations: 'Rotations', showLabels: 'Show Labels',
    glowEffect: 'Glow Effect', labelFontSize: 'Label Font Size',
    popupStyle: 'Popup Style', confetti: 'Confetti',
    autoClose: 'Auto-close after', removeAfterPick: 'Remove winner after pick',
    countdown: 'Countdown before spin', allowDuplicates: 'Allow same winner twice',
    pickCount: 'Pick count', sound: 'Sound',
    totalSpins: 'Total Spins', uniqueWinners: 'Unique Winners',
    mostPicked: 'Most Picked', spinHistory: 'Spin History',
    copied: 'Copied to clipboard!', imported: 'Imported',
    cleared: 'All cleared!', language: 'Language',
    useTemplate: 'Use Template', fullscreen: 'Fullscreen',
  },
  fr: {
    spin: 'TOURNER!', entries: 'Participants', results: 'Résultats',
    winner: '🎉 Gagnant!', addPlaceholder: 'Tapez un nom...',
    shuffle: 'Mélanger', sort: 'Trier', import: 'Importer',
    export: 'Exporter', copy: 'Copier', clear: 'Effacer',
    removeAndSpin: 'Retirer & Re-tourner',
    keepAndSpin: 'Garder & Re-tourner', close: 'Fermer',
    stats: 'Statistiques', noResults: 'Aucun résultat',
    noEntries: 'Ajoutez des participants',
    customize: 'Personnaliser', gallery: 'Galerie',
    new: 'Nouveau', open: 'Ouvrir', save: 'Sauver', share: 'Partager',
    appearance: 'Apparence', spinSettings: 'Paramètres',
    winnerDisplay: 'Affichage', behavior: 'Comportement',
    shareExport: 'Partager & Exporter', duration: 'Durée',
    rotations: 'Rotations', showLabels: 'Afficher étiquettes',
    glowEffect: 'Effet lueur', labelFontSize: 'Taille police',
    popupStyle: 'Style popup', confetti: 'Confettis',
    autoClose: 'Fermer auto', removeAfterPick: 'Retirer gagnant',
    countdown: 'Compte à rebours', allowDuplicates: 'Doublons autorisés',
    pickCount: 'Nombre de tirages', sound: 'Son',
    totalSpins: 'Tours totaux', uniqueWinners: 'Gagnants uniques',
    mostPicked: 'Plus tiré', spinHistory: 'Historique',
    copied: 'Copié!', imported: 'Importé',
    cleared: 'Tout effacé!', language: 'Langue',
    useTemplate: 'Utiliser', fullscreen: 'Plein écran',
  },
  es: {
    spin: '¡GIRAR!', entries: 'Participantes', results: 'Resultados',
    winner: '🎉 ¡Ganador!', addPlaceholder: 'Escribe un nombre...',
    shuffle: 'Mezclar', sort: 'Ordenar', import: 'Importar',
    export: 'Exportar', copy: 'Copiar', clear: 'Borrar',
    removeAndSpin: 'Quitar & Girar de Nuevo',
    keepAndSpin: 'Mantener & Girar de Nuevo', close: 'Cerrar',
    stats: 'Estadísticas', noResults: 'Sin resultados',
    noEntries: 'Agrega participantes',
    customize: 'Personalizar', gallery: 'Galería',
    new: 'Nuevo', open: 'Abrir', save: 'Guardar', share: 'Compartir',
    appearance: 'Apariencia', spinSettings: 'Configuración',
    winnerDisplay: 'Mostrar Ganador', behavior: 'Comportamiento',
    shareExport: 'Compartir & Exportar', duration: 'Duración',
    rotations: 'Rotaciones', showLabels: 'Mostrar etiquetas',
    glowEffect: 'Efecto brillo', labelFontSize: 'Tamaño fuente',
    popupStyle: 'Estilo popup', confetti: 'Confeti',
    autoClose: 'Cerrar auto', removeAfterPick: 'Quitar ganador',
    countdown: 'Cuenta regresiva', allowDuplicates: 'Permitir repetidos',
    pickCount: 'Cantidad', sound: 'Sonido',
    totalSpins: 'Giros totales', uniqueWinners: 'Ganadores únicos',
    mostPicked: 'Más elegido', spinHistory: 'Historial',
    copied: '¡Copiado!', imported: 'Importado',
    cleared: '¡Todo borrado!', language: 'Idioma',
    useTemplate: 'Usar plantilla', fullscreen: 'Pantalla completa',
  },
  ar: {
    spin: 'دوّر!', entries: 'المشاركون', results: 'النتائج',
    winner: '🎉 الفائز!', addPlaceholder: 'اكتب اسماً...',
    shuffle: 'خلط', sort: 'فرز', import: 'استيراد',
    export: 'تصدير', copy: 'نسخ', clear: 'مسح',
    removeAndSpin: 'إزالة & الدوران مجدداً',
    keepAndSpin: 'الإبقاء & الدوران مجدداً', close: 'إغلاق',
    stats: 'إحصائيات', noResults: 'لا توجد نتائج',
    noEntries: 'أضف مشاركين للبدء',
    customize: 'تخصيص', gallery: 'المعرض',
    new: 'جديد', open: 'فتح', save: 'حفظ', share: 'مشاركة',
    appearance: 'المظهر', spinSettings: 'إعدادات الدوران',
    winnerDisplay: 'عرض الفائز', behavior: 'السلوك',
    shareExport: 'مشاركة & تصدير', duration: 'المدة',
    rotations: 'الدورات', showLabels: 'إظهار التسميات',
    glowEffect: 'تأثير التوهج', labelFontSize: 'حجم الخط',
    popupStyle: 'نمط النافذة', confetti: 'الورق الملون',
    autoClose: 'إغلاق تلقائي', removeAfterPick: 'إزالة الفائز',
    countdown: 'العد التنازلي', allowDuplicates: 'السماح بالتكرار',
    pickCount: 'عدد الاختيارات', sound: 'الصوت',
    totalSpins: 'إجمالي الدورات', uniqueWinners: 'فائزون فريدون',
    mostPicked: 'الأكثر اختياراً', spinHistory: 'سجل الدورات',
    copied: 'تم النسخ!', imported: 'تم الاستيراد',
    cleared: 'تم المسح!', language: 'اللغة',
    useTemplate: 'استخدام القالب', fullscreen: 'ملء الشاشة',
  },
  pt: {
    spin: 'GIRAR!', entries: 'Participantes', results: 'Resultados',
    winner: '🎉 Vencedor!', addPlaceholder: 'Digite um nome...',
    shuffle: 'Embaralhar', sort: 'Ordenar', import: 'Importar',
    export: 'Exportar', copy: 'Copiar', clear: 'Limpar',
    removeAndSpin: 'Remover & Girar Novamente',
    keepAndSpin: 'Manter & Girar Novamente', close: 'Fechar',
    stats: 'Estatísticas', noResults: 'Sem resultados',
    noEntries: 'Adicione participantes',
    customize: 'Personalizar', gallery: 'Galeria',
    new: 'Novo', open: 'Abrir', save: 'Salvar', share: 'Compartilhar',
    appearance: 'Aparência', spinSettings: 'Configurações',
    winnerDisplay: 'Exibição', behavior: 'Comportamento',
    shareExport: 'Compartilhar & Exportar', duration: 'Duração',
    rotations: 'Rotações', showLabels: 'Mostrar rótulos',
    glowEffect: 'Efeito brilho', labelFontSize: 'Tamanho fonte',
    popupStyle: 'Estilo popup', confetti: 'Confete',
    autoClose: 'Fechar auto', removeAfterPick: 'Remover vencedor',
    countdown: 'Contagem regressiva', allowDuplicates: 'Permitir repetidos',
    pickCount: 'Quantidade', sound: 'Som',
    totalSpins: 'Giros totais', uniqueWinners: 'Vencedores únicos',
    mostPicked: 'Mais sorteado', spinHistory: 'Histórico',
    copied: 'Copiado!', imported: 'Importado',
    cleared: 'Tudo limpo!', language: 'Idioma',
    useTemplate: 'Usar modelo', fullscreen: 'Tela cheia',
  },
  de: {
    spin: 'DREHEN!', entries: 'Teilnehmer', results: 'Ergebnisse',
    winner: '🎉 Gewinner!', addPlaceholder: 'Name eingeben...',
    shuffle: 'Mischen', sort: 'Sortieren', import: 'Importieren',
    export: 'Exportieren', copy: 'Kopieren', clear: 'Löschen',
    removeAndSpin: 'Entfernen & Neu drehen',
    keepAndSpin: 'Behalten & Neu drehen', close: 'Schließen',
    stats: 'Statistiken', noResults: 'Keine Ergebnisse',
    noEntries: 'Teilnehmer hinzufügen',
    customize: 'Anpassen', gallery: 'Galerie',
    new: 'Neu', open: 'Öffnen', save: 'Speichern', share: 'Teilen',
    appearance: 'Erscheinungsbild', spinSettings: 'Einstellungen',
    winnerDisplay: 'Gewinner-Anzeige', behavior: 'Verhalten',
    shareExport: 'Teilen & Exportieren', duration: 'Dauer',
    rotations: 'Drehungen', showLabels: 'Beschriftungen',
    glowEffect: 'Leuchteffekt', labelFontSize: 'Schriftgröße',
    popupStyle: 'Popup-Stil', confetti: 'Konfetti',
    autoClose: 'Auto-Schließen', removeAfterPick: 'Gewinner entfernen',
    countdown: 'Countdown', allowDuplicates: 'Doppelte erlauben',
    pickCount: 'Anzahl', sound: 'Ton',
    totalSpins: 'Gesamtdrehungen', uniqueWinners: 'Eindeutige Gewinner',
    mostPicked: 'Meistgezogen', spinHistory: 'Verlauf',
    copied: 'Kopiert!', imported: 'Importiert',
    cleared: 'Alles gelöscht!', language: 'Sprache',
    useTemplate: 'Vorlage verwenden', fullscreen: 'Vollbild',
  },
};

export const TEMPLATES = [
  { name: 'Yes / No / Maybe', entries: ['Yes', 'No', 'Maybe'] },
  { name: 'Days of the Week', entries: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  { name: 'Truth or Dare', entries: ['Truth', 'Dare'] },
  { name: 'Months of the Year', entries: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
  { name: 'Numbers 1–10', entries: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
  { name: 'Random Colors', entries: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Cyan'] },
  { name: 'Team A vs Team B', entries: ['Team A', 'Team B'] },
  { name: 'Dinner Ideas', entries: ['Pizza', 'Sushi', 'Burgers', 'Tacos', 'Pasta', 'Salad', 'Curry', 'Steak'] },
  { name: 'Movie Genres', entries: ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation'] },
  { name: 'Classroom (30 names)', entries: Array.from({ length: 30 }, (_, i) => `Student ${i + 1}`) },
  { name: 'Rock Paper Scissors', entries: ['Rock', 'Paper', 'Scissors'] },
  { name: 'Custom (blank)', entries: [] },
];
