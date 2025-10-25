const { ethers } = require("ethers");

const address = "0xEC4bc7451B9058D42Ea159464C6dA14a322946fD";

async function checkBalance() {
  try {
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);

    console.log("\n📊 Wallet Balance Check\n");
    console.log("Address:", address);
    console.log("Balance:", balanceInEth, "ETH");
    console.log("\n✅ Ready to deploy!" );

  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkBalance();
