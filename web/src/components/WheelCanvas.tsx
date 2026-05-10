import { useRef, useEffect, useCallback } from 'react';
import type { SpinEntry } from '@/lib/spin-types';
import { truncate, computeFontSize } from '@/lib/spin-utils';


interface Props {
  entries: SpinEntry[];
  currentAngle: number;
  showLabels: boolean;
  glowEffect: boolean;
}


export default function WheelCanvas({ entries, currentAngle, showLabels, glowEffect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(currentAngle);
  angleRef.current = currentAngle;


  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, size: number) => {
    const dpr = window.devicePixelRatio || 1;
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size / 2) - 8;
    const angle = angleRef.current;


    ctx.clearRect(0, 0, size, size);


    if (entries.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#3a4260';
      ctx.font = `500 ${14 * dpr}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add entries to spin', cx, cy);
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
      grad.addColorStop(0, 'rgba(255,255,255,0.12)');
      grad.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = grad;
      ctx.fill();


      // segment border
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';