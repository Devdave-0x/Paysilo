"use client";
import Safe from "@safe-global/protocol-kit";

/** Initializes the Protocol Kit against the connected browser wallet (EIP-1193).
 *  The signer must be an owner of the Safe. */
export async function initSafe(safeAddress: string, signerAddress: string) {
  const eth = (window as unknown as { ethereum?: unknown }).ethereum;
  if (!eth) throw new Error("No browser wallet found. Install MetaMask to continue.");
  return Safe.init({
    provider: eth as never,
    signer: signerAddress,
    safeAddress,
  });
}
