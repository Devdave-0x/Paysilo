"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { short } from "@/lib/format";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="group flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-1.5 font-mono text-xs text-ink transition-colors hover:border-seal/50"
        title="Disconnect"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-seal animate-pulseDot" />
        {short(address)}
        <span className="text-ink-dim transition-colors group-hover:text-danger">×</span>
      </button>
    );
  }
  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      className="rounded-md border border-seal/50 bg-seal/10 px-4 py-1.5 font-mono text-xs text-seal transition-all hover:bg-seal/20 hover:shadow-seal disabled:opacity-50"
    >
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}
