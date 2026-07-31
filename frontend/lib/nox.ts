"use client";
import { createViemHandleClient } from "@iexec-nox/handle";
import type { WalletClient } from "viem";

/** One handle client per connected wallet. The Nox handle SDK talks to the
 *  gateway/KMS for encryption and ACL-gated decryption; config is resolved
 *  automatically from the chain ID (Sepolia is supported out of the box). */
let cached: { key: string; client: Awaited<ReturnType<typeof createViemHandleClient>> } | null =
  null;

export async function getHandleClient(walletClient: WalletClient) {
  const key = walletClient.account?.address ?? "";
  if (cached && cached.key === key) return cached.client;
  const client = await createViemHandleClient(walletClient as never);
  cached = { key, client };
  return client;
}
