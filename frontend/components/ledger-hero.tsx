"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CipherText } from "./cipher-text";

const ROWS = [
  { name: "0x7bF3…9a21", role: "Protocol eng", amount: "4,200.00", you: false },
  { name: "0xE4c1…0d5f", role: "Design", amount: "3,650.00", you: false },
  { name: "0xA09d…44be", role: "You", amount: "3,900.00", you: true },
  { name: "0x51fa…c7e3", role: "DevRel", amount: "2,800.00", you: false },
];

/** The landing hero's living proof: a payroll ledger where every amount is
 *  ciphertext except yours, which decrypts on a timed sweep and re-seals. */
export function LedgerHero() {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  // Breathe: decrypt "your" row 1.2s after mount, hold, re-seal, repeat.
  useEffect(() => {
    if (reduced) {
      setRevealed(true);
      return;
    }
    let alive = true;
    const cycle = async () => {
      while (alive) {
        await wait(1200);
        if (!alive) break;
        setRevealed(true);
        await wait(4200);
        if (!alive) break;
        setRevealed(false);
        await wait(2600);
      }
    };
    cycle();
    return () => {
      alive = false;
    };
  }, [reduced]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-panel shadow-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="eyebrow">batch #12 · settled</span>
        <span className="flex items-center gap-2 font-mono text-[11px] text-ink-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-seal animate-pulseDot" />
          total public: <span className="text-ink">14,550.00 tUSDC</span>
        </span>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-line/60 font-mono text-[11px] uppercase tracking-widest text-ink-dim">
            <th className="px-4 py-2 font-normal">recipient</th>
            <th className="px-4 py-2 font-normal">role</th>
            <th className="px-4 py-2 text-right font-normal">amount</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <motion.tr
              key={r.name}
              initial={reduced ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.4 }}
              className={`border-b border-line/40 last:border-0 ${
                r.you ? "bg-seal/[0.05]" : ""
              }`}
            >
              <td className="px-4 py-3 font-mono text-sm text-ink">{r.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-ink-dim">
                {r.you ? <span className="text-seal">{r.role}</span> : r.role}
              </td>
              <td className="px-4 py-3 text-right text-sm">
                {r.you ? (
                  <CipherText text={`${r.amount} tUSDC`} revealed={revealed} />
                ) : (
                  <CipherText text={`${r.amount} tUSDC`} revealed={false} />
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-line px-4 py-2 font-mono text-[11px] text-ink-dim">
        Only you can decrypt your row. Everyone can verify the batch.
      </div>
    </div>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
