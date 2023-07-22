const { assert } = require("chai");
const wasm_tester = require("circom_tester").wasm;

describe("Withdraw circuit", function () {
  let withdrawCircuit;

  before(async function () {
    withdrawCircuit = await wasm_tester("withdraw/withdraw.circom");
  });

  it("Should generate the witness successfully", async function () {
    let input = {
      salt: 0x0123456789,
      amount: 10000,
      asset: 1,
     };
    const witness = await withdrawCircuit.calculateWitness(input);
    await withdrawCircuit.assertOut(witness, {});
  });
});

