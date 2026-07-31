import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Pre-flight checks before running a payroll batch or recording the demo.
 * Verifies every link in the chain so nothing fails live:
 *   - PaySilo deployed, payrollAdmin matches SAFE_ADDRESS
 *   - PaySilo's underlying() matches UNDERLYING_TOKEN
 *   - Safe holds enough of the underlying token
 *   - Signer has Sepolia ETH for gas
 *
 * Usage:
 *   npx hardhat run scripts/checkSetup.ts --network sepolia
 */
const ERC20_MINI_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

async function main() {
  const safeAddress = process.env.SAFE_ADDRESS as `0x${string}` | undefined;
  const paySiloAddress = process.env.PAYSILO_ADDRESS as `0x${string}` | undefined;
  const underlyingToken = process.env.UNDERLYING_TOKEN as `0x${string}` | undefined;

  const { viem } = await hre.network.connect();
  const [wallet] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  let ok = true;
  const fail = (msg: string) => {
    ok = false;
    console.log("  [FAIL]", msg);
  };
  const pass = (msg: string) => console.log("  [ok]  ", msg);

  console.log("PaySilo pre-flight checks\n");

  // Gas
  const gas = await publicClient.getBalance({ address: wallet.account.address });
  if (gas === 0n) fail(`Signer ${wallet.account.address} has 0 Sepolia ETH`);
  else pass(`Signer has ${gas} wei Sepolia ETH for gas`);

  if (!paySiloAddress) {
    fail("PAYSILO_ADDRESS not set. Run deploy first.");
  } else {
    const paySilo = await viem.getContractAt("PaySilo", paySiloAddress);

    const admin = (await paySilo.read.payrollAdmin()) as `0x${string}`;
    if (!safeAddress) fail("SAFE_ADDRESS not set");
    else if (admin.toLowerCase() !== safeAddress.toLowerCase())
      fail(`payrollAdmin (${admin}) != SAFE_ADDRESS (${safeAddress}). Redeploy PaySilo.`);
    else pass(`payrollAdmin correctly set to the Safe: ${admin}`);

    const underlying = (await paySilo.read.underlying()) as `0x${string}`;
    if (!underlyingToken) fail("UNDERLYING_TOKEN not set");
    else if (underlying.toLowerCase() !== underlyingToken.toLowerCase())
      fail(`PaySilo.underlying (${underlying}) != UNDERLYING_TOKEN (${underlyingToken})`);
    else pass(`Underlying token matches: ${underlying}`);

    if (safeAddress && underlyingToken) {
      const token = { address: underlyingToken, abi: ERC20_MINI_ABI } as const;
      const [safeBalance, symbol] = await Promise.all([
        publicClient.readContract({ ...token, functionName: "balanceOf", args: [safeAddress] }),
        publicClient.readContract({ ...token, functionName: "symbol" }),
      ]);
      if (safeBalance === 0n)
        fail(`Safe holds 0 ${symbol}. Mint/transfer payroll funds to the Safe first.`);
      else pass(`Safe holds ${safeBalance} ${symbol}`);
    }
  }

  console.log(ok ? "\nAll checks passed. Clear to run payroll." : "\nFix the failures above first.");
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
