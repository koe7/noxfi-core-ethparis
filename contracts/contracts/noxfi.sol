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

interface IOrderVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[2] memory input
    ) external view returns (bool);
}

interface ISettleVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) external view returns (bool);
}

contract NoxFi {
    address public WETHAddr;
    address public DAIAddr;
    address public matcherAddr;
    address public depositVerifierAddr;
    address public withdrawVerifierAddr;
    address public orderVerifierAddr;
    address public settleVerifierAddr;
    address public cancelVerifierAddr;
    uint[] public zArr;
    uint[] public nArr;
    uint[] public oArr;
    uint[] public mArr; // matched
    uint[] public cArr; // canceled
    uint[] public onArr;
    uint public settlementPrice;
    // root is calculated by xor of all Zs.
    // Used for existence of Z
    // But skip it in this hackathon :P
    // uint root;

    constructor(address _WETHAddr, address _DAIAddr, address _matcherAddr, address _depositVerifierAddr, address _withdrawVerifierAddr, address _orderVerifierAddr, address _settleVerifierAddr, address _cancelVerifierAddr) {
        WETHAddr = _WETHAddr;
        DAIAddr = _DAIAddr;
        matcherAddr = _matcherAddr;
        depositVerifierAddr = _depositVerifierAddr;
        withdrawVerifierAddr = _withdrawVerifierAddr;
        orderVerifierAddr = _orderVerifierAddr;
        settleVerifierAddr = _settleVerifierAddr;
        cancelVerifierAddr = _cancelVerifierAddr;
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

    function verifyOrderProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) public view returns (bool) {
        return IOrderVerifier(orderVerifierAddr).verifyProof(a, b, c, input);
    }

    function verifySettleProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input
    ) public view returns (bool) {
        return ISettleVerifier(settleVerifierAddr).verifyProof(a, b, c, input);
    }

    function verifyCancelProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) public view returns (bool) {
        return IVerifier(cancelVerifierAddr).verifyProof(a, b, c, input);
    }

    function deposit(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external {
        require(verifyDepositProof(a, b, c, input), "Filed proof check");
        for (uint i = 0; i < zArr.length; ++i) {
            require(zArr[i] != input[0], "The commit Z already exists");
        }
        IERC20(input[2] == 0 ? WETHAddr : DAIAddr).transferFrom(msg.sender, address(this), input[1] * 10 ** 18);
        zArr.push(input[0]);
    }

    // TODO : CHECK
    function withdraw(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external {
        require(verifyWithdrawProof(a, b, c, input), "Filed proof check");
        for (uint i = 0; i < nArr.length; ++i) {
            require(nArr[i] != input[0], "The nullifier N already exists");
        }
        IERC20(input[2] == 0 ? WETHAddr : DAIAddr).transfer(msg.sender, input[1] * 10 ** 18);
        nArr.push(input[0]);
    }

    function order(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[2] memory input
    ) external {
        require(verifyOrderProof(a, b, c, input), "Filed proof check");
        for (uint i = 0; i < nArr.length; ++i) {
            require(nArr[i] != input[0], "The nullifier N already exists");
        }
        // don't need to check the existence of O
        nArr.push(input[0]);
        oArr.push(input[1]);
    }

    function matchOrder(uint oidx, bool isMatched) external {
      require(msg.sender == matcherAddr, "Only Matcher can make a match");
      bool exists = false;
      for (uint i = 0; i < oArr.length; ++i) {
        if (oArr[i] == oArr[oidx]) {
          exists = true;
          break;
        }
      }
      require(exists, "The O doesn't exist");
      for (uint i = 0; i < mArr.length; ++i) { require(mArr[i] != oArr[oidx], "The O already matched"); }
      for (uint i = 0; i < cArr.length; ++i) {
        require(cArr[i] != oArr[oidx], "The O already canceled");
      }
      if(isMatched) {
        mArr.push(oArr[oidx]);
      } else {
        cArr.push(oArr[oidx]);
      }
    }

    function setSettlementPrice(uint price) external {
      require(msg.sender == matcherAddr, "Only Matcher can set settlement price");
      settlementPrice = price;
    }

    function settle(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[4] memory input
    ) external {
      require(verifySettleProof(a, b, c, input), "Filed proof check");
      require(input[3] == settlementPrice, "Wrong settlement price");
      bool isMatched;
      for (uint i = 0; i < mArr.length; ++i) {
        if (mArr[i] == input[0]) {
          isMatched = true;
          break;
        }
      }
      require(isMatched, "The order have never been matched");
      for (uint i = 0; i < onArr.length; ++i) {
        require(onArr[i] != input[1], "The ON already exists");
      }
      onArr.push(input[1]);
      zArr.push(input[2]);
    }

    function cancel(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external {
      require(verifyCancelProof(a, b, c, input), "Filed proof check");
      bool isCanceled;
      for (uint i = 0; i < cArr.length; ++i) {
        if (cArr[i] == input[0]) {
          isCanceled = true;
          break;
        }
      }
      require(isCanceled, "The order have never been canceled");
      for (uint i = 0; i < onArr.length; ++i) {
        require(onArr[i] != input[1], "The ON already exists");
      }
      onArr.push(input[1]);
      zArr.push(input[2]);
    }
}

