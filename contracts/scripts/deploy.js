// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log(await ethers.provider.getBlockNumber());
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());


  let depositVerifier, withdrawVerifier, orderVerifier, settleVerifier, cancelVerifier;
  let noxFi, weth, dai;
  let signer, signer1, signer2, signer11, signer21;

  depositVerifier = await ethers.deployContract("DepositVerifier", []);
  await depositVerifier.waitForDeployment();
  const depositVerifierAddr = await depositVerifier.getAddress();

  withdrawVerifier = await ethers.deployContract("WithdrawVerifier", []);
  await withdrawVerifier.waitForDeployment();
  const withdrawVerifierAddr = await withdrawVerifier.getAddress();

  orderVerifier = await ethers.deployContract("OrderVerifier", []);
  await orderVerifier.waitForDeployment();
  const orderVerifierAddr = await orderVerifier.getAddress();

  settleVerifier = await ethers.deployContract("SettleVerifier", []);
  await settleVerifier.waitForDeployment();
  const settleVerifierAddr = await settleVerifier.getAddress();

  cancelVerifier = await ethers.deployContract("CancelVerifier", []);
  await cancelVerifier.waitForDeployment();
  const cancelVerifierAddr = await cancelVerifier.getAddress();

  weth = await ethers.deployContract("Token", ["WETH", "WETH"]);
  await weth.waitForDeployment();
  const wethAddr = await weth.getAddress();
  console.log(wethAddr, "WETH");

  dai = await ethers.deployContract("Token", ["DAI", "DAI"]);
  await dai.waitForDeployment();
  const daiAddr = await dai.getAddress();
  console.log(daiAddr, "DAI");

  noxFi = await ethers.deployContract("NoxFi", [wethAddr, daiAddr, '0xD5D56F27A592F2E9A008647eeAa390cc353dfc36', depositVerifierAddr, withdrawVerifierAddr, orderVerifierAddr, settleVerifierAddr, cancelVerifierAddr]);
  await noxFi.waitForDeployment();
  const noxFiAddr = await noxFi.getAddress();
  console.log(noxFiAddr, "NoxFi");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

