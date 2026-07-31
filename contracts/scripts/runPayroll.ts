import hre from "hardhat";
import { createViemHandleClient } from "@iexec-nox/handle";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Encrypts a payroll batch client-side (amounts never appear in plaintext on-chain
 * or in this script's logs beyond the local PAYROLL definition below) and submits
 * it in one transaction from the payroll admin account.
 *
 * The script also mints enough tUSDC to the deployer and approves the PaySilo
 * contract before submitting the batch, so it is fully self-contained.
 *
 * Required env vars:
 *   PAYSILO_ADDRESS      - deployed PaySilo contract address
 *   UNDERLYING_TOKEN     - MockUSDC address
 *
 * Usage:
 *   npm run payroll:sepolia
 */
const PAYROLL: { recipient: `0x${string}`; amount: bigint }[] = [
  { recipient: "0xC058ae7438d82B664cEd6500885Ea59Fa1ae73c4", amount: 1_500_000_000n }, // alice — 1,500 tUSDC
  { recipient: "0xe85989eA9eBd3261F244469650bA6FfeB136473C", amount:   900_000_000n }, // bob   — 900 tUSDC
  { recipient: "0x8690E1a4C97EbAcf5Aa0fBb145Ee5Ce09A281D30", amount:   600_000_000n }, // audit — 600 tUSDC
];

const ERC20_ABI = [
  {
    type: "function", name: "mint", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function", name: "approve", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function main() {
  const paySiloAddress = process.env.PAYSILO_ADDRESS as `0x${string}` | undefined;
  const underlyingToken = process.env.UNDERLYING_TOKEN as `0x${string}` | undefined;
  if (!paySiloAddress) throw new Error("Set PAYSILO_ADDRESS in .env");
  if (!underlyingToken) throw new Error("Set UNDERLYING_TOKEN in .env");
  if (PAYROLL.length === 0) throw new Error("Fill in the PAYROLL array in scripts/runPayroll.ts first");

  const { viem } = await hre.network.connect();
  const [adminWallet] = await viem.getWalletClients();
  const paySilo = await viem.getContractAt("PaySilo", paySiloAddress);

  let totalAmount = 0n;
  for (const entry of PAYROLL) totalAmount += entry.amount;

  // Mint tUSDC to admin if needed, then approve PaySilo.
  const token = await viem.getContractAt("MockUSDC", underlyingToken);
  const balance = await token.read.balanceOf([adminWallet.account.address]);
  if (balance < totalAmount) {
    const need = totalAmount - balance;
    console.log(`Minting ${need} tUSDC units to deployer...`);
    await token.write.mint([adminWallet.account.address, need]);
  }
  console.log("Approving PaySilo to spend tUSDC...");
  await token.write.approve([paySiloAddress, totalAmount]);

  // Encrypt each amount client-side.
  const handleClient = await createViemHandleClient(adminWallet);

  const recipients: `0x${string}`[] = [];
  const encryptedAmounts: `0x${string}`[] = [];
  const inputProofs: `0x${string}`[] = [];

  for (const entry of PAYROLL) {
    const { handle, handleProof } = await handleClient.encryptInput(
      entry.amount,
      "uint256",
      paySiloAddress
    );
    recipients.push(entry.recipient);
    encryptedAmounts.push(handle as `0x${string}`);
    inputProofs.push(handleProof as `0x${string}`);
  }

  console.log(`Encrypted ${recipients.length} payout(s). Public aggregate: ${totalAmount}`);
  console.log("Submitting batch...");

  const hash = await paySilo.write.runPayroll([recipients, encryptedAmounts, inputProofs, totalAmount]);
  console.log("Batch tx:", hash);
  console.log(`Etherscan: https://sepolia.etherscan.io/tx/${hash}`);
  console.log("\nPer-recipient amounts hidden in calldata — only the aggregate total is visible.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
