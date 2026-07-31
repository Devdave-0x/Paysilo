import { defineConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import noxPlugin from "@iexec-nox/nox-hardhat-plugin";
import * as dotenv from "dotenv";

dotenv.config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY ?? "";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, noxPlugin],
  solidity: "0.8.35",
  verify: {
    etherscan: { apiKey: ETHERSCAN_API_KEY },
  },
  networks: {
    // Local network used by @iexec-nox/nox-hardhat-plugin during `hardhat test`.
    // It boots the full Nox offchain stack (KMS, ingestor, runner, handle gateway)
    // via Docker Compose and injects NoxCompute at the well-known local address.
    default: {
      type: "edr-simulated",
      chainType: "op",
      allowUnlimitedContractSize: true,
    },
    // Required deployment target per the hackathon rules. NoxCompute is already
    // live on Sepolia at 0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF, resolved
    // automatically by the Nox.sol library based on chain ID, no config needed here.
    sepolia: {
      type: "http",
      chainType: "l1",
      url: SEPOLIA_RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
});
