import { useRef, useEffect, useCallback } from "react";
import type { SpinEntry } from "@/lib/spin-types";
import { truncate, computeFontSize } from "@/lib/spin-utils";

interface Props {
  entries: SpinEntry[];
  currentAngle: number;
  showLabels: boolean;
  glowEffect: boolean;
}

export default function WheelCanvas({
  entries,
  currentAngle,
  showLabels,
  glowEffect,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(currentAngle);
  const prevEntriesRef = useRef<SpinEntry[]>(entries);
  const removedGhostRef = useRef<{
    start: number;
    end: number;
    color: string;
    text: string;
    alpha: number;
  } | null>(null);
  angleRef.current = currentAngle;

  const drawWheel = useCallback(
    (ctx: CanvasRenderingContext2D, size: number) => {
      const dpr = window.devicePixelRatio || 1;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 8;
      const angle = angleRef.current;

      ctx.clearRect(0, 0, size, size);

      if (entries.length === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#3a4260";
        ctx.font = `500 ${14 * dpr}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Add entries to spin", cx, cy);
        return;
      }

      const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
      let startAngle = angle;

      entries.forEach((entry) => {
        const sliceAngle = (entry.weight / totalWeight) * Math.PI * 2;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = entry.color;
        ctx.fill();

        // glossy overlay
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, "rgba(255,255,255,0.12)");
        grad.addColorStop(1, "rgba(0,0,0,0.18)");
        ctx.fillStyle = grad;
        ctx.fill();

        // segment border
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();

        // text label
        if (showLabels) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(startAngle + sliceAngle / 2);
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          const labelRadius = radius * 0.82;
          const fontSize = computeFontSize(entries.length) * dpr;
          ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillText(
            truncate(entry.text, 14),
            labelRadius + 1 * dpr,
            1 * dpr,
          );
          ctx.fillStyle = "#ffffff";
          ctx.fillText(truncate(entry.text, 14), labelRadius, 0);
          ctx.restore();
        }

        startAngle += sliceAngle;
      });

      const ghost = removedGhostRef.current;
      if (ghost && ghost.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = ghost.alpha;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, ghost.start, ghost.end);
        ctx.closePath();
        ctx.fillStyle = ghost.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
        ctx.restore();
      }

      // outer glow ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = glowEffect
        ? "rgba(99,179,237,0.5)"
        : "rgba(99,179,237,0.2)";
      ctx.lineWidth = 3 * dpr;
      ctx.stroke();

      // outer dark border
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 2 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 4 * dpr;
      ctx.stroke();

      // center hub
      const hubRadius = radius * 0.12;
      const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubRadius);
      hubGrad.addColorStop(0, "#1a2040");
      hubGrad.addColorStop(1, "#0d1117");
      ctx.beginPath();
      ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(99,179,237,0.6)";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      // center icon
      ctx.font = `${hubRadius * 0.9}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚡", cx, cy);
    },
    [entries, showLabels, glowEffect],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawWheel(ctx, size);
    };

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener("resize", resize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [drawWheel]);

  // Redraw when angle changes (during spin)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = Math.min(canvas.clientWidth, canvas.clientHeight);
    drawWheel(ctx, size);
  }, [currentAngle, drawWheel]);

  useEffect(() => {
    const prevEntries = prevEntriesRef.current;
    prevEntriesRef.current = entries;
    if (prevEntries.length !== entries.length + 1) return;
    const removed = prevEntries.find(
      (p: SpinEntry) => !entries.some((e) => e.id === p.id),
    );
    if (!removed) return;
    const totalWeight = prevEntries.reduce((s: number, e: SpinEntry) => s + e.weight, 0);
    let start = angleRef.current;
    for (const entry of prevEntries as SpinEntry[]) {
      const slice = (entry.weight / totalWeight) * Math.PI * 2;
      if (entry.id === removed.id) {
        removedGhostRef.current = {
          start,
          end: start + slice,
          color: removed.color,
          text: removed.text,
          alpha: 0.9,
        };
        break;
      }
      start += slice;
    }
    const startAt = performance.now();
    const duration = 450;
    const tick = (now: number) => {
      const ghost = removedGhostRef.current;
      if (!ghost) return;
      const t = Math.min((now - startAt) / duration, 1);
      ghost.alpha = 0.9 * (1 - t);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) drawWheel(ctx, Math.min(canvas.clientWidth, canvas.clientHeight));
      if (t < 1) requestAnimationFrame(tick);
      else removedGhostRef.current = null;
    };
    requestAnimationFrame(tick);
  }, [entries, drawWheel]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
    >
      <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "100%" }} />
    </div>
  );
}
