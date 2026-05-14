import {
  useState,
  useEffect,
  useRef,
  useReducer,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Trash2,
  Shuffle,
  ArrowUpDown,
  Download,
  Upload,
  Copy,
  X,
  Settings,
  Image,
  Plus,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Zap,
  Menu,
} from "lucide-react";
import WheelCanvas from "@/components/WheelCanvas";
import ConfettiCanvas from "@/components/ConfettiCanvas";
import {
  initialState,
  spinReducer,
  loadPersistedState,
} from "@/lib/spin-state";
import {
  SEGMENT_COLORS,
  COLOR_THEMES,
  LANGS,
  TEMPLATES,
} from "@/lib/spin-types";
import type { SpinEntry } from "@/lib/spin-types";
import {
  pickWeightedWinner,
  computeFinalAngle,
  assignColors,
} from "@/lib/spin-utils";
import { spinStartSound, celebrationSound } from "@/lib/spin-audio";
import { MiniWheelPreview, HeaderBtn, ToggleRow } from "./SpinHelpers";

function useTranslation(lang: string) {
  return useCallback(
    (key: string) => LANGS[lang]?.[key] || LANGS["en"][key] || key,
    [lang],
  );
}

export default function Index() {
  const [state, dispatch] = useReducer(spinReducer, initialState, (init) => {
    const persisted = loadPersistedState();
    return { ...init, ...persisted };
  });

  const t = useTranslation(state.lang);

  const animFrameRef = useRef<number>(0);
  const currentAngleRef = useRef(state.currentAngle);
  const [currentAngle, setCurrentAngle] = useState(state.currentAngle);
  const [confettiActive, setConfettiActive] = useState(false);
  const [confettiColor, setConfettiColor] = useState("#63b3ed");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [newEntry, setNewEntry] = useState("");
  const [customizeTab, setCustomizeTab] = useState("appearance");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [multiProgress, setMultiProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [multiWinners, setMultiWinners] = useState<SpinEntry[]>([]);
  const multiQueueRef = useRef<SpinEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  currentAngleRef.current = currentAngle;

  const showToast = useCallback((msg: string) => {
    dispatch({ type: "SET_TOAST", payload: msg });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => dispatch({ type: "SET_TOAST", payload: null }),
      2500,
    );
  }, []);

  const runSingleSpin = useCallback(
    (winner: SpinEntry, onDone: (w: SpinEntry) => void) => {
      if (state.entries.length === 0) return;
      dispatch({ type: "SET_SPINNING", payload: true });
      spinStartSound(state.settings.soundEnabled);
      dispatch({ type: "SET_WINNER", payload: winner });

      const startAngle = currentAngleRef.current;
      const finalAngle = computeFinalAngle(state.entries, winner, startAngle);
      const duration = state.settings.spinDuration * 1000;
      const startTime = performance.now();
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

      function animate(now: number) {
        const elapsed = now - startTime;
        const tval = Math.min(elapsed / duration, 1);
        const eased = easeOut(tval);
        const newAngle = startAngle + (finalAngle - startAngle) * eased;
        currentAngleRef.current = newAngle;
        setCurrentAngle(newAngle);

        if (tval < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          currentAngleRef.current = finalAngle;
          setCurrentAngle(finalAngle);
          dispatch({ type: "SET_SPINNING", payload: false });
          setTimeout(() => onDone(winner), 350);
        }
      }
      animFrameRef.current = requestAnimationFrame(animate);
    },
    [state.entries, state.settings.soundEnabled, state.settings.spinDuration],
  );

  const startNextMultiSpin = useCallback(() => {
    const queue = multiQueueRef.current;
    if (!queue || queue.length === 0) {
      setMultiProgress(null);
      return;
    }
    const next = queue[0];
    multiQueueRef.current = queue.slice(1);
    setMultiProgress((prev) =>
      prev ? { ...prev, current: prev.current + 1 } : null,
    );
    runSingleSpin(next, onSpinComplete);
  }, [runSingleSpin]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (e.key === "Escape") {
        if (state.showWinner) dispatch({ type: "CLOSE_WINNER" });
        else if (state.showCustomize || state.showGallery) {
          dispatch({
            type: "LOAD_STATE",
            payload: { showCustomize: false, showGallery: false },
          });
        }
        return;
      }
      if (e.key === " " && !isInput) {
        e.preventDefault();
        triggerSpin();
        return;
      }
      if (e.key === "s" && !isInput) {
        e.preventDefault();
        dispatch({ type: "SHUFFLE" });
        showToast(t("shuffle"));
        return;
      }
      if (e.key === "f") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (e.ctrlKey && e.key === "z" && !isInput) {
        e.preventDefault();
        dispatch({ type: "UNDO_DELETE" });
        showToast("Restored!");
        return;
      }
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        triggerSpin();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    state.showWinner,
    state.showCustomize,
    state.showGallery,
    state.entries,
    state.settings,
    t,
  ]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "light",
      state.settings.themeMode === "light",
    );
  }, [state.settings.themeMode]);

  useEffect(() => {
    if (!state.counting) return;
    let count = 3;
    dispatch({ type: "SET_COUNT_NUM", payload: count });
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        dispatch({ type: "SET_COUNT_NUM", payload: count });
      } else if (count === 0) {
        dispatch({ type: "SET_COUNT_NUM", payload: 0 });
        dispatch({ type: "SET_COUNTING", payload: false });
        if (multiQueueRef.current.length > 0 || multiProgress) {
          startNextMultiSpin();
        } else {
          doSingleSpin();
        }
      }
    }, 900);
    return () => clearInterval(interval);
  }, [state.counting, multiProgress, startNextMultiSpin]);

  const closeModals = useCallback(() => {
    dispatch({
      type: "LOAD_STATE",
      payload: { showCustomize: false, showGallery: false },
    });
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  function triggerSpin() {
    if (state.spinning || state.entries.length === 0) return;
    const pickCount = state.settings.pickCount;
    if (pickCount > 1) {
      const winners: SpinEntry[] = [];
      let pool = [...state.entries];
      for (let i = 0; i < pickCount; i++) {
        if (pool.length === 0) break;
        const w = pickWeightedWinner(pool);
        winners.push(w);
        pool = pool.filter((e) => e.id !== w.id);
      }
      multiQueueRef.current = winners;
      setMultiWinners(winners);
      setMultiProgress({ current: 0, total: winners.length });
      if (state.settings.countdownEnabled) {
        dispatch({ type: "SET_COUNTING", payload: true });
      } else {
        startNextMultiSpin();
      }
    } else {
      setMultiWinners([]);
      if (state.settings.countdownEnabled) {
        dispatch({ type: "SET_COUNTING", payload: true });
      } else {
        doSingleSpin();
      }
    }
  }

  function handlePickCountChange(value: number) {
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: {
        pickCount: value,
        ...(value > 1 ? { removeAfterPick: true } : {}),
      },
    });
  }

  function doSingleSpin() {
    if (state.entries.length === 0) return;
    const winner = pickWeightedWinner(state.entries);
    runSingleSpin(winner, onSpinComplete);
  }

  function onSpinComplete(winner: SpinEntry) {
    const result = {
      id: winner.id,
      text: winner.text,
      color: winner.color,
      spin: state.spinCount + 1,
      time: new Date().toLocaleTimeString(),
    };
    dispatch({ type: "LOG_RESULT", payload: result });

    if (state.settings.confetti) {
      setConfettiColor(winner.color);
      setConfettiActive(true);
    }
    celebrationSound(state.settings.soundEnabled);

    const isMultiRun = (multiProgress?.total ?? 0) > 1;
    if (isMultiRun || state.settings.removeAfterPick) {
      setTimeout(() => {
        dispatch({ type: "DELETE_ENTRY", payload: winner.id });
      }, 400);
    }

    if (multiQueueRef.current.length > 0) {
      const currentPick = multiProgress ? multiProgress.current : 1;
      const total = multiProgress ? multiProgress.total : 1;
      showToast(`Pick ${currentPick} of ${total}: ${winner.text}`);
      setTimeout(() => {
        startNextMultiSpin();
      }, 1400);
    } else {
      setMultiProgress(null);
      if (state.settings.winnerDisplay !== "none") {
        dispatch({ type: "LOAD_STATE", payload: { showWinner: true } });
      }
    }
  }

  function handleAddEntry() {
    if (!newEntry.trim()) return;
    dispatch({ type: "ADD_ENTRY", payload: newEntry });
    setNewEntry("");
    inputRef.current?.focus();
  }

  function handleBulkAdd() {
    const names = bulkText
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    dispatch({ type: "ADD_BULK_ENTRIES", payload: names });
    setBulkText("");
    showToast(`Added ${names.length} entries!`);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (file.name.endsWith(".json")) {
        try {
          const data = JSON.parse(text);
          if (data.entries) {
            const entries = data.entries.map((en: SpinEntry, i: number) => ({
              ...en,
              id: Date.now() + i,
            }));
            dispatch({ type: "SET_ENTRIES", payload: entries });
            showToast(`${t("imported")} ${entries.length} entries!`);
          }
        } catch {
          showToast("Invalid JSON");
        }
      } else {
        const lines = text
          .split(/\n/)
          .map((l: string) => l.trim())
          .filter(Boolean);
        dispatch({ type: "ADD_BULK_ENTRIES", payload: lines });
        showToast(`${t("imported")} ${lines.length} entries!`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function exportJSON() {
    const data = JSON.stringify(
      {
        version: 1,
        app: "SpinFusion",
        savedAt: new Date().toISOString(),
        entries: state.entries,
        settings: state.settings,
      },
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spinfusion-wheel.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported JSON!");
  }

  function exportCSV() {
    const header = "Spin #,Name,Time\n";
    const rows = state.results
      .map(
        (r: { spin: number; text: string; time: string }) =>
          `${r.spin},"${r.text}",${r.time}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spinfusion-results.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported CSV!");
  }

  function copyNames() {
    navigator.clipboard.writeText(
      state.entries.map((e: SpinEntry) => e.text).join("\n"),
    );
    showToast(t("copied"));
  }

  function shareLink() {
    const hash = btoa(
      JSON.stringify({ entries: state.entries.map((e: SpinEntry) => e.text) }),
    );
    window.location.hash = hash;
    navigator.clipboard.writeText(window.location.href);
    showToast("Share link copied!");
  }

  function applyTemplate(entries: string[]) {
    const newEntries = assignColors(entries, SEGMENT_COLORS);
    dispatch({ type: "SET_ENTRIES", payload: newEntries });
    dispatch({ type: "LOAD_STATE", payload: { showGallery: false } });
    showToast(`Loaded ${entries.length} entries!`);
  }

  function applyColorTheme(idx: number) {
    const theme = COLOR_THEMES[idx];
    if (!theme) return;
    const newEntries = state.entries.map((e: SpinEntry, i: number) => ({
      ...e,
      color: theme.colors[i % theme.colors.length],
    }));
    dispatch({ type: "SET_ENTRIES", payload: newEntries });
    dispatch({ type: "UPDATE_SETTINGS", payload: { colorTheme: idx } });
  }

  const filteredEntries = useMemo(() => {
    if (!searchQuery) return state.entries;
    return state.entries.filter((e: SpinEntry) =>
      e.text.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [state.entries, searchQuery]);

  const winCounts = useMemo(() => {
    const map = new Map<string, number>();
    state.results.forEach((r: { text: string }) => {
      map.set(r.text, (map.get(r.text) || 0) + 1);
    });
    return map;
  }, [state.results]);

  const maxWins = useMemo(() => {
    let max = 0;
    winCounts.forEach((v: number) => {
      if (v > max) max = v;
    });
    return max || 1;
  }, [winCounts]);

  const uniqueWinners = useMemo(
    () => new Set(state.results.map((r: { text: string }) => r.text)).size,
    [state.results],
  );

  const mostPicked = useMemo(() => {
    let best = "";
    let bestCount = 0;
    winCounts.forEach((count: number, name: string) => {
      if (count > bestCount) {
        bestCount = count;
        best = name;
      }
    });
    return best || "-";
  }, [winCounts]);

  const langOptions = [
    { code: "en", label: "EN" },
    { code: "fr", label: "FR" },
    { code: "es", label: "ES" },
    { code: "ar", label: "AR" },
    { code: "pt", label: "PT" },
    { code: "de", label: "DE" },
  ];

  const readyBulkCount = useMemo(() => {
    return bulkText
      .split(/[\n,;]+/)
      .map((t) => t.trim())
      .filter(Boolean).length;
  }, [bulkText]);

  return (
    <div
      className="h-screen flex flex-col"
      style={{ background: "var(--bg-deep)" }}
    >
      <header
        className="h-14 flex items-center justify-between px-4 shrink-0"
        style={{
          background: "rgba(6,8,24,0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Zap size={20} style={{ color: "var(--neon-blue)" }} />
          <span
            className="font-display text-xl tracking-wide"
            style={{ color: "var(--neon-blue)" }}
          >
            SpinFusion
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("pickCount")}:&nbsp;
          </span>
          <select
            className="text-xs rounded-xl px-3 py-1.5 outline-none cursor-pointer"
            style={{
              background:
                "linear-gradient(145deg,rgba(99,179,237,0.18),rgba(79,209,197,0.12))",
              border: "1px solid rgba(99,179,237,0.45)",
              color: "var(--text-bright)",
            }}
            value={state.settings.pickCount}
            onChange={(e) => handlePickCountChange(Number(e.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden lg:flex items-center gap-1.5">
            <HeaderBtn
              onClick={() => dispatch({ type: "SET_ENTRIES", payload: [] })}
              icon={<Zap size={14} />}
              label={t("new")}
            />
            <HeaderBtn
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload size={14} />}
              label={t("open")}
            />
            <HeaderBtn
              onClick={exportJSON}
              icon={<Download size={14} />}
              label={t("save")}
            />
            <HeaderBtn
              onClick={shareLink}
              icon={<Copy size={14} />}
              label={t("share")}
            />
            <HeaderBtn
              onClick={() =>
                dispatch({ type: "LOAD_STATE", payload: { showGallery: true } })
              }
              icon={<Image size={14} />}
              label={t("gallery")}
            />
            <HeaderBtn
              onClick={() =>
                dispatch({
                  type: "LOAD_STATE",
                  payload: { showCustomize: true },
                })
              }
              icon={<Settings size={14} />}
              label={t("customize")}
            />
          </div>
          <button
            onClick={() =>
              dispatch({
                type: "UPDATE_SETTINGS",
                payload: { soundEnabled: !state.settings.soundEnabled },
              })
            }
            className="p-1.5 rounded-lg transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-muted)",
            }}
          >
            {state.settings.soundEnabled ? (
              <Volume2 size={14} />
            ) : (
              <VolumeX size={14} />
            )}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg transition-colors hidden sm:block"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-muted)",
            }}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
          <select
            className="text-xs rounded-lg px-2 py-1 outline-none cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-muted)",
            }}
            value={state.lang}
            onChange={(e) =>
              dispatch({ type: "SET_LANG", payload: e.target.value })
            }
          >
            {langOptions.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-muted)",
            }}
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden"
            style={{
              background: "rgba(6,8,24,0.98)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex flex-wrap gap-2 p-3">
              <HeaderBtn
                onClick={() => {
                  dispatch({ type: "SET_ENTRIES", payload: [] });
                  setMobileMenuOpen(false);
                }}
                icon={<Zap size={14} />}
                label={t("new")}
              />
              <HeaderBtn
                onClick={() => {
                  fileInputRef.current?.click();
                  setMobileMenuOpen(false);
                }}
                icon={<Upload size={14} />}
                label={t("open")}
              />
              <HeaderBtn
                onClick={() => {
                  exportJSON();
                  setMobileMenuOpen(false);
                }}
                icon={<Download size={14} />}
                label={t("save")}
              />
              <HeaderBtn
                onClick={() => {
                  shareLink();
                  setMobileMenuOpen(false);
                }}
                icon={<Copy size={14} />}
                label={t("share")}
              />
              <HeaderBtn
                onClick={() => {
                  dispatch({
                    type: "LOAD_STATE",
                    payload: { showGallery: true },
                  });
                  setMobileMenuOpen(false);
                }}
                icon={<Image size={14} />}
                label={t("gallery")}
              />
              <HeaderBtn
                onClick={() => {
                  dispatch({
                    type: "LOAD_STATE",
                    payload: { showCustomize: true },
                  });
                  setMobileMenuOpen(false);
                }}
                icon={<Settings size={14} />}
                label={t("customize")}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center relative min-w-0 p-4 md:p-8">
          <div className="relative w-full max-w-[520px] aspect-square">
            <WheelCanvas
              entries={state.entries}
              currentAngle={currentAngle}
              showLabels={state.settings.showLabels}
              glowEffect={state.settings.glowEffect}
            />
            <div
              className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-10"
              style={{
                width: 0,
                height: 0,
                borderTop: "14px solid transparent",
                borderBottom: "14px solid transparent",
                borderLeft: "24px solid var(--neon-blue)",
                filter: "drop-shadow(0 0 8px rgba(99,179,237,0.6))",
              }}
            />
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <motion.button
              onClick={triggerSpin}
              disabled={state.spinning || state.entries.length === 0}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="font-display tracking-widest uppercase"
              style={{
                background: state.spinning
                  ? "linear-gradient(135deg,#2d3748,#1a202c)"
                  : "linear-gradient(135deg,#63b3ed,#4fd1c5)",
                color: state.spinning ? "#6b7a99" : "#060818",
                fontSize: "22px",
                letterSpacing: "2px",
                padding: "16px 56px",
                borderRadius: "100px",
                border: "none",
                cursor: state.spinning ? "not-allowed" : "pointer",
                boxShadow: state.spinning
                  ? "none"
                  : "0 0 40px rgba(99,179,237,0.45)",
                transition: "all 0.3s",
                animation: state.spinning
                  ? "none"
                  : "spinPulse 2s ease-in-out infinite",
              }}
            >
              {state.spinning
                ? multiProgress
                  ? `PICKING ${multiProgress.current} OF ${multiProgress.total}...`
                  : "SPINNING..."
                : `🎯 ${t("spin")}`}
            </motion.button>
            {multiProgress && (
              <div
                className="text-xs font-medium"
                style={{ color: "var(--neon-blue)" }}
              >
                Pick {multiProgress.current} of {multiProgress.total}
              </div>
            )}
            <div
              className="flex items-center gap-3 text-[11px]"
              style={{ color: "var(--text-hint)" }}
            >
              <span className="font-mono-accent">[SPACE]</span>{" "}
              <span>{t("spin")}</span>
              <span className="font-mono-accent">[S]</span>{" "}
              <span>{t("shuffle")}</span>
              <span className="font-mono-accent">[F]</span>{" "}
              <span>{t("fullscreen")}</span>
              <span className="font-mono-accent">[ESC]</span>{" "}
              <span>{t("close")}</span>
            </div>
          </div>
        </div>

        <aside
          className="hidden md:flex w-[360px] shrink-0 flex-col glass-panel"
          style={{ borderLeft: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div
            className="flex h-[46px] shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            {(["entries", "results", "stats"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => dispatch({ type: "SET_TAB", payload: tab })}
                className="flex-1 flex items-center justify-center gap-1.5 text-[13px] font-medium transition-colors relative"
                style={{
                  color:
                    state.activeTab === tab
                      ? "var(--neon-blue)"
                      : "var(--text-muted)",
                  borderBottom:
                    state.activeTab === tab
                      ? "2px solid var(--neon-blue)"
                      : "2px solid transparent",
                }}
              >
                {t(tab)}
                <span
                  className="text-[11px] px-[7px] py-[1px] rounded-full"
                  style={{
                    background: "rgba(99,179,237,0.15)",
                    color: "var(--neon-blue)",
                  }}
                >
                  {tab === "entries"
                    ? state.entries.length
                    : tab === "results"
                      ? state.results.length
                      : state.spinCount}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
            <AnimatePresence mode="wait">
              {state.activeTab === "entries" && (
                <motion.div
                  key="entries"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setBulkMode(false)}
                      className="text-[11px] px-2.5 py-1 rounded-md transition-colors"
                      style={{
                        background: !bulkMode
                          ? "rgba(99,179,237,0.15)"
                          : "rgba(255,255,255,0.04)",
                        color: !bulkMode
                          ? "var(--neon-blue)"
                          : "var(--text-muted)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      Single
                    </button>
                    <button
                      onClick={() => setBulkMode(true)}
                      className="text-[11px] px-2.5 py-1 rounded-md transition-colors"
                      style={{
                        background: bulkMode
                          ? "rgba(99,179,237,0.15)"
                          : "rgba(255,255,255,0.04)",
                        color: bulkMode
                          ? "var(--neon-blue)"
                          : "var(--text-muted)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      Bulk
                    </button>
                  </div>

                  {!bulkMode ? (
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        value={newEntry}
                        onChange={(e) => setNewEntry(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddEntry()}
                        placeholder={t("addPlaceholder")}
                        className="flex-1 outline-none transition-colors focus:border-[rgba(99,179,237,0.4)]"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "10px",
                          color: "var(--text-bright)",
                          fontSize: "14px",
                          padding: "10px 14px",
                        }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handleAddEntry}
                        className="shrink-0 font-bold"
                        style={{
                          background: "linear-gradient(135deg,#63b3ed,#4fd1c5)",
                          color: "#060818",
                          fontSize: "13px",
                          padding: "10px 18px",
                          borderRadius: "10px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={16} />
                      </motion.button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="Paste names here, separated by commas or new lines..."
                        className="w-full outline-none resize-none transition-colors focus:border-[rgba(99,179,237,0.4)]"
                        rows={10}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "10px",
                          color: "var(--text-bright)",
                          fontSize: "13px",
                          padding: "10px 14px",
                          minHeight: "220px",
                        }}
                      />
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--text-hint)" }}
                        >
                          {readyBulkCount} name{readyBulkCount !== 1 ? "s" : ""}{" "}
                          ready
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={handleBulkAdd}
                          disabled={readyBulkCount === 0}
                          className="font-bold"
                          style={{
                            background:
                              "linear-gradient(135deg,#63b3ed,#4fd1c5)",
                            color: "#060818",
                            fontSize: "13px",
                            padding: "8px 16px",
                            borderRadius: "10px",
                            border: "none",
                            cursor:
                              readyBulkCount === 0 ? "not-allowed" : "pointer",
                            opacity: readyBulkCount === 0 ? 0.5 : 1,
                          }}
                        >
                          Add All
                        </motion.button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        icon: <Shuffle size={12} />,
                        label: t("shuffle"),
                        onClick: () => {
                          dispatch({ type: "SHUFFLE" });
                          showToast(t("shuffle"));
                        },
                      },
                      {
                        icon: <ArrowUpDown size={12} />,
                        label: t("sort"),
                        onClick: () => {
                          dispatch({ type: "SORT" });
                          showToast(t("sort"));
                        },
                      },
                      {
                        icon: <Upload size={12} />,
                        label: t("import"),
                        onClick: () => fileInputRef.current?.click(),
                      },
                      {
                        icon: <Download size={12} />,
                        label: t("export"),
                        onClick: exportJSON,
                      },
                      {
                        icon: <Copy size={12} />,
                        label: t("copy"),
                        onClick: copyNames,
                      },
                      {
                        icon: <Trash2 size={12} />,
                        label: t("clear"),
                        onClick: () => {
                          dispatch({ type: "CLEAR_ALL" });
                          showToast(t("cleared"));
                        },
                      },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={btn.onClick}
                        className="flex items-center gap-1 text-xs rounded-lg transition-colors hover:border-[rgba(99,179,237,0.4)] hover:text-[var(--neon-blue)]"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-muted)",
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        {btn.icon} {btn.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-hint)" }}
                    />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full outline-none pl-8 pr-3"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        color: "var(--text-bright)",
                        fontSize: "13px",
                        padding: "8px 14px 8px 32px",
                      }}
                    />
                  </div>

                  <div
                    className="text-[11px]"
                    style={{ color: "var(--text-hint)" }}
                  >
                    {state.entries.length} entries
                  </div>

                  <AnimatePresence>
                    {filteredEntries.map((entry: SpinEntry) => (
                      <motion.div
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-2.5 rounded-xl transition-colors"
                        style={{ padding: "8px 10px" }}
                        whileHover={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <div
                          className="shrink-0 rounded-full"
                          style={{
                            width: "12px",
                            height: "12px",
                            background: entry.color,
                            border: "1.5px solid rgba(0,0,0,0.4)",
                          }}
                        />
                        {editingId === entry.id ? (
                          <input
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => {
                              dispatch({
                                type: "UPDATE_ENTRY",
                                payload: { id: entry.id, text: editText },
                              });
                              setEditingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                dispatch({
                                  type: "UPDATE_ENTRY",
                                  payload: { id: entry.id, text: editText },
                                });
                                setEditingId(null);
                              }
                            }}
                            className="flex-1 outline-none bg-transparent"
                            style={{
                              fontSize: "13px",
                              color: "var(--text-bright)",
                            }}
                          />
                        ) : (
                          <span
                            className="flex-1 cursor-text select-none"
                            style={{
                              fontSize: "13px",
                              color: "var(--text-bright)",
                            }}
                            onDoubleClick={() => {
                              setEditingId(entry.id);
                              setEditText(entry.text);
                            }}
                          >
                            {entry.text}
                          </span>
                        )}
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={entry.weight}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_ENTRY",
                              payload: {
                                id: entry.id,
                                weight: Number(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-10 text-center outline-none"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "6px",
                            color: "var(--text-bright)",
                            fontSize: "12px",
                            padding: "3px",
                          }}
                        />
                        <button
                          onClick={() =>
                            dispatch({
                              type: "DELETE_ENTRY",
                              payload: entry.id,
                            })
                          }
                          className="p-1 rounded-md transition-colors hover:bg-red-500/10 hover:text-red-400"
                          style={{ color: "var(--text-hint)" }}
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {state.activeTab === "results" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-3"
                >
                  {state.results.length === 0 ? (
                    <div
                      className="text-center py-10 text-sm"
                      style={{ color: "var(--text-hint)" }}
                    >
                      {t("noResults")}
                    </div>
                  ) : (
                    <>
                      <AnimatePresence>
                        {state.results.map(
                          (r: {
                            spin: number;
                            text: string;
                            color: string;
                            time: string;
                          }) => (
                            <motion.div
                              key={`${r.spin}-${r.text}`}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-2.5 rounded-xl"
                              style={{
                                padding: "9px 12px",
                                marginBottom: "4px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              <span
                                className="text-[11px] px-2 py-0.5 rounded-full"
                                style={{
                                  background: "rgba(255,255,255,0.05)",
                                  color: "var(--text-hint)",
                                }}
                              >
                                #{r.spin}
                              </span>
                              <div
                                className="shrink-0 rounded-full"
                                style={{
                                  width: "10px",
                                  height: "10px",
                                  background: r.color,
                                }}
                              />
                              <span
                                className="flex-1 font-medium text-[13px]"
                                style={{ color: "var(--text-bright)" }}
                              >
                                {r.text}
                              </span>
                              <span
                                className="text-[12px]"
                                style={{ color: "var(--text-hint)" }}
                              >
                                {r.time}
                              </span>
                            </motion.div>
                          ),
                        )}
                      </AnimatePresence>
                      <div className="mt-2">
                        <div
                          className="text-xs font-medium mb-2"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Win Frequency
                        </div>
                        {Array.from(winCounts.entries()).map(
                          ([name, count]) => (
                            <div
                              key={name}
                              className="flex items-center gap-2 mb-1.5"
                            >
                              <span
                                className="text-[11px] w-20 truncate"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {name}
                              </span>
                              <div
                                className="flex-1 h-2 rounded-full overflow-hidden"
                                style={{ background: "rgba(255,255,255,0.05)" }}
                              >
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${(count / maxWins) * 100}%`,
                                  }}
                                  transition={{ duration: 0.5 }}
                                  className="h-full rounded-full"
                                  style={{
                                    background:
                                      state.entries.find(
                                        (e: SpinEntry) => e.text === name,
                                      )?.color || "var(--neon-blue)",
                                  }}
                                />
                              </div>
                              <span
                                className="text-[11px] w-4 text-right"
                                style={{ color: "var(--text-muted)" }}
                              >
                                {count}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                      <button
                        onClick={() => {
                          dispatch({ type: "CLEAR_RESULTS" });
                          showToast("Results cleared!");
                        }}
                        className="text-xs py-2 rounded-lg transition-colors hover:text-red-400"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-muted)",
                        }}
                      >
                        Clear Results
                      </button>
                    </>
                  )}
                </motion.div>
              )}

              {state.activeTab === "stats" && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col gap-3"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: t("totalSpins"),
                        value: state.spinCount,
                        color: "var(--neon-blue)",
                      },
                      {
                        label: t("uniqueWinners"),
                        value: uniqueWinners,
                        color: "var(--neon-cyan)",
                      },
                      {
                        label: t("mostPicked"),
                        value: mostPicked,
                        color: "var(--neon-gold)",
                        isText: true,
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className="rounded-xl p-3"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div
                          className="font-display text-[24px] leading-tight truncate"
                          style={{ color: card.color }}
                        >
                          {card.value}
                        </div>
                        <div
                          className="text-[11px] mt-1"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {card.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <div
                      className="text-xs font-medium mb-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t("spinHistory")}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {state.results
                        .slice(0, 20)
                        .map(
                          (
                            r: { color: string; text: string; spin: number },
                            i: number,
                          ) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-full"
                              style={{ background: r.color }}
                              title={`${r.text} (#${r.spin})`}
                            />
                          ),
                        )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.json"
        onChange={handleImport}
        className="hidden"
      />

      <AnimatePresence>
        {state.showWinner && state.winner && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch({ type: "CLOSE_WINNER" })}
            className="fixed inset-0 flex items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
            }}
          >
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.7, y: 60 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: { type: "spring", stiffness: 300, damping: 22 },
              }}
              exit={{
                opacity: 0,
                scale: 0.8,
                y: -40,
                transition: { duration: 0.25 },
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-[90%] max-w-[440px] text-center"
              style={{
                background: "linear-gradient(145deg,#0d1117,#131929)",
                border: "1px solid rgba(99,179,237,0.3)",
                borderRadius: "24px",
                padding: "40px 48px",
                boxShadow:
                  "0 0 80px rgba(99,179,237,0.15), 0 30px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="h-1 rounded-full mb-7"
                style={{
                  background: state.winner.color,
                  boxShadow: `0 0 20px ${state.winner.color}`,
                }}
              />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs uppercase tracking-[3px] mb-3"
                style={{ color: "var(--text-muted)" }}
              >
                {t("winner")}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 250 }}
                className="font-display break-words mb-2"
                style={{
                  fontSize: "52px",
                  color: "var(--text-bright)",
                  lineHeight: 1.1,
                }}
              >
                {multiWinners.length > 1
                  ? `${multiWinners.length} Winners`
                  : state.winner.text}
              </motion.h1>
              {multiWinners.length > 1 && (
                <div
                  className="mb-4 max-h-52 overflow-auto rounded-xl p-3 text-left"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {multiWinners.map((winner, idx) => (
                    <div
                      key={`${winner.id}-${idx}`}
                      className="text-sm py-1.5 px-2 rounded-md"
                      style={{
                        color: "var(--text-bright)",
                        borderLeft: `3px solid ${winner.color}`,
                      }}
                    >
                      {idx + 1}. {winner.text}
                    </div>
                  ))}
                </div>
              )}
              <p
                className="text-[13px] mb-8"
                style={{ color: "var(--text-hint)" }}
              >
                Spin #{state.spinCount}
              </p>
              <div className="flex flex-col gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    dispatch({ type: "REMOVE_WINNER" });
                    setTimeout(() => triggerSpin(), 400);
                  }}
                  className="font-bold text-sm py-3 px-6 rounded-xl border-none cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg,${state.winner.color},${state.winner.color}aa)`,
                    color: "#060818",
                  }}
                >
                  {t("removeAndSpin")}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    dispatch({ type: "CLOSE_WINNER" });
                    setTimeout(() => triggerSpin(), 300);
                  }}
                  className="text-sm py-3 px-6 rounded-xl cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "var(--text-bright)",
                  }}
                >
                  {t("keepAndSpin")}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => dispatch({ type: "CLOSE_WINNER" })}
                  className="text-[13px] py-2.5 px-6 rounded-xl cursor-pointer"
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "var(--text-muted)",
                  }}
                >
                  {t("close")}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.showCustomize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModals}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[560px] max-h-[80vh] flex flex-col"
              style={{
                background: "linear-gradient(145deg,#0d1117,#131929)",
                border: "1px solid rgba(99,179,237,0.2)",
                borderRadius: "20px",
                boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="flex items-center justify-between p-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span
                  className="font-display text-lg"
                  style={{ color: "var(--neon-blue)" }}
                >
                  {t("customize")}
                </span>
                <button
                  onClick={closeModals}
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-1 overflow-hidden">
                <div
                  className="w-40 shrink-0 p-2 overflow-y-auto"
                  style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {[
                    { id: "appearance", label: t("appearance") },
                    { id: "spinSettings", label: t("spinSettings") },
                    { id: "winnerDisplay", label: t("winnerDisplay") },
                    { id: "behavior", label: t("behavior") },
                    { id: "shareExport", label: t("shareExport") },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCustomizeTab(tab.id)}
                      className="w-full text-left text-[13px] font-medium rounded-lg px-3 py-2 transition-colors"
                      style={{
                        color:
                          customizeTab === tab.id
                            ? "var(--neon-blue)"
                            : "var(--text-muted)",
                        background:
                          customizeTab === tab.id
                            ? "rgba(99,179,237,0.1)"
                            : "transparent",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
                  {customizeTab === "appearance" && (
                    <div className="flex flex-col gap-4">
                      <div
                        className="text-sm font-medium"
                        style={{ color: "var(--text-bright)" }}
                      >
                        Color Themes
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {COLOR_THEMES.map((theme, i) => (
                          <button
                            key={i}
                            onClick={() => applyColorTheme(i)}
                            className="flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-white/5 text-left"
                            style={{
                              border:
                                state.settings.colorTheme === i
                                  ? "1px solid rgba(99,179,237,0.4)"
                                  : "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <div className="flex -space-x-1">
                              {theme.colors.slice(0, 3).map((c, j) => (
                                <div
                                  key={j}
                                  className="w-4 h-4 rounded-full border border-black/30"
                                  style={{ background: c }}
                                />
                              ))}
                            </div>
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {theme.name}
                            </span>
                          </button>
                        ))}
                      </div>
                      <ToggleRow
                        label={t("showLabels")}
                        value={state.settings.showLabels}
                        onChange={(v) =>
                          dispatch({
                            type: "UPDATE_SETTINGS",
                            payload: { showLabels: v },
                          })
                        }
                      />
                      <ToggleRow
                        label={t("glowEffect")}
                        value={state.settings.glowEffect}
                        onChange={(v) =>
                          dispatch({
                            type: "UPDATE_SETTINGS",
                            payload: { glowEffect: v },
                          })
                        }
                      />
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {t("labelFontSize")}
                        </span>
                        <input
                          type="range"
                          min={8}
                          max={24}
                          value={state.settings.fontSize}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_SETTINGS",
                              payload: { fontSize: Number(e.target.value) },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                          Theme
                        </span>
                        <select
                          value={state.settings.themeMode}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_SETTINGS",
                              payload: {
                                themeMode: e.target.value as "dark" | "light",
                              },
                            })
                          }
                          className="w-24 text-center rounded-xl outline-none cursor-pointer"
                          style={{
                            background:
                              "linear-gradient(145deg,rgba(99,179,237,0.18),rgba(79,209,197,0.12))",
                            border: "1px solid rgba(99,179,237,0.45)",
                            color: "var(--text-bright)",
                            padding: "6px 8px",
                          }}
                        >
                          <option value="dark">Dark</option>
                          <option value="light">Light</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {customizeTab === "spinSettings" && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {t("duration")}: {state.settings.spinDuration}s
                        </span>
                        <input
                          type="range"
                          min={3}
                          max={15}
                          value={state.settings.spinDuration}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_SETTINGS",
                              payload: { spinDuration: Number(e.target.value) },
                            })
                          }
                          className="w-32"
                        />
                      </div>
                    </div>
                  )}
                  {customizeTab === "winnerDisplay" && (
                    <div className="flex flex-col gap-4">
                      <ToggleRow
                        label={t("confetti")}
                        value={state.settings.confetti}
                        onChange={(v) =>
                          dispatch({
                            type: "UPDATE_SETTINGS",
                            payload: { confetti: v },
                          })
                        }
                      />
                      <div
                        className="text-sm"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Popup Style
                      </div>
                      {["popup", "toast", "none"].map((style) => (
                        <label
                          key={style}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="popupStyle"
                            checked={state.settings.winnerDisplay === style}
                            onChange={() =>
                              dispatch({
                                type: "UPDATE_SETTINGS",
                                payload: {
                                  winnerDisplay: style as
                                    | "popup"
                                    | "toast"
                                    | "none",
                                },
                              })
                            }
                          />
                          <span
                            className="text-sm capitalize"
                            style={{ color: "var(--text-bright)" }}
                          >
                            {style}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {customizeTab === "behavior" && (
                    <div className="flex flex-col gap-4">
                      <ToggleRow
                        label={t("removeAfterPick")}
                        value={state.settings.removeAfterPick}
                        onChange={(v) =>
                          dispatch({
                            type: "UPDATE_SETTINGS",
                            payload: { removeAfterPick: v },
                          })
                        }
                      />
                      <ToggleRow
                        label={t("countdown")}
                        value={state.settings.countdownEnabled}
                        onChange={(v) =>
                          dispatch({
                            type: "UPDATE_SETTINGS",
                            payload: { countdownEnabled: v },
                          })
                        }
                      />
                      <ToggleRow
                        label={t("allowDuplicates")}
                        value={state.settings.allowDuplicates}
                        onChange={(v) =>
                          dispatch({
                            type: "UPDATE_SETTINGS",
                            payload: { allowDuplicates: v },
                          })
                        }
                      />
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {t("pickCount")}
                        </span>
                        <select
                          value={state.settings.pickCount}
                          onChange={(e) =>
                            handlePickCountChange(Number(e.target.value))
                          }
                          className="w-20 text-center rounded-xl outline-none cursor-pointer"
                          style={{
                            background:
                              "linear-gradient(145deg,rgba(99,179,237,0.18),rgba(79,209,197,0.12))",
                            border: "1px solid rgba(99,179,237,0.45)",
                            color: "var(--text-bright)",
                            padding: "6px 8px",
                          }}
                        >
                          {Array.from({ length: 10 }, (_, i) => (
                            <option key={i} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  {customizeTab === "shareExport" && (
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={shareLink}
                        className="text-sm py-2.5 rounded-lg cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text-bright)",
                        }}
                      >
                        Copy Share Link
                      </button>
                      <button
                        onClick={exportJSON}
                        className="text-sm py-2.5 rounded-lg cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text-bright)",
                        }}
                      >
                        Export JSON
                      </button>
                      <button
                        onClick={exportCSV}
                        className="text-sm py-2.5 rounded-lg cursor-pointer"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text-bright)",
                        }}
                      >
                        Export Winners CSV
                      </button>
                      <button
                        onClick={() => {
                          dispatch({ type: "CLEAR_RESULTS" });
                          showToast("History cleared!");
                        }}
                        className="text-sm py-2.5 rounded-lg cursor-pointer hover:text-red-400"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text-bright)",
                        }}
                      >
                        Clear All History
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModals}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[640px] max-h-[80vh] flex flex-col"
              style={{
                background: "linear-gradient(145deg,#0d1117,#131929)",
                border: "1px solid rgba(99,179,237,0.2)",
                borderRadius: "20px",
                boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="flex items-center justify-between p-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span
                  className="font-display text-lg"
                  style={{ color: "var(--neon-blue)" }}
                >
                  {t("gallery")}
                </span>
                <button
                  onClick={closeModals}
                  style={{ color: "var(--text-muted)" }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto scrollbar-thin grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TEMPLATES.map((tmpl, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    className="rounded-xl p-3 flex flex-col gap-2"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="w-full aspect-square flex items-center justify-center">
                      <MiniWheelPreview entries={tmpl.entries} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: "var(--text-bright)" }}
                      >
                        {tmpl.name}
                      </span>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: "var(--text-hint)",
                        }}
                      >
                        {tmpl.entries.length}
                      </span>
                    </div>
                    <button
                      onClick={() => applyTemplate(tmpl.entries)}
                      className="text-xs py-2 rounded-lg cursor-pointer transition-colors hover:bg-[rgba(99,179,237,0.15)]"
                      style={{
                        background: "rgba(99,179,237,0.1)",
                        color: "var(--neon-blue)",
                        border: "none",
                      }}
                    >
                      {t("useTemplate")}
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.counting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center"
            style={{
              background: "rgba(6,8,24,0.92)",
              backdropFilter: "blur(12px)",
              zIndex: 90,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={state.countNum}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="font-display"
                style={{
                  fontSize: "180px",
                  color: "var(--neon-blue)",
                  textShadow: "0 0 80px rgba(99,179,237,0.8)",
                }}
              >
                {state.countNum > 0 ? state.countNum : "GO!"}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.toast && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] text-[13px] font-medium"
            style={{
              background: "rgba(99,179,237,0.15)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(99,179,237,0.3)",
              color: "var(--text-bright)",
              padding: "10px 22px",
              borderRadius: "100px",
              boxShadow: "0 0 30px rgba(99,179,237,0.2)",
            }}
          >
            {state.toast}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfettiCanvas
        active={confettiActive}
        baseColor={confettiColor}
        onComplete={() => setConfettiActive(false)}
      />
    </div>
  );
}
