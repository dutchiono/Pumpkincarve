// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PumpkinCarvingNFT is ERC721, Ownable {
    uint256 public nextTokenId;

    // Price in ETH (0.0003 ETH = 300000000000000 wei)
    uint256 public mintPrice;

    // Payment recipient
    address public paymentRecipient;

    // Mapping from token ID to IPFS image URL
    mapping(uint256 => string) private _tokenImageUrl;
    // Mapping from token ID to whether it exists
    mapping(uint256 => bool) private _tokenExists;

    // Events
    event PumpkinCarvingMinted(
        address indexed to,
        uint256 indexed tokenId,
        string imageUrl
    );

    constructor(
        uint256 _mintPrice,
        address _paymentRecipient
    ) ERC721("Pumpkin Carving NFT", "PCNFT") Ownable(msg.sender) {
        mintPrice = _mintPrice;
        paymentRecipient = _paymentRecipient;
        nextTokenId = 1; // Start at 1 for better UX
    }

    /**
     * @dev Mint a new pumpkin carving NFT with IPFS image URL
     * @param imageUrl IPFS URL to the pumpkin image
     */
    function mint(string memory imageUrl) public payable {
        // Check payment amount
        require(msg.value == mintPrice, "Incorrect payment amount");

        // Send payment to recipient
        (bool success, ) = paymentRecipient.call{value: msg.value}("");
        require(success, "Payment transfer failed");

        uint256 tokenId = nextTokenId;
        nextTokenId++;

        _mint(msg.sender, tokenId);

        // Store IPFS image URL and mark as existing
        _tokenImageUrl[tokenId] = imageUrl;
        _tokenExists[tokenId] = true;

        emit PumpkinCarvingMinted(msg.sender, tokenId, imageUrl);
    }

    /**
     * @dev Get token URI with metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_tokenExists[tokenId], "Token does not exist");

        string memory imageUrl = _tokenImageUrl[tokenId];

        // Return JSON metadata
        return string(abi.encodePacked(
            '{"name":"Pumpkin Carving #',
            _toString(tokenId),
            '","description":"AI-generated pumpkin carving NFT from your Farcaster posts","image":"',
            imageUrl,
            '","attributes":[{"trait_type":"Type","value":"Pumpkin Carving"},{"trait_type":"Token ID","value":',
            _toString(tokenId),
            '}]}'
        ));
    }

    /**
     * @dev Get total supply
     */
    function totalSupply() external view returns (uint256) {
        return nextTokenId - 1;
    }

    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Update mint price (owner only)
     */
    function setMintPrice(uint256 _newPrice) external onlyOwner {
        mintPrice = _newPrice;
    }

    /**
     * @dev Update payment recipient (owner only)
     */
    function setPaymentRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid address");
        paymentRecipient = _newRecipient;
    }
}

