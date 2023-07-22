//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.15;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IDepositVerifier {
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
    uint[] public zArr;

    constructor(address _WETHAddr, address _DAIAddr, address _depositVerifierAddr) {
        WETHAddr = _WETHAddr;
        DAIAddr = _DAIAddr;
        depositVerifierAddr = _depositVerifierAddr;
    }

    function verifyDepositProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) public view returns (bool) {
        return IDepositVerifier(depositVerifierAddr).verifyProof(a, b, c, input);
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
}

