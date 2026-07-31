"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { CipherText } from "@/components/cipher-text";
import { PAYSILO_ABI, PAYSILO_ADDRESS, configured } from "@/lib/contracts";
import { getHandleClient } from "@/lib/nox";
import { formatAmount, isAddress } from "@/lib/format";

type Result =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "granted"; value: bigint }
  | { state: "denied" };

export default function AuditPage() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [target, setTarget] = useState("");
  const [result, setResult] = useState<Result>({ state: "idle" });

  async function attempt() {
    if (!walletClient || !publicClient || !isAddress(target)) return;
    setResult({ state: "checking" });
    try {
      const handle = (await publicClient.readContract({
        address: PAYSILO_ADDRESS,
        abi: PAYSILO_ABI,
        functionName: "confidentialBalanceOf",
        args: [target],
      })) as `0x${string}`;
      const client = await getHandleClient(walletClient);
      const { value } = await client.decrypt(handle);
      setResult({ state: "granted", value: value as bigint });
    } catch {
      setResult({ state: "denied" });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="eyebrow">Auditor</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">Audit a balance</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-dim">
        Enter a recipient&apos;s address and attempt decryption with your connected
        wallet. You will read their balance only if they granted you access. A
        denial is the system working, and this page shows it plainly.
      </p>

      <div className="mt-8 rounded-lg border border-line bg-panel p-6 shadow-card">
        <label className="eyebrow" htmlFor="target">
          Recipient address
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="target"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setResult({ state: "idle" });
            }}
            placeholder="0x… the recipient you were granted access to"
            spellCheck={false}
            className="flex-1 rounded-md border border-line bg-void px-3 py-2.5 font-mono text-sm placeholder:text-cipher"
          />
          <button
            onClick={attempt}
            disabled={!isConnected || !configured || !isAddress(target) || result.state === "checking"}
            className="rounded-md border border-seal/50 bg-seal/10 px-5 py-2.5 font-mono text-sm text-seal transition-all hover:bg-seal/20 hover:shadow-seal disabled:opacity-40"
          >
            {result.state === "checking" ? "Attempting…" : "Attempt decryption"}
          </button>
        </div>
        {!isConnected && (
          <p className="mt-3 font-mono text-xs text-ink-dim">
            Connect the wallet the recipient granted access to.
          </p>
        )}

        <div className="mt-8 rounded-md border border-line/70 bg-void p-5">
          {result.state === "idle" && (
            <p className="font-mono text-sm text-cipher">Awaiting an attempt. Nothing is read until you ask.</p>
          )}
          {result.state === "checking" && (
            <p className="font-mono text-sm text-ink-dim">
              Asking the gateway. The on-chain access list decides, not this page.
            </p>
          )}
          {result.state === "granted" && (
            <div>
              <p className="eyebrow">access granted · balance</p>
              <p className="mt-1 text-2xl">
                <CipherText text={`${formatAmount(result.value)} tUSDC`} revealed sweepMs={55} />
              </p>
              <p className="mt-3 font-mono text-xs text-ink-dim">
                You can read this because the recipient granted your address view
                access. Their future payouts create new handles outside this grant.
              </p>
            </div>
          )}
          {result.state === "denied" && (
            <div>
              <p className="eyebrow text-danger">access denied</p>
              <p className="mt-1 text-2xl">
                <CipherText text="0000.00 tUSDC" revealed={false} />
              </p>
              <p className="mt-3 font-mono text-xs text-ink-dim">
                No grant exists for your wallet on this balance. The key service
                will not release decryption material. Ask the recipient to grant
                access from their My pay page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
