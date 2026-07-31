import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createViemHandleClient } from "@iexec-nox/handle";
import {
  nox,
  handleGatewayUrl,
  NOX_COMPUTE_ADDRESS,
  RPC_URL,
} from "@iexec-nox/nox-hardhat-plugin";

/**
 * These tests run against the local Nox stack spun up by
 * @iexec-nox/nox-hardhat-plugin (KMS, ingestor, runner, handle gateway via
 * Docker Compose). Docker must be running locally.
 *
 *   npm test
 *
 * This does NOT hit Sepolia. It's here to catch integration bugs (proof
 * mismatches, ACL errors, wiring mistakes) before spending real testnet gas.
 * The actual submission proof is the live Sepolia deployment, not this file.
 */

// Chain 31337 isn't in the handle SDK's built-in NETWORK_CONFIGS, so we pass
// the local gateway URL (set in env by nox-hardhat-plugin at Docker startup)
// plus a placeholder subgraph URL the SDK requires for config validation but
// never actually queries in local tests.
function localHandleConfig() {
  return {
    gatewayUrl: handleGatewayUrl(),
    smartContractAddress: NOX_COMPUTE_ADDRESS,
    subgraphUrl: "https://example.com/subgraphs/id/none",
  } as const;
}

/**
 * Build a viem WalletClient from a raw private key, targeting the local nox
 * RPC. Using a local account (privateKeyToAccount) is critical: JSON-RPC
 * wallet clients call eth_accounts which always returns addresses[0] (admin),
 * breaking the handle SDK's isViewer ACL check for non-admin signers.
 */
function makeLocalWalletClient(privateKey: `0x${string}`) {
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    transport: http(RPC_URL),
  });
}

// Hardhat deterministic private keys (public knowledge, never use on mainnet).
const HARDHAT_KEYS = {
  admin:   "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  alice:   "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  bob:     "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  auditor: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
} as const;

describe("PaySilo", () => {
  it("runs a payroll batch and keeps individual amounts hidden from the batch total path", async () => {
    // nox.connect() creates an HTTP connection to the noxLocal network (port
    // 8545) where NoxCompute is actually deployed. The default EDR simulation
    // is a separate state machine with no NoxCompute.
    const connection = await nox.connect();
    const { viem } = connection;
    const [admin, alice, bob, auditor] = await viem.getWalletClients();

    const mockUSDC = await viem.deployContract("MockUSDC");
    const mintAmount = 10_000n * 10n ** 6n;
    await mockUSDC.write.mint([admin.account.address, mintAmount]);

    const paySilo = await viem.deployContract("PaySilo", [
      "PaySilo Confidential Payroll",
      "cPAY",
      "https://paysilo.example/metadata.json",
      mockUSDC.address,
      admin.account.address,
    ]);

    await mockUSDC.write.approve([paySilo.address, mintAmount], { account: admin.account });

    // The nox.connect() handleClient is bound to the first wallet (admin).
    const handleClient = connection.handleClient;

    const aliceAmount = 1_500_000_000n; // 1,500 tUSDC
    const bobAmount = 900_000_000n; // 900 tUSDC
    const total = aliceAmount + bobAmount;

    const aliceEnc = await handleClient.encryptInput(aliceAmount, "uint256", paySilo.address);
    const bobEnc = await handleClient.encryptInput(bobAmount, "uint256", paySilo.address);

    const hash = await paySilo.write.runPayroll(
      [
        [alice.account.address, bob.account.address],
        [aliceEnc.handle, bobEnc.handle],
        [aliceEnc.handleProof, bobEnc.handleProof],
        total,
      ],
      { account: admin.account }
    );
    assert.ok(hash, "batch transaction should submit");

    const batch = await paySilo.read.batches([0n]);
    assert.equal(batch[3], total, "batch total should equal the sum of encrypted amounts");

    const recipients = await paySilo.read.batchRecipients([0n]);
    assert.deepEqual(
      recipients.map((a) => a.toLowerCase()),
      [alice.account.address.toLowerCase(), bob.account.address.toLowerCase()],
    );

    // Fetch the balance handles BEFORE waiting, so we have the right handles.
    const aliceBalanceHandle = await paySilo.read.confidentialBalanceOf([alice.account.address]);
    const bobBalanceHandle = await paySilo.read.confidentialBalanceOf([bob.account.address]);

    // Wait for the offchain stack to resolve both handles. nox.ts's
    // waitForHandlesResolved is internal; poll the same gateway endpoint.
    // 60 × 100 ms = 6 s max, matching the plugin's RESOLVE_MAX_RETRIES.
    const statusUrl = `${handleGatewayUrl()}/v0/public/handles/status`;
    for (let i = 0; i < 60; i++) {
      const res = await fetch(statusUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: [aliceBalanceHandle, bobBalanceHandle] }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          payload: { statuses: Array<{ handle: string; resolved: boolean }> };
        };
        if (data.payload.statuses.every((s) => s.resolved)) break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    // Alice can decrypt her own balance. We must use a local-account wallet
    // client (not a JSON-RPC one) because ViemBlockchainService.getAddress()
    // calls walletClient.getAddresses()[0], and for JSON-RPC clients that
    // always returns eth_accounts[0] (admin), failing the isViewer ACL check.
    const aliceViemClient = makeLocalWalletClient(HARDHAT_KEYS.alice);
    const aliceHandleClient = await createViemHandleClient(aliceViemClient, localHandleConfig());
    const decrypted = await aliceHandleClient.decrypt(aliceBalanceHandle);
    assert.equal(decrypted.value, aliceAmount, "alice should decrypt exactly what she was paid");

    // Nobody else, including bob, can decrypt alice's balance yet.
    const bobViemClient = makeLocalWalletClient(HARDHAT_KEYS.bob);
    const bobHandleClient = await createViemHandleClient(bobViemClient, localHandleConfig());
    await assert.rejects(
      () => bobHandleClient.decrypt(aliceBalanceHandle),
      "bob should not be able to decrypt alice's balance without a viewer grant"
    );

    // Alice grants the auditor access; now the auditor can decrypt it too.
    await paySilo.write.grantAuditorAccess([auditor.account.address], { account: alice.account });
    const auditorViemClient = makeLocalWalletClient(HARDHAT_KEYS.auditor);
    const auditorHandleClient = await createViemHandleClient(auditorViemClient, localHandleConfig());
    const auditorView = await auditorHandleClient.decrypt(aliceBalanceHandle);
    assert.equal(auditorView.value, aliceAmount, "auditor should decrypt after being granted access");
  });
});
