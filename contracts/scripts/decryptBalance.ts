import hre from "hardhat";
import { createViemHandleClient } from "@iexec-nox/handle";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Decrypts a confidential balance from PaySilo. Run this as:
 *   - a RECIPIENT (DEPLOYER_PRIVATE_KEY = recipient's key, TARGET_ACCOUNT unset or self)
 *     to prove you can read your own pay, or
 *   - an AUDITOR (DEPLOYER_PRIVATE_KEY = auditor's key, TARGET_ACCOUNT = the recipient
 *     who ran grantAuditorAccess) to prove selective disclosure works, or
 *   - any THIRD PARTY, to prove decryption correctly FAILS without a grant. A failure
 *     here, when unauthorized, is the privacy guarantee working. Show it in the video.
 *
 * Required env vars:
 *   PAYSILO_ADDRESS - deployed PaySilo
 *   TARGET_ACCOUNT  - (optional) whose balance to decrypt; defaults to the signer
 *
 * Usage:
 *   npx hardhat run scripts/decryptBalance.ts --network sepolia
 */
async function main() {
  const paySiloAddress = process.env.PAYSILO_ADDRESS as `0x${string}` | undefined;
  if (!paySiloAddress) throw new Error("Set PAYSILO_ADDRESS in .env");

  const { viem } = await hre.network.connect();
  const [wallet] = await viem.getWalletClients();
  const target =
    (process.env.TARGET_ACCOUNT as `0x${string}` | undefined) ?? wallet.account.address;

  const paySilo = await viem.getContractAt("PaySilo", paySiloAddress);
  const balanceHandle = await paySilo.read.confidentialBalanceOf([target]);

  console.log("Account:", target);
  console.log("Balance handle (public, meaningless without access):", balanceHandle);

  const handleClient = await createViemHandleClient(wallet);
  try {
    const { value } = await handleClient.decrypt(balanceHandle);
    console.log("Decrypted balance:", value.toString());
  } catch (err) {
    console.log("Decryption DENIED for this signer. No viewer grant, no plaintext.");
    console.log("(This is the expected outcome for unauthorized parties.)");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
