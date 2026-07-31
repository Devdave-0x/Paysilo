"use client";
import { useEffect, useRef } from "react";

const HEX = "0123456789abcdef";

/**
 * Fibonacci-sphere particle field rendered as hex glyphs, rotating slowly on
 * a canvas. This occupies the same visual slot a Spline scene would in the
 * SplineScene / Spotlight pattern: full-bleed 3D-feeling centerpiece behind
 * foreground content. Swap for a real <SplineScene> once a .splinecode
 * asset exists; the surrounding layout does not need to change.
 */
export function CipherOrb({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 340;
    const radius = Math.min(width, height) * 0.34;
    const points = Array.from({ length: COUNT }, (_, i) => {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = (1 + Math.sqrt(5)) * Math.PI * i;
      return {
        x: Math.cos(theta) * r,
        y,
        z: Math.sin(theta) * r,
        glyph: HEX[(Math.random() * 16) | 0],
        flip: Math.random() * 1000,
      };
    });

    let angle = 0;
    let raf = 0;
    let last = performance.now();

    const frame = (t: number) => {
      const dt = t - last;
      last = t;
      angle += reduced ? 0 : dt * 0.00016;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cosB = Math.cos(angle * 0.6);
      const sinB = Math.sin(angle * 0.6);

      const projected = points.map((p) => {
        const x1 = p.x * cosA - p.z * sinA;
        const z1 = p.x * sinA + p.z * cosA;
        const y1 = p.y * cosB - z1 * sinB;
        const z2 = p.y * sinB + z1 * cosB;
        const scale = 1 / (2 - z2);
        return {
          sx: cx + x1 * radius * scale,
          sy: cy + y1 * radius * scale,
          z: z2,
          glyph: p.glyph,
          flip: p.flip,
        };
      });

      projected.sort((a, b) => a.z - b.z);

      for (const p of projected) {
        const depth = (p.z + 1) / 2;
        const alpha = 0.15 + depth * 0.65;
        const size = 8 + depth * 7;
        if (!reduced && (t + p.flip) % 2200 < 16) {
          p.glyph = HEX[(Math.random() * 16) | 0];
        }
        ctx.font = `${size.toFixed(1)}px var(--font-jetbrains), monospace`;
        ctx.fillStyle = `rgba(43, 228, 198, ${alpha.toFixed(3)})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.glyph, p.sx, p.sy);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
