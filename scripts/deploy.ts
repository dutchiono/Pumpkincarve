import { ethers } from "hardhat";

async function main() {
  console.log("Deploying PumpkinCarvingNFT contract...");

  const PumpkinCarvingNFT = await ethers.getContractFactory("PumpkinCarvingNFT");
  const pumpkinNFT = await PumpkinCarvingNFT.deploy();

  await pumpkinNFT.waitForDeployment();

  const address = await pumpkinNFT.getAddress();
  console.log("PumpkinCarvingNFT deployed to:", address);

  console.log("Contract verification command:");
  console.log(`npx hardhat verify --network base ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

