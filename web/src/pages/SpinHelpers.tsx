import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { SEGMENT_COLORS } from "@/lib/spin-types";

export function HeaderBtn({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[13px] rounded-lg transition-colors hover:border-[rgba(99,179,237,0.3)] hover:text-[var(--neon-blue)]"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "var(--text-muted)",
        padding: "6px 12px",
        cursor: "pointer",
      }}
    >
      {icon} {label}
    </button>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{
          background: value ? "var(--neon-blue)" : "rgba(255,255,255,0.1)",
        }}
      >
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
        />
      </button>
    </div>
  );
}

export function MiniWheelPreview({ entries }: { entries: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 80;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;

    if (entries.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.stroke();
      return;
    }

    const sliceAngle = (Math.PI * 2) / entries.length;
    entries.forEach((_, i) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, i * sliceAngle, (i + 1) * sliceAngle);
      ctx.closePath();
      ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(99,179,237,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [entries]);

  return <canvas ref={canvasRef} />;
}
