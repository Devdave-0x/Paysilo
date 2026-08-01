"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import {
  PAYSILO_ABI,
  PAYSILO_ADDRESS,
  UNDERLYING_TOKEN,
  ERC20_ABI,
  configured,
} from "@/lib/contracts";
import { getHandleClient } from "@/lib/nox";
import { isAddress, parseAmount, formatAmount } from "@/lib/format";
import { useToast } from "@/components/toast";

type Row = { id: number; recipient: string; amount: string };
let rowId = 2;

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const toast = useToast();

  const [rows, setRows] = useState<Row[]>([
    { id: 0, recipient: "", amount: "" },
    { id: 1, recipient: "", amount: "" },
  ]);
  const [phase, setPhase] = useState<"idle" | "encrypting" | "approving" | "executing">("idle");

  const validRows = rows.filter((r) => isAddress(r.recipient) && safeParse(r.amount) !== null);
  const total = validRows.reduce((acc, r) => acc + (safeParse(r.amount) ?? 0n), 0n);
  const singleRecipient = validRows.length === 1;

  const update = (id: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, { id: rowId++, recipient: "", amount: "" }]);
  const removeRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));

  async function runPayroll() {
    if (!walletClient || !address || !publicClient) return;
    try {
      // 1. Encrypt each amount client-side — plaintext never leaves the browser.
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

      // 2. Approve PaySilo to pull the total from the connected wallet.
      setPhase("approving");
      await writeContractAsync({
        address: UNDERLYING_TOKEN,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [PAYSILO_ADDRESS, total],
      });

      // 3. Submit the payroll batch — msg.sender becomes payrollAdmin on-chain.
      setPhase("executing");
      const hash = await writeContractAsync({
        address: PAYSILO_ADDRESS,
        abi: PAYSILO_ABI,
        functionName: "runPayroll",
        args: [recipients, handles, proofs, total],
      });

      toast({
        kind: "ok",
        title: "Payroll executed",
        body: `${validRows.length} recipient${validRows.length === 1 ? "" : "s"} paid. Total ${formatAmount(total)} tUSDC is public; each split stays sealed.`,
        txHash: hash,
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
    validRows.length === 0 ||
    phase !== "idle";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
      <p className="eyebrow">Payroll admin</p>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Run payroll</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-dim">
        Amounts are encrypted in this browser before anything is sent. Connect the
        payroll admin wallet, fill in recipients and amounts, then click Run.
        Only the aggregate total below becomes visible on-chain.
      </p>

      <div className="mt-6 rounded-lg border border-sigil/30 bg-panel p-4 shadow-card sm:mt-8 sm:p-5">
        <div className="mt-2 space-y-3">
          {/* Header row — hidden on mobile since labels are inside inputs */}
          <div className="hidden grid-cols-[1fr_140px_32px] gap-2 font-mono text-[11px] uppercase tracking-widest text-ink-dim sm:grid">
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
                className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr_140px_32px] sm:items-center"
              >
                <input
                  value={r.recipient}
                  onChange={(e) => update(r.id, { recipient: e.target.value })}
                  placeholder="Recipient 0x…"
                  spellCheck={false}
                  className={`rounded-md border bg-void px-3 py-2.5 font-mono text-sm placeholder:text-cipher ${
                    r.recipient && !isAddress(r.recipient) ? "border-danger/60" : "border-line"
                  }`}
                />
                <div className="flex gap-2 sm:contents">
                  <input
                    value={r.amount}
                    onChange={(e) => update(r.id, { amount: e.target.value })}
                    placeholder="Amount (tUSDC)"
                    inputMode="decimal"
                    className={`flex-1 rounded-md border bg-void px-3 py-2.5 font-mono text-sm placeholder:text-cipher sm:text-right ${
                      r.amount && safeParse(r.amount) === null ? "border-danger/60" : "border-line"
                    }`}
                  />
                  <button
                    onClick={() => removeRow(r.id)}
                    disabled={rows.length <= 1}
                    aria-label="Remove row"
                    className="h-10 w-10 shrink-0 rounded-md border border-line text-ink-dim transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-30 sm:h-8 sm:w-8"
                  >
                    ×
                  </button>
                </div>
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
              : phase === "approving"
                ? "Approving token spend…"
                : phase === "executing"
                  ? "Submitting payroll…"
                  : "Run payroll"}
          </button>
        </div>
        {!isConnected && (
          <p className="mt-3 font-mono text-xs text-ink-dim">
            Connect the payroll admin wallet to continue.
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
