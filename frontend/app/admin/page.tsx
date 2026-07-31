"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWalletClient } from "wagmi";
import { encodeFunctionData } from "viem";
import {
  PAYSILO_ABI,
  PAYSILO_ADDRESS,
  UNDERLYING_TOKEN,
  ERC20_ABI,
  DEFAULT_SAFE,
  configured,
} from "@/lib/contracts";
import { getHandleClient } from "@/lib/nox";
import { initSafe } from "@/lib/safe";
import { isAddress, parseAmount, formatAmount } from "@/lib/format";
import { useToast } from "@/components/toast";

type Row = { id: number; recipient: string; amount: string };
let rowId = 2;

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const toast = useToast();

  const [safeAddress, setSafeAddress] = useState(DEFAULT_SAFE);
  const [rows, setRows] = useState<Row[]>([
    { id: 0, recipient: "", amount: "" },
    { id: 1, recipient: "", amount: "" },
  ]);
  const [phase, setPhase] = useState<"idle" | "encrypting" | "executing">("idle");

  const validRows = rows.filter((r) => isAddress(r.recipient) && safeParse(r.amount) !== null);
  const total = validRows.reduce((acc, r) => acc + (safeParse(r.amount) ?? 0n), 0n);
  const singleRecipient = validRows.length === 1;

  const update = (id: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { id: rowId++, recipient: "", amount: "" }]);
  const removeRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));

  async function runPayroll() {
    if (!walletClient || !address) return;
    try {
      setPhase("encrypting");
      const handleClient = await getHandleClient(walletClient);

      const recipients: `0x${string}`[] = [];
      const handles: `0x${string}`[] = [];
      const proofs: `0x${string}`[] = [];
      for (const r of validRows) {
        const amount = safeParse(r.amount)!;
        const { handle, handleProof } = await handleClient.encryptInput(
          amount,
          "uint256",
          PAYSILO_ADDRESS
        );
        recipients.push(r.recipient as `0x${string}`);
        handles.push(handle as `0x${string}`);
        proofs.push(handleProof as `0x${string}`);
      }

      setPhase("executing");
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [PAYSILO_ADDRESS, total],
      });
      const runData = encodeFunctionData({
        abi: PAYSILO_ABI,
        functionName: "runPayroll",
        args: [recipients, handles, proofs, total],
      });

      const safe = await initSafe(safeAddress, address);
      const tx = await safe.createTransaction({
        transactions: [
          { to: UNDERLYING_TOKEN, value: "0", data: approveData },
          { to: PAYSILO_ADDRESS, value: "0", data: runData },
        ],
      });
      const result = await safe.executeTransaction(tx);

      toast({
        kind: "ok",
        title: "Payroll executed",
        body: `${validRows.length} recipients paid. Total ${formatAmount(total)} tUSDC is public; each split stays sealed.`,
        txHash: result.hash,
      });
      setRows([
        { id: rowId++, recipient: "", amount: "" },
        { id: rowId++, recipient: "", amount: "" },
      ]);
    } catch (err) {
      toast({
        kind: "err",
        title: "Payroll not executed",
        body: err instanceof Error ? err.message : "Unknown error. Nothing was sent.",
      });
    } finally {
      setPhase("idle");
    }
  }

  const disabled =
    !isConnected ||
    !configured ||
    !isAddress(safeAddress) ||
    validRows.length === 0 ||
    phase !== "idle";

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="eyebrow">Safe authority</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Run payroll</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-dim">
        Amounts are encrypted in this browser before anything is sent. The Safe
        executes one transaction: approve and runPayroll, batched. Only the total
        below becomes public.
      </p>

      <div className="mt-8 rounded-lg border border-sigil/30 bg-panel p-5 shadow-card">
        <label className="eyebrow" htmlFor="safe">
          Paying Safe
        </label>
        <input
          id="safe"
          value={safeAddress}
          onChange={(e) => setSafeAddress(e.target.value)}
          placeholder="0x… your Safe on Sepolia"
          spellCheck={false}
          className="mt-2 w-full rounded-md border border-line bg-void px-3 py-2.5 font-mono text-sm text-ink placeholder:text-cipher focus:border-sigil/60"
        />

        <div className="mt-6 space-y-2">
          <div className="grid grid-cols-[1fr_150px_32px] gap-2 font-mono text-[11px] uppercase tracking-widest text-ink-dim">
            <span>recipient</span>
            <span>amount (tUSDC)</span>
            <span />
          </div>
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="grid grid-cols-[1fr_150px_32px] items-center gap-2"
              >
                <input
                  value={r.recipient}
                  onChange={(e) => update(r.id, { recipient: e.target.value })}
                  placeholder="0x…"
                  spellCheck={false}
                  className={`rounded-md border bg-void px-3 py-2 font-mono text-sm placeholder:text-cipher ${
                    r.recipient && !isAddress(r.recipient) ? "border-danger/60" : "border-line"
                  }`}
                />
                <input
                  value={r.amount}
                  onChange={(e) => update(r.id, { amount: e.target.value })}
                  placeholder="0.00"
                  inputMode="decimal"
                  className={`rounded-md border bg-void px-3 py-2 text-right font-mono text-sm placeholder:text-cipher ${
                    r.amount && safeParse(r.amount) === null ? "border-danger/60" : "border-line"
                  }`}
                />
                <button
                  onClick={() => removeRow(r.id)}
                  disabled={rows.length <= 1}
                  aria-label="Remove row"
                  className="h-8 rounded-md border border-line text-ink-dim transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-30"
                >
                  ×
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            onClick={addRow}
            className="mt-1 rounded-md border border-dashed border-line px-3 py-1.5 font-mono text-xs text-ink-dim transition-colors hover:border-seal/50 hover:text-seal"
          >
            + Add recipient
          </button>
        </div>

        {singleRecipient && (
          <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
            One recipient means the public total IS their pay. Add more rows to
            keep individual amounts hidden.
          </p>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <div>
            <p className="eyebrow">total · becomes public</p>
            <p className="mt-1 font-mono text-xl text-ink">{formatAmount(total)} tUSDC</p>
          </div>
          <button
            onClick={runPayroll}
            disabled={disabled}
            className="rounded-md bg-sigil px-6 py-2.5 font-mono text-sm font-medium text-void transition-all hover:shadow-sigil disabled:opacity-40"
          >
            {phase === "encrypting"
              ? "Encrypting amounts…"
              : phase === "executing"
                ? "Executing Safe transaction…"
                : "Run payroll"}
          </button>
        </div>
        {!isConnected && (
          <p className="mt-3 font-mono text-xs text-ink-dim">
            Connect a wallet that owns the Safe to continue.
          </p>
        )}
        {!configured && (
          <p className="mt-3 font-mono text-xs text-danger">
            Contract not configured. Set NEXT_PUBLIC_PAYSILO_ADDRESS and
            NEXT_PUBLIC_UNDERLYING_TOKEN in .env.local.
          </p>
        )}
      </div>
    </div>
  );
}

function safeParse(v: string): bigint | null {
  try {
    const n = parseAmount(v);
    return n > 0n ? n : null;
  } catch {
    return null;
  }
}
