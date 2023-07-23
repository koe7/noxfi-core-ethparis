const { expect } = require("chai");
const { ethers } = require("hardhat");
const { exportCallDataGroth16 } = require("./utils/utils");

describe("NoxFi", function () {
  let depositVerifier, withdrawVerifier, orderVerifier, settleVerifier, cancelVerifier;
  let noxFi, weth, dai;
  let signer, signer1, signer2, signer11, signer21;

  before(async function () {
    [signer, signer1, signer2, signer11, signer21] = await ethers.getSigners();

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

    dai = await ethers.deployContract("Token", ["DAI", "DAI"]);
    await dai.waitForDeployment();
    const daiAddr = await dai.getAddress();

    noxFi = await ethers.deployContract("NoxFi", [wethAddr, daiAddr, signer.address, depositVerifierAddr, withdrawVerifierAddr, orderVerifierAddr, settleVerifierAddr, cancelVerifierAddr]);
    await noxFi.waitForDeployment();
    const noxFiAddr = await noxFi.getAddress();

    await weth.approve(noxFiAddr, BigInt(1e30));
    await dai.approve(noxFiAddr, BigInt(1e30));

    await weth.transfer(signer1.address, BigInt(1e25));
    await dai.transfer(signer2.address, BigInt(1e25));

    await weth.connect(signer1).approve(noxFiAddr, BigInt(1e30));
    await dai.connect(signer2).approve(noxFiAddr, BigInt(1e30));
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

  it("Deposit and Order, Matched and Claim. lastly Withdraw. Scenario", async function () {
    const input1 = {
      salt: 1234,
      amount: 10,
      asset: 0,
    };

    let dataResult1 = await exportCallDataGroth16(
      input1,
      "./zkproof/deposit.wasm",
      "./zkproof/deposit_final.zkey"
    );

    await expect(noxFi.connect(signer1).deposit(
      dataResult1.a,
      dataResult1.b,
      dataResult1.c,
      dataResult1.Input
    )).to.changeTokenBalances(weth, [signer1, noxFi], [BigInt(-1e19), BigInt(1e19)]);

    const input2 = {
      salt: 5678,
      amount: 18500,
      asset: 1,
    };

    let dataResult2 = await exportCallDataGroth16(
      input2,
      "./zkproof/deposit.wasm",
      "./zkproof/deposit_final.zkey"
    );

    await expect(noxFi.connect(signer2).deposit(
      dataResult2.a,
      dataResult2.b,
      dataResult2.c,
      dataResult2.Input
    )).to.changeTokenBalances(dai, [signer2, noxFi], [BigInt(-18500) * BigInt(1e18), BigInt(18500) * BigInt(1e18)]);

    const orderInput1 = {
      salt: 1234,
      amount: 10,
      asset: 0,
      price: 1800,
    };

    let orderDataResult1 = await exportCallDataGroth16(
      orderInput1,
      "./zkproof/order.wasm",
      "./zkproof/order_final.zkey"
    );

    await noxFi.connect(signer11).order(
      orderDataResult1.a,
      orderDataResult1.b,
      orderDataResult1.c,
      orderDataResult1.Input
    );

    const orderInput2 = {
      salt: 5678,
      amount: 18500,
      asset: 1,
      price: 1900,
    };

    let orderDataResult2 = await exportCallDataGroth16(
      orderInput2,
      "./zkproof/order.wasm",
      "./zkproof/order_final.zkey"
    );

    await noxFi.connect(signer21).order(
      orderDataResult2.a,
      orderDataResult2.b,
      orderDataResult2.c,
      orderDataResult2.Input
    );

    await noxFi.matchOrder(0, true);
    await noxFi.matchOrder(1, true);
    await noxFi.setSettlementPrice(1850);

    const settleInput = {
      salt: 1234,
      amount: 10,
      asset: 0,
      price: 1800,
      newsalt: 12345,
      settlementprice: 1850,
    };

    let settleDataResult = await exportCallDataGroth16(
      settleInput,
      "./zkproof/settle.wasm",
      "./zkproof/settle_final.zkey"
    );

    await noxFi.connect(signer21).settle(
      settleDataResult.a,
      settleDataResult.b,
      settleDataResult.c,
      settleDataResult.Input
    );

    const withdrawInput = {
      salt: 12345,
      amount: 18500,
      asset: 0,
    };

    let withdrawDataResult = await exportCallDataGroth16(
      withdrawInput,
      "./zkproof/withdraw.wasm",
      "./zkproof/withdraw_final.zkey"
    );
    console.log(await weth.balanceOf(noxFi));
    console.log(await dai.balanceOf(noxFi));

    // TODO : exceeds balance amount ... why ?
    await expect(noxFi.connect(signer1).withdraw(
      withdrawDataResult.a,
      withdrawDataResult.b,
      withdrawDataResult.c,
      withdrawDataResult.Input,
    )).to.changeTokenBalances(dai, [signer1, noxFi], [BigInt(185) * BigInt(1e20), BigInt(-185) * BigInt(1e20)]);
  });
});

