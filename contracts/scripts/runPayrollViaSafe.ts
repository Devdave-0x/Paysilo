import hre from "hardhat";
import Safe from "@safe-global/protocol-kit";
import { encodeFunctionData } from "viem";
import { createViemHandleClient } from "@iexec-nox/handle";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Executes a full payroll batch THROUGH THE SAFE, as one Safe transaction that
 * batches two calls via MultiSend:
 *
 *   1. underlyingToken.approve(paySilo, totalAmount)
 *   2. paySilo.runPayroll(recipients, encryptedAmounts, inputProofs, totalAmount)
 *
 * msg.sender for runPayroll is the Safe itself, so PAYROLL_ADMIN must be set to
 * the Safe address at PaySilo deploy time. The Safe never holds confidential
 * tokens; it just funds and authorizes the batch. One visible transaction, the
 * aggregate total public, every per-person amount hidden.
 *
 * Required env vars:
 *   SEPOLIA_RPC_URL       - RPC endpoint
 *   DEPLOYER_PRIVATE_KEY  - key of a Safe OWNER (1/1 Safe recommended for the demo)
 *   SAFE_ADDRESS          - the Safe treasury address
 *   PAYSILO_ADDRESS       - deployed PaySilo (constructed with payrollAdmin = SAFE_ADDRESS)
 *   UNDERLYING_TOKEN      - the ERC-20 the Safe pays out in
 *
 * Edit the PAYROLL array below before running.
 *
 * Usage:
 *   npm run payroll:safe
 */
const PAYROLL: { recipient: `0x${string}`; amount: bigint }[] = [
  { recipient: "0x78fa6BC0adF31c6E7F0318891C07400b29bf4102", amount: 1_500_000_000n }, // alice — 1,500 tUSDC
  { recipient: "0xd76674fA1a818622Ea2075a3BC9De0e2AA84bD52", amount: 900_000_000n },   // bob   — 900 tUSDC
  { recipient: "0x6A59beB2c06D1fcAE4C9379A6D3212406CC59D06", amount: 600_000_000n },   // audit — 600 tUSDC
];

const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const signerKey = process.env.DEPLOYER_PRIVATE_KEY;
  const safeAddress = process.env.SAFE_ADDRESS as `0x${string}` | undefined;
  const paySiloAddress = process.env.PAYSILO_ADDRESS as `0x${string}` | undefined;
  const underlyingToken = process.env.UNDERLYING_TOKEN as `0x${string}` | undefined;

  if (!rpcUrl || !signerKey) throw new Error("Set SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in .env");
  if (!safeAddress) throw new Error("Set SAFE_ADDRESS in .env");
  if (!paySiloAddress) throw new Error("Set PAYSILO_ADDRESS in .env");
  if (!underlyingToken) throw new Error("Set UNDERLYING_TOKEN in .env");
  if (PAYROLL.length === 0) throw new Error("Fill in the PAYROLL array in scripts/runPayrollViaSafe.ts first");

  // ---- 1. Sanity check: PaySilo's payrollAdmin must be the Safe ----
  const { viem } = await hre.network.connect();
  const [ownerWallet] = await viem.getWalletClients();
  const paySilo = await viem.getContractAt("PaySilo", paySiloAddress);

  const admin = (await paySilo.read.payrollAdmin()) as `0x${string}`;
  if (admin.toLowerCase() !== safeAddress.toLowerCase()) {
    throw new Error(
      `PaySilo.payrollAdmin is ${admin}, not the Safe (${safeAddress}). ` +
        `Redeploy PaySilo with PAYROLL_ADMIN=${safeAddress}.`
    );
  }

  // ---- 2. Encrypt each amount client-side against the PaySilo contract ----
  const handleClient = await createViemHandleClient(ownerWallet);

  const recipients: `0x${string}`[] = [];
  const encryptedAmounts: `0x${string}`[] = [];
  const inputProofs: `0x${string}`[] = [];
  let totalAmount = 0n;

  for (const entry of PAYROLL) {
    const { handle, handleProof } = await handleClient.encryptInput(
      entry.amount,
      "uint256",
      paySiloAddress
    );
    recipients.push(entry.recipient);
    encryptedAmounts.push(handle as `0x${string}`);
    inputProofs.push(handleProof as `0x${string}`);
    totalAmount += entry.amount;
  }

  console.log(`Encrypted ${recipients.length} payout(s). Public aggregate: ${totalAmount}`);

  // ---- 3. Build the two calls ----
  const artifact = await hre.artifacts.readArtifact("PaySilo");

  const approveData = encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [paySiloAddress, totalAmount],
  });

  const runPayrollData = encodeFunctionData({
    abi: artifact.abi,
    functionName: "runPayroll",
    args: [recipients, encryptedAmounts, inputProofs, totalAmount],
  });

  // ---- 4. Execute as ONE Safe transaction (MultiSend batches both calls) ----
  const protocolKit = await Safe.init({
    provider: rpcUrl,
    signer: signerKey,
    safeAddress,
  });

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [
      { to: underlyingToken, value: "0", data: approveData },
      { to: paySiloAddress, value: "0", data: runPayrollData },
    ],
  });

  console.log("Executing Safe transaction (approve + runPayroll batched)...");
  const result = await protocolKit.executeTransaction(safeTransaction);
  console.log("Safe transaction executed. Hash:", result.hash);
  console.log(`\nEtherscan: https://sepolia.etherscan.io/tx/${result.hash}`);
  console.log("On-chain observers see: the Safe, the total, the recipient list. Nothing else.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
