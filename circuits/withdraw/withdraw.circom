pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

// Z = h(amount|asset|salt)
// N = h(amount|asset|salt+1)

// Need to xorAll = xorExceptZ ^ h(amount|asset|salt) for proving existence of Z in NoxFi contract
// But skip it here :P

template Withdraw() {
  signal input salt;
  // signal input xorExceptZ;
  signal input amount;
  signal input asset;
  // signal input xorAll
  signal output n;

  var i;

  // z = sha256(salt|amount|asset)
  // xorAll === z ^ xorExceptZ

  component n2bSalt = Num2Bits(256);
  n2bSalt.in <== salt+1;

  component n2bAmount = Num2Bits(256);
  n2bAmount.in <== amount;

  component n2bAsset = Num2Bits(1);
  n2bAsset.in <== asset;

  component sha256 = Sha256(513);
  for (i=0; i<256; i++) {
    sha256.in[i] <== n2bSalt.out[i];
  }

  for (i=0; i<256; i++) {
    sha256.in[i+256] <== n2bAmount.out[i];
  }

  sha256.in[512] <== n2bAsset.out[0];

  component b2n = Bits2Num(256);
  for (i=0; i < 256; i++) {
    b2n.in[i] <== sha256.out[255-i];
  }

  n <== b2n.out;
}

component main {public [amount, asset]} = Withdraw();
