//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[3] memory input
    ) external view returns (bool);
}

contract NoxFi {
    address public WETHAddr;
    address public DAIAddr;
    address public depositVerifierAddr;
    address public withdrawVerifierAddr;
    uint[] public zArr;
    uint[] public nArr;
    // root is calculated by xor of all Zs.
    // Used for existence of Z
    // But skip it in this hackathon :P
    // uint root;

    constructor(address _WETHAddr, address _DAIAddr, address _depositVerifierAddr, address _withdrawVerifierAddr) {
        WETHAddr = _WETHAddr;
        DAIAddr = _DAIAddr;
        depositVerifierAddr = _depositVerifierAddr;
        withdrawVerifierAddr = _withdrawVerifierAddr;
    }

    function verifyDepositProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) public view returns (bool) {
        return IVerifier(depositVerifierAddr).verifyProof(a, b, c, input);
    }

    function verifyWithdrawProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) public view returns (bool) {
        return IVerifier(withdrawVerifierAddr).verifyProof(a, b, c, input);
    }

    function deposit(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external returns (bool) {
        require(verifyDepositProof(a, b, c, input), "Filed proof check");
        for (uint i = 0; i < zArr.length; ++i) {
            require(zArr[i] != input[0], "The commit Z already exists");
        }
        IERC20(input[2] == 0 ? WETHAddr : DAIAddr).transferFrom(msg.sender, address(this), input[1] * 10 ** 18);
        zArr.push(input[0]);
        return true;
    }

    function withdraw(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external returns (bool) {
        require(verifyWithdrawProof(a, b, c, input), "Filed proof check");
        for (uint i = 0; i < nArr.length; ++i) {
            require(nArr[i] != input[0], "The nullifier N already exists");
        }
        IERC20(input[2] == 0 ? WETHAddr : DAIAddr).transfer(msg.sender, input[1] * 10 ** 18);
        nArr.push(input[0]);
        return true;
    }
}

