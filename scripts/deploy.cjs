const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Based Pumpkins 2025 contract...");

  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "No signers found. Make sure you have PRIVATE_KEY set in your .env file.\n" +
      "Example: PRIVATE_KEY=0x..."
    );
  }

  const deployer = signers[0];
  console.log("Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    throw new Error("Deployer account has no funds. Please add Base Sepolia ETH to this address.");
  }

  // 0.0003 ETH mint price
  const MINT_PRICE = ethers.parseEther("0.0003");

  // Payments go to this wallet
  const PAYMENT_RECIPIENT = "0x8DFBdEEC8c5d4970BB5F481C6ec7f73fa1C65be5";

  const PumpkinCarvingNFT = await ethers.getContractFactory("PumpkinCarvingNFT");
  const pumpkinNFT = await PumpkinCarvingNFT.deploy(MINT_PRICE, PAYMENT_RECIPIENT);

  await pumpkinNFT.waitForDeployment();

  const address = await pumpkinNFT.getAddress();
  console.log("Based Pumpkins 2025 deployed to:", address);

  // Detect network from provider
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 84532n ? 'base-sepolia' : 'base';

  console.log("\nContract verification command:");
  console.log(`npx hardhat verify --network ${networkName} ${address} ${MINT_PRICE} ${PAYMENT_RECIPIENT}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
