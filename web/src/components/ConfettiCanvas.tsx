import { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotVel: number;
  shape: 'rect' | 'circle' | 'triangle';
  opacity: number;
}

interface Props {
  active: boolean;
  baseColor: string;
  onComplete: () => void;
}

export default function ConfettiCanvas({ active, baseColor, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  const colors = [baseColor, '#f6d860', '#ffffff', '#4fd1c5', '#f687b3'];

  const launch = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const particles: Particle[] = [];
    for (let i = 0; i < 180; i++) {
      particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 0.3,
        shape: (['rect', 'circle', 'triangle'] as const)[Math.floor(Math.random() * 3)],
        opacity: 1,
      });
    }
    particlesRef.current = particles;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    let startTime = performance.now();

    const animate = (now: number) => {
      if (!activeRef.current) return;
      const h = canvas.height / dpr;
      const w = canvas.width / dpr;
      ctx.clearRect(0, 0, w * dpr, h * dpr);

      let alive = 0;
      particlesRef.current.forEach((p) => {
        p.vy += 0.28;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotVel;
        p.opacity -= 0.007;
        if (p.opacity > 0) alive++;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x * dpr, p.y * dpr);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect((-p.size / 2) * dpr, (-p.size / 2) * dpr, p.size * dpr, p.size * dpr);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, (p.size / 2) * dpr, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, (-p.size / 2) * dpr);
          ctx.lineTo((p.size / 2) * dpr, (p.size / 2) * dpr);
          ctx.lineTo((-p.size / 2) * dpr, (p.size / 2) * dpr);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      if (alive > 0 && now - startTime < 4000) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [baseColor, onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (active) {
      launch();
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [active, launch]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 200,
        opacity: active ? 1 : 0,
      }}
    />
  );
}
