"use client";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { CipherText } from "@/components/cipher-text";
import { Reveal } from "@/components/reveal";
import { useToast } from "@/components/toast";
import { PAYSILO_ABI, PAYSILO_ADDRESS, configured } from "@/lib/contracts";
import { getHandleClient } from "@/lib/nox";
import { formatAmount, isAddress, short } from "@/lib/format";

export default function RecipientPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const toast = useToast();

  const [handle, setHandle] = useState<`0x${string}` | null>(null);
  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ batchId: bigint; tx: string }[]>([]);
  const [auditor, setAuditor] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Balance handle: public pointer, meaningless without ACL rights.
  useEffect(() => {
    if (!configured || !publicClient || !address) return;
    publicClient
      .readContract({
        address: PAYSILO_ADDRESS,
        abi: PAYSILO_ABI,
        functionName: "confidentialBalanceOf",
        args: [address],
      })
      .then((h) => setHandle(h as `0x${string}`))
      .catch(() => setHandle(null));
  }, [publicClient, address]);

  // Payout history from ConfidentialPayout events for this recipient.
  useEffect(() => {
    if (!configured || !publicClient || !address) return;
    publicClient
      .getContractEvents({
        address: PAYSILO_ADDRESS,
        abi: PAYSILO_ABI,
        eventName: "ConfidentialPayout",
        args: { recipient: address },
        fromBlock: "earliest",
      })
      .then((logs) =>
        setHistory(
          logs.map((l) => ({
            batchId: (l.args as { batchId: bigint }).batchId,
            tx: l.transactionHash,
          }))
        )
      )
      .catch(() => setHistory([]));
  }, [publicClient, address]);

  async function decrypt() {
    if (!walletClient || !handle) return;
    setBusy(true);
    setDecrypted(null);
    try {
      const client = await getHandleClient(walletClient);
      const { value } = await client.decrypt(handle);
      setDecrypted(value as bigint);
    } catch {
      toast({
        kind: "err",
        title: "Decryption denied",
        body: "This wallet has no access to that balance. That is the privacy model working.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function grantAccess() {
    if (!isAddress(auditor)) return;
    try {
      const hash = await writeContractAsync({
        address: PAYSILO_ADDRESS,
        abi: PAYSILO_ABI,
        functionName: "grantAuditorAccess",
        args: [auditor],
      });
      setDialogOpen(false);
      toast({
        kind: "ok",
        title: "Access granted",
        body: `${short(auditor)} can now decrypt your current balance. Future payouts create fresh handles they cannot read.`,
        txHash: hash,
      });
    } catch (err) {
      toast({
        kind: "err",
        title: "Grant not sent",
        body: err instanceof Error ? err.message : "Transaction rejected.",
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="eyebrow">Recipient</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">My pay</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-dim">
        Your balance lives on-chain as an encrypted handle. Decrypting happens
        between your wallet and the key service; nothing is revealed to anyone
        else, on-chain or off.
      </p>

      <div className="mt-8 rounded-lg border border-seal/30 bg-panel p-6 shadow-card">
        {!isConnected ? (
          <p className="font-mono text-sm text-ink-dim">Connect your wallet to see your balance.</p>
        ) : (
          <>
            <p className="eyebrow">balance handle · public, unreadable</p>
            <p className="mt-1 break-all font-mono text-xs text-cipher">{handle ?? "—"}</p>

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">your balance</p>
                <p className="mt-1 text-2xl">
                  <CipherText
                    text={
                      decrypted !== null ? `${formatAmount(decrypted)} tUSDC` : "0,000.00 tUSDC"
                    }
                    revealed={decrypted !== null}
                    sweepMs={55}
                  />
                </p>
              </div>
              <button
                onClick={decrypt}
                disabled={!handle || busy}
                className="rounded-md border border-seal/50 bg-seal/10 px-5 py-2.5 font-mono text-sm text-seal transition-all hover:bg-seal/20 hover:shadow-seal disabled:opacity-40"
              >
                {busy ? "Decrypting…" : "Decrypt my balance"}
              </button>
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
                <Dialog.Trigger asChild>
                  <button className="rounded-md border border-line px-4 py-2 font-mono text-xs text-ink-dim transition-colors hover:border-sigil/50 hover:text-sigil">
                    Grant auditor access
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-50 bg-void/70 backdrop-blur-sm" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-panel p-6 shadow-card">
                    <Dialog.Title className="font-display text-lg font-semibold">
                      Grant auditor access
                    </Dialog.Title>
                    <Dialog.Description className="mt-2 text-sm text-ink-dim">
                      The address below will be able to decrypt your current balance
                      handle. Only this handle, only this address. Payouts after this
                      grant create new handles the auditor cannot read.
                    </Dialog.Description>
                    <input
                      value={auditor}
                      onChange={(e) => setAuditor(e.target.value)}
                      placeholder="0x… auditor address"
                      spellCheck={false}
                      className="mt-4 w-full rounded-md border border-line bg-void px-3 py-2.5 font-mono text-sm placeholder:text-cipher"
                    />
                    <div className="mt-5 flex justify-end gap-2">
                      <Dialog.Close asChild>
                        <button className="rounded-md border border-line px-4 py-2 font-mono text-xs text-ink-dim">
                          Cancel
                        </button>
                      </Dialog.Close>
                      <button
                        onClick={grantAccess}
                        disabled={!isAddress(auditor)}
                        className="rounded-md bg-sigil px-4 py-2 font-mono text-xs font-medium text-void disabled:opacity-40"
                      >
                        Grant access
                      </button>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </>
        )}
      </div>

      {isConnected && (
        <Reveal className="mt-10">
          <p className="eyebrow">Payout history</p>
          {history.length === 0 ? (
            <p className="mt-3 font-mono text-xs text-ink-dim">
              No payouts to this wallet yet. When a Safe pays you, the batch appears
              here; the amount stays yours alone.
            </p>
          ) : (
            <div className="mt-3 grid gap-2">
              {history.map((h) => (
                <a
                  key={h.tx + h.batchId.toString()}
                  href={`https://sepolia.etherscan.io/tx/${h.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border border-line bg-panel px-4 py-3 font-mono text-xs transition-colors hover:border-seal/40"
                >
                  <span className="text-ink-dim">batch #{h.batchId.toString()}</span>
                  <span className="text-cipher">amount sealed on-chain</span>
                  <span className="text-seal">view tx ↗</span>
                </a>
              ))}
            </div>
          )}
        </Reveal>
      )}
    </div>
  );
}
