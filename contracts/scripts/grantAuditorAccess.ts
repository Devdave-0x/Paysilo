import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Run this as the RECIPIENT (not the payroll admin). Grants an auditor address
 * permission to decrypt the caller's confidential balance handle, without making
 * it public and without moving any funds.
 *
 * Required env vars:
 *   PAYSILO_ADDRESS      - deployed PaySilo contract address
 *   AUDITOR_ADDRESS      - address to grant view access to
 *   DEPLOYER_PRIVATE_KEY - must be the recipient's own key for this run
 *
 * Usage:
 *   npx hardhat run scripts/grantAuditorAccess.ts --network sepolia
 */
async function main() {
  const paySiloAddress = process.env.PAYSILO_ADDRESS as `0x${string}` | undefined;
  const auditorAddress = process.env.AUDITOR_ADDRESS as `0x${string}` | undefined;
  if (!paySiloAddress) throw new Error("Set PAYSILO_ADDRESS in .env");
  if (!auditorAddress) throw new Error("Set AUDITOR_ADDRESS in .env");

  const { viem } = await hre.network.connect();
  const paySilo = await viem.getContractAt("PaySilo", paySiloAddress);

  const hash = await paySilo.write.grantAuditorAccess([auditorAddress]);
  console.log("Auditor access granted, tx:", hash);
  console.log(`${auditorAddress} can now decrypt this account's confidential balance handle.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
