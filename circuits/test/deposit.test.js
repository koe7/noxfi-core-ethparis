const { assert } = require("chai");
const wasm_tester = require("circom_tester").wasm;

describe("Deposit circuit", function () {
  let depositCircuit;

  before(async function () {
    depositCircuit = await wasm_tester("deposit/deposit.circom");
  });

  it("Should generate the witness successfully", async function () {
    let input = {
      salt: 0x0123456789,
      amount: 10000,
      asset: 1,
     };
    const witness = await depositCircuit.calculateWitness(input);
    await depositCircuit.assertOut(witness, {});
  });
});

