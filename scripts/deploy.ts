import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Based Pumpkins 2025 contract...");

  // 0.0003 ETH in wei
  const mintPrice = ethers.parseEther("0.0003");

  // Payment recipient address
  const paymentRecipient = "0x8DFBdEEC8c5d4970BB5F481C6ec7f73fa1C65be5";

  const PumpkinCarvingNFT = await ethers.getContractFactory("PumpkinCarvingNFT");
  const pumpkinNFT = await PumpkinCarvingNFT.deploy(mintPrice, paymentRecipient);

  await pumpkinNFT.waitForDeployment();

  const address = await pumpkinNFT.getAddress();
  console.log("Based Pumpkins 2025 deployed to:", address);

  console.log("Contract verification command:");
  console.log(`npx hardhat verify --network base ${address} ${mintPrice} ${paymentRecipient}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

