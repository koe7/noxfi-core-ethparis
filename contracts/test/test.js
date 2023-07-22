const { expect } = require("chai");
const { ethers } = require("hardhat");
const { exportCallDataGroth16 } = require("./utils/utils");

describe("NoxFi", function () {
  let depositVerifier, noxFi, weth, dai;

  before(async function () {
    depositVerifier = await ethers.deployContract("Groth16Verifier", []);
    await depositVerifier.waitForDeployment();
    const verifierAddr = await depositVerifier.getAddress();

    weth = await ethers.deployContract("Token", ["WETH", "WETH"]);
    await weth.waitForDeployment();
    const wethAddr = await weth.getAddress();
    dai = await ethers.deployContract("Token", ["DAI", "DAI"]);
    await dai.waitForDeployment();
    const daiAddr = await dai.getAddress();

    noxFi = await ethers.deployContract("NoxFi", [wethAddr, daiAddr, verifierAddr]);
    await noxFi.waitForDeployment();
    const noxFiAddr = await noxFi.getAddress();

    await weth.approve(noxFiAddr, BigInt(1e24));
    await dai.approve(noxFiAddr, BigInt(1e24));
  });

  it("Should return true for valid proof on-chain", async function () {
    const salt = 1234567;
    const amount = 10;
    const asset = 0;

    const input = {
      salt: salt,
      amount: amount,
      asset: asset,
    };

    let dataResult = await exportCallDataGroth16(
      input,
      "./zkproof/deposit.wasm",
      "./zkproof/deposit_final.zkey"
    );

    let result = await depositVerifier.verifyProof(
      dataResult.a,
      dataResult.b,
      dataResult.c,
      dataResult.Input
    );
    expect(result).to.equal(true);
  });

  it("Should return true for valid proof on-chain", async function () {
    const salt = 1234567;
    const amount = 10;
    const asset = 0;

    const input = {
      salt: salt,
      amount: amount,
      asset: asset,
    };

    let dataResult = await exportCallDataGroth16(
      input,
      "./zkproof/deposit.wasm",
      "./zkproof/deposit_final.zkey"
    );

    let result = await noxFi.deposit(
      dataResult.a,
      dataResult.b,
      dataResult.c,
      dataResult.Input
    );
    const balance = await weth.balanceOf(await noxFi.getAddress());
    expect(balance).to.not.equal(0);
  });
});

