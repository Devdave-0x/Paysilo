"use client";
import { useEffect, useRef, useState } from "react";

const HEX = "0123456789abcdef";
const rand = () => HEX[(Math.random() * 16) | 0];

/**
 * The PaySilo signature motif. Three states:
 *  - sealed:    every character scrambles continuously (living ciphertext)
 *  - revealing: characters resolve left-to-right into `text` (the decrypt sweep)
 *  - revealed:  plaintext, colored seal-teal
 *
 * Respects prefers-reduced-motion: sealed shows static "········", revealed
 * jumps straight to plaintext.
 */
export function CipherText({
  text,
  revealed,
  className = "",
  sweepMs = 40,
  scrambleFps = 18,
}: {
  text: string;
  revealed: boolean;
  className?: string;
  sweepMs?: number;
  scrambleFps?: number;
}) {
  const [display, setDisplay] = useState<string>(() => text.replace(/\S/g, rand));
  const [done, setDone] = useState(false);
  const raf = useRef<number>(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    cancelAnimationFrame(raf.current);

    if (reduced.current) {
      setDisplay(revealed ? text : "·".repeat(text.length));
      setDone(revealed);
      return;
    }

    let last = 0;
    const frameGap = 1000 / scrambleFps;

    if (!revealed) {
      setDone(false);
      const scramble = (t: number) => {
        if (t - last > frameGap) {
          setDisplay(text.replace(/\S/g, rand));
          last = t;
        }
        raf.current = requestAnimationFrame(scramble);
      };
      raf.current = requestAnimationFrame(scramble);
      return () => cancelAnimationFrame(raf.current);
    }

    // Decrypt sweep: resolve one character per sweepMs, scramble the tail.
    const start = performance.now();
    const sweep = (t: number) => {
      const solved = Math.min(text.length, Math.floor((t - start) / sweepMs));
      const head = text.slice(0, solved);
      const tail = text.slice(solved).replace(/\S/g, rand);
      setDisplay(head + tail);
      if (solved < text.length) {
        raf.current = requestAnimationFrame(sweep);
      } else {
        setDisplay(text);
        setDone(true);
      }
    };
    raf.current = requestAnimationFrame(sweep);
    return () => cancelAnimationFrame(raf.current);
  }, [revealed, text, sweepMs, scrambleFps]);

  return (
    <span
      className={`font-mono tabular-nums transition-colors duration-500 ${
        done ? "text-seal" : "text-cipher"
      } ${className}`}
      aria-label={revealed ? text : "encrypted value"}
    >
      {display}
    </span>
  );
}
