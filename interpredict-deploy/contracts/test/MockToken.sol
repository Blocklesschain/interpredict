// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Test Interlink", "tITL") {}
    function mint(address account, uint256 amount) external { _mint(account, amount); }
}

/// @dev Lets the test suite model an ERC-20 that temporarily refuses an
/// outbound refund. Minting is deliberately unaffected so test setup remains
/// possible while a recipient is blocked.
contract MockFailingToken is ERC20 {
    error BlockedRecipient(address recipient);

    mapping(address => bool) public blockedRecipient;

    constructor() ERC20("Failing Test Interlink", "ftITL") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function setBlockedRecipient(address account, bool blocked) external {
        blockedRecipient[account] = blocked;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && blockedRecipient[to]) revert BlockedRecipient(to);
        super._update(from, to, value);
    }
}

contract MockTokenWithDecimals is ERC20 {
    uint8 private immutable _tokenDecimals;

    constructor(uint8 decimals_) ERC20("Decimal Test Interlink", "dtITL") {
        _tokenDecimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}

/// @dev Burns 1% on every non-mint transfer. The protocol intentionally does
/// not support this token model; the audit test demonstrates why the settlement
/// token must be a conventional, non-deflationary ERC-20.
contract MockFeeOnTransferToken is ERC20 {
    uint256 public constant FEE_BPS = 100;

    constructor() ERC20("Fee Test Interlink", "feeITL") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = Math.mulDiv(value, FEE_BPS, 10_000);
            super._update(from, to, value - fee);
            if (fee > 0) {
                super._update(from, address(0), fee);
            }
            return;
        }
        super._update(from, to, value);
    }
}

/// @dev Returns success without moving balances on non-mint transfers.
contract MockNoTransferToken is ERC20 {
    constructor() ERC20("No Transfer Test Interlink", "noopITL") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0)) super._update(from, to, value);
    }
}

/// @dev Can be switched from exact ERC-20 behavior to a 1% recipient tax after
/// protocol liabilities have been created, exercising exact outbound checks.
contract MockToggleFeeToken is ERC20 {
    bool public feeEnabled;

    constructor() ERC20("Toggle Fee Test Interlink", "toggleITL") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function setFeeEnabled(bool enabled) external {
        feeEnabled = enabled;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (feeEnabled && from != address(0) && to != address(0)) {
            uint256 fee = Math.mulDiv(value, 100, 10_000);
            super._update(from, to, value - fee);
            if (fee != 0) super._update(from, address(0), fee);
        } else {
            super._update(from, to, value);
        }
    }
}
