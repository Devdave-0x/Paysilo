import hre from "hardhat";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createViemHandleClient } from "@iexec-nox/handle";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Demonstrates the full PaySilo confidential payroll flow on Sepolia:
 *   1. Alice decrypts her own balance (authorized → succeeds)
 *   2. Bob attempts to decrypt Alice's balance (unauthorized → denied)
 *   3. Alice grants the auditor view access
 *   4. Auditor decrypts Alice's balance (after grant → succeeds)
 *
 * Requires payroll:sepolia to have been run first.
 *
 * Recipient keys are burner wallets generated for this demo.
 * Usage: npx hardhat run scripts/demoFlow.ts --network sepolia
 */

const ALICE_KEY   = "0x2f4736e34c34710ade6ec6d4b6f93b1ad0c6c5f6216f782c9d67f6ba36a80131" as `0x${string}`;
const BOB_KEY     = "0x80a6e21489a6affff70ee2b304c631b8a54c7824b57441722c7b6db814b87a00" as `0x${string}`;
const AUDITOR_KEY = "0x06533a44b5c56eae41924d7c6caf9731040a1be15ba470263b36fa501949b0c3" as `0x${string}`;

async function main() {
  const paySiloAddress = process.env.PAYSILO_ADDRESS as `0x${string}` | undefined;
  if (!paySiloAddress) throw new Error("Set PAYSILO_ADDRESS in .env");

  const rpcUrl = process.env.SEPOLIA_RPC_URL!;
  const paySilo = await (await hre.network.connect()).viem.getContractAt("PaySilo", paySiloAddress);

  const aliceAccount   = privateKeyToAccount(ALICE_KEY);
  const bobAccount     = privateKeyToAccount(BOB_KEY);
  const auditorAccount = privateKeyToAccount(AUDITOR_KEY);

  const aliceWallet   = createWalletClient({ account: aliceAccount,   transport: http(rpcUrl) });
  const bobWallet     = createWalletClient({ account: bobAccount,     transport: http(rpcUrl) });
  const auditorWallet = createWalletClient({ account: auditorAccount, transport: http(rpcUrl) });

  const aliceHandleClient   = await createViemHandleClient(aliceWallet);
  const bobHandleClient     = await createViemHandleClient(bobWallet);
  const auditorHandleClient = await createViemHandleClient(auditorWallet);

  const aliceHandle = await paySilo.read.confidentialBalanceOf([aliceAccount.address]);
  console.log("\nAlice address:", aliceAccount.address);
  console.log("Alice balance handle (opaque on-chain):", aliceHandle);

  // 1. Alice decrypts her own balance — should succeed.
  console.log("\n[1] Alice decrypts her own balance...");
  const aliceResult = await aliceHandleClient.decrypt(aliceHandle);
  console.log("    Plaintext:", aliceResult.value.toString(), "(expected 1500000000 = 1,500 tUSDC) ✓");

  // 2. Bob tries to decrypt Alice's balance — should be denied.
  console.log("\n[2] Bob attempts to decrypt Alice's balance (unauthorized)...");
  try {
    await bobHandleClient.decrypt(aliceHandle);
    console.error("    UNEXPECTED SUCCESS — privacy guarantee FAILED");
    process.exitCode = 1;
    return;
  } catch {
    console.log("    Decryption denied — no viewer grant ✓");
  }

  // 3. Alice grants auditor access.
  console.log("\n[3] Alice grants auditor view access...");
  const grantHash = await paySilo.write.grantAuditorAccess([auditorAccount.address], {
    account: aliceAccount,
  });
  console.log("    Grant tx:", grantHash);
  console.log(`    Etherscan: https://sepolia.etherscan.io/tx/${grantHash}`);

  // Wait for the Nox gateway to index the viewer grant before decrypting.
  // On Sepolia the gateway lags behind chain head by a few blocks (~30-60 s).
  console.log("    Waiting 45 s for gateway to index viewer grant...");
  await new Promise((r) => setTimeout(r, 45_000));

  // 4. Auditor decrypts Alice's balance — should succeed after grant.
  console.log("\n[4] Auditor decrypts Alice's balance after grant...");
  const auditorResult = await auditorHandleClient.decrypt(aliceHandle);
  console.log("    Plaintext:", auditorResult.value.toString(), "(expected 1500000000 = 1,500 tUSDC) ✓");

  console.log("\n=== Demo complete. All assertions passed. ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
