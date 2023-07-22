const { expect } = require("chai");
const { ethers } = require("hardhat");
const { exportCallDataGroth16 } = require("./utils/utils");

describe("NoxFi", function () {
  let depositVerifier, withdrawVerifier, orderVerifier, noxFi, weth, dai;
  let signer, signer1, signer2;

  before(async function () {
    [signer, signer1, signer2] = await ethers.getSigners();

    depositVerifier = await ethers.deployContract("DepositVerifier", []);
    await depositVerifier.waitForDeployment();
    const depositVerifierAddr = await depositVerifier.getAddress();

    withdrawVerifier = await ethers.deployContract("WithdrawVerifier", []);
    await withdrawVerifier.waitForDeployment();
    const withdrawVerifierAddr = await withdrawVerifier.getAddress();

    orderVerifier = await ethers.deployContract("OrderVerifier", []);
    await orderVerifier.waitForDeployment();
    const orderVerifierAddr = await orderVerifier.getAddress();

    weth = await ethers.deployContract("Token", ["WETH", "WETH"]);
    await weth.waitForDeployment();
    const wethAddr = await weth.getAddress();

    dai = await ethers.deployContract("Token", ["DAI", "DAI"]);
    await dai.waitForDeployment();
    const daiAddr = await dai.getAddress();

    noxFi = await ethers.deployContract("NoxFi", [wethAddr, daiAddr, signer.address, depositVerifierAddr, withdrawVerifierAddr, orderVerifierAddr]);
    await noxFi.waitForDeployment();
    const noxFiAddr = await noxFi.getAddress();

    await weth.approve(noxFiAddr, BigInt(1e24));
    await dai.approve(noxFiAddr, BigInt(1e24));
  });

  /* Note: these test iterations run sequentially and the state is remained */

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

  it("Deposit Scenario", async function () {
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

  it("Withdraw Scenario", async function () {
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
      "./zkproof/withdraw.wasm",
      "./zkproof/withdraw_final.zkey"
    );

    let balance = await weth.balanceOf(await noxFi.getAddress());
    expect(balance).to.not.equal(0);

    await noxFi.withdraw(
      dataResult.a,
      dataResult.b,
      dataResult.c,
      dataResult.Input
    );
    balance = await weth.balanceOf(await noxFi.getAddress());
    expect(balance).to.equal(0);
  });
  it("Deposit and Order Scenario", async function () {
    const salt = 1234567890;
    const amount = 5;
    const asset = 1;

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
    const balance = await dai.balanceOf(await noxFi.getAddress());
    expect(balance).to.not.equal(0);

    const orderInput = {
      salt: salt,
      amount: amount,
      asset: asset,
      price: 1800,
    };

    let orderDataResult = await exportCallDataGroth16(
      orderInput,
      "./zkproof/order.wasm",
      "./zkproof/order_final.zkey"
    );

    await noxFi.order(
      orderDataResult.a,
      orderDataResult.b,
      orderDataResult.c,
      orderDataResult.Input
    );

    let withdrawDataResult = await exportCallDataGroth16(
      input,
      "./zkproof/withdraw.wasm",
      "./zkproof/withdraw_final.zkey"
    );

    await expect(noxFi.withdraw(
      dataResult.a,
      dataResult.b,
      dataResult.c,
      dataResult.Input
    )).to.be.reverted;
  });
});

