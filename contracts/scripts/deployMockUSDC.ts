import hre from "hardhat";

/**
 * Deploys MockUSDC and mints an initial supply to the deployer, so you have
 * something real to approve and pay out through PaySilo. Run this before
 * deploy.ts if you don't already have a Sepolia test token to point at.
 *
 * Usage:
 *   npx hardhat run scripts/deployMockUSDC.ts --network sepolia
 */
async function main() {
  const { viem } = await hre.network.connect();
  const [deployer] = await viem.getWalletClients();

  const mockUSDC = await viem.deployContract("MockUSDC");
  console.log("MockUSDC deployed at:", mockUSDC.address);

  const mintAmount = 1_000_000n * 10n ** 6n; // 1,000,000 tUSDC
  const hash = await mockUSDC.write.mint([deployer.account.address, mintAmount]);
  console.log("Minted 1,000,000 tUSDC to deployer, tx:", hash);
  console.log("\nSet UNDERLYING_TOKEN in .env to:", mockUSDC.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
