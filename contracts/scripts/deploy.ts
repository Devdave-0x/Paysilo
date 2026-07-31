import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Deploys PaySilo on Sepolia.
 *
 * Required env vars:
 *   SEPOLIA_RPC_URL       - RPC endpoint for Sepolia
 *   DEPLOYER_PRIVATE_KEY  - deployer/admin key (funds gas, becomes payrollAdmin unless overridden)
 *   UNDERLYING_TOKEN      - address of the ERC-20 the Safe pays out in (e.g. test USDC on Sepolia)
 *   PAYROLL_ADMIN         - address authorized to run payroll batches (your Safe address)
 *
 * Usage:
 *   npm run deploy:sepolia
 */
async function main() {
  const underlyingToken = process.env.UNDERLYING_TOKEN;
  const payrollAdmin = process.env.PAYROLL_ADMIN;

  if (!underlyingToken) throw new Error("Set UNDERLYING_TOKEN in .env (Sepolia test token address)");
  if (!payrollAdmin) throw new Error("Set PAYROLL_ADMIN in .env (your Safe address)");

  const { viem } = await hre.network.connect();

  console.log("Deploying PaySilo to Sepolia...");
  console.log("  underlying token:", underlyingToken);
  console.log("  payroll admin (Safe):", payrollAdmin);

  const paySilo = await viem.deployContract("PaySilo", [
    "PaySilo Confidential Payroll",
    "cPAY",
    "https://paysilo.example/metadata.json", // swap for your real contractURI once frontend is live
    underlyingToken,
    payrollAdmin,
  ]);

  console.log("PaySilo deployed at:", paySilo.address);
  console.log("\nNext steps:");
  console.log("1. From the Safe, approve PaySilo to spend the payroll total on the underlying token.");
  console.log("2. Run `npm run payroll:sepolia` to execute a batch.");
  console.log("3. Verify on Etherscan:");
  console.log(
    `   npx hardhat verify --network sepolia ${paySilo.address} "PaySilo Confidential Payroll" "cPAY" "https://paysilo.example/metadata.json" ${underlyingToken} ${payrollAdmin}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
