// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC4906.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract Gen2 is Initializable, ERC721Upgradeable, OwnableUpgradeable, UUPSUpgradeable, IERC4906, ReentrancyGuardUpgradeable {
    // Storage variables - MUST NOT CHANGE ORDER for upgrade compatibility
    uint256 public nextTokenId;
    uint256 public mintPrice;
    address public paymentRecipient;

    // Mapping from token ID to IPFS image URL
    mapping(uint256 => string) private _tokenImageUrl;
    // Mapping from token ID to whether it exists
    mapping(uint256 => bool) private _tokenExists;
    // Mapping from token ID to full metadata JSON (with traits, attributes, etc.)
    mapping(uint256 => string) private _tokenMetadata;

    // EIP-7401 Composable NFTs: Parent/Child relationships
    mapping(uint256 => uint256[]) private _children; // parentId => childIds
    mapping(uint256 => uint256) private _parent; // childId => parentId
    mapping(uint256 => mapping(uint256 => uint256)) private _childIndex; // parentId => childId => index in parent's children array

    // Living NFT state: Energy/levels that evolve NFTs
    mapping(uint256 => uint256) public energy; // tokenId => energy level
    mapping(uint256 => uint256) public lastActionTime; // tokenId => timestamp

    // Cousin relationship data
    struct Edge {
        uint256 weight;
        uint256 createdAt;
        uint256 lastUpdated;
        bytes32 relationType;
    }

    struct RelationUpdate {
        uint256 a;
        uint256 b;
        bytes32 relationType;
        int256 delta;
    }

    // Adjacency existence set (helps enumeration)
    using EnumerableSet for EnumerableSet.UintSet;
    mapping(uint256 => EnumerableSet.UintSet) private _neighbors;
    mapping(uint256 => mapping(uint256 => Edge)) private _edgeData;

    // Relayer control
    mapping(address => bool) public isRelayer;

    // Events
    event RelationAdded(uint256 indexed a, uint256 indexed b, bytes32 relationType, uint256 weight);
    event RelationRemoved(uint256 indexed a, uint256 indexed b, bytes32 relationType);

    // Events
    event Gen2Minted(
        address indexed to,
        uint256 indexed tokenId,
        string imageUrl
    );

    // Composable NFT events
    event ChildAttached(uint256 indexed parentId, uint256 indexed childId);
    event ChildDetached(uint256 indexed parentId, uint256 indexed childId);

    // Living NFT action events
    event ActionPerformed(uint256 indexed tokenId, uint256 newEnergy);

    // Prevent direct initialization
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract (called by proxy)
     * @param _mintPrice Initial mint price in wei
     * @param _paymentRecipient Address to receive payments
     */
    function initialize(
        uint256 _mintPrice,
        address _paymentRecipient
    ) public initializer {
        __ERC721_init("Gen2", "G2");
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        mintPrice = _mintPrice;
        paymentRecipient = _paymentRecipient;
        nextTokenId = 1;
    }

    /**
     * @dev Mint a new pumpkin NFT with full metadata JSON
     * @param imageUrl IPFS URL to the pumpkin image
     * @param metadataJSON Full JSON metadata with traits and attributes
     */
    function mint(string memory imageUrl, string memory metadataJSON) public payable {
        // Check payment amount
        require(msg.value == mintPrice, "Incorrect payment amount");

        // Send payment to recipient
        (bool success, ) = paymentRecipient.call{value: msg.value}("");
        require(success, "Payment transfer failed");

        uint256 tokenId = nextTokenId;
        nextTokenId++;

        _mint(msg.sender, tokenId);

        // Store IPFS image URL, metadata, and mark as existing
        _tokenImageUrl[tokenId] = imageUrl;
        _tokenMetadata[tokenId] = metadataJSON;
        _tokenExists[tokenId] = true;

        emit Gen2Minted(msg.sender, tokenId, imageUrl);
    }

    /**
     * @dev Mint with just image URL (backward compatible, generates basic metadata)
     */
    function mint(string memory imageUrl) public payable {
        // Auto-generate basic metadata
        uint256 tokenId = nextTokenId;
        string memory metadata = string(abi.encodePacked(
            '{"name":"Gen2 #',
            _toString(tokenId),
            '","description":"AI-generated NFT Generation 2","image":"',
            imageUrl,
            '","attributes":[{"trait_type":"Type","value":"Gen2"},{"trait_type":"Token ID","value":',
            _toString(tokenId),
            '}]}'
        ));

        mint(imageUrl, metadata);
    }

    /**
     * @dev Get token URI with metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_tokenExists[tokenId], "Token does not exist");

        // Return stored metadata if available, otherwise generate basic
        string memory metadata = _tokenMetadata[tokenId];
        if (bytes(metadata).length > 0) {
            return metadata;
        }

        // Fallback: generate basic metadata
        string memory imageUrl = _tokenImageUrl[tokenId];
        return string(abi.encodePacked(
            '{"name":"Gen2 #',
            _toString(tokenId),
            '","description":"AI-generated NFT Generation 2","image":"',
            imageUrl,
            '","attributes":[{"trait_type":"Type","value":"Gen2"},{"trait_type":"Token ID","value":',
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

    /**
     * @dev Add new feature - whitelist functionality (example of adding features)
     * This can be added in future upgrades
     */
    mapping(address => bool) public whitelisted;

    function addToWhitelist(address _user) external onlyOwner {
        whitelisted[_user] = true;
    }

    function removeFromWhitelist(address _user) external onlyOwner {
        whitelisted[_user] = false;
    }

    /**
     * @dev EIP-7401: Attach a child NFT to a parent
     * @param parentId The parent NFT token ID
     * @param childId The child NFT token ID to attach
     */
    function attachChild(uint256 parentId, uint256 childId) external {
        require(_tokenExists[parentId], "Parent doesn't exist");
        require(_tokenExists[childId], "Child doesn't exist");
        require(ownerOf(parentId) == msg.sender, "Not parent owner");
        require(ownerOf(childId) == msg.sender, "Not child owner");
        require(_parent[childId] == 0, "Child already attached");
        require(parentId != childId, "Cannot attach to self");

        // Attach the child
        _children[parentId].push(childId);
        _parent[childId] = parentId;
        _childIndex[parentId][childId] = _children[parentId].length;

        // Emit composable event
        emit ChildAttached(parentId, childId);

        // Emit metadata update so the parent's appearance can update
        emit MetadataUpdate(parentId);
    }

    /**
     * @dev EIP-7401: Detach a child NFT from a parent
     * @param parentId The parent NFT token ID
     * @param childId The child NFT token ID to detach
     */
    function detachChild(uint256 parentId, uint256 childId) external {
        require(ownerOf(parentId) == msg.sender, "Not parent owner");
        require(_parent[childId] == parentId, "Child not attached to this parent");
        require(_childIndex[parentId][childId] != 0, "Child not found");

        // Find and remove from array
        uint256 index = _childIndex[parentId][childId] - 1;
        uint256 lastIndex = _children[parentId].length - 1;

        if (index != lastIndex) {
            uint256 lastChildId = _children[parentId][lastIndex];
            _children[parentId][index] = lastChildId;
            _childIndex[parentId][lastChildId] = index + 1;
        }

        _children[parentId].pop();
        delete _parent[childId];
        delete _childIndex[parentId][childId];

        // Emit composable event
        emit ChildDetached(parentId, childId);

        // Emit metadata update so the parent's appearance can update
        emit MetadataUpdate(parentId);
    }

    /**
     * @dev Get all children of a parent NFT
     * @param parentId The parent NFT token ID
     * @return Array of child token IDs
     */
    function getChildren(uint256 parentId) external view returns (uint256[] memory) {
        return _children[parentId];
    }

    /**
     * @dev Get the parent of a child NFT
     * @param childId The child NFT token ID
     * @return The parent token ID (0 if none)
     */
    function getParent(uint256 childId) external view returns (uint256) {
        return _parent[childId];
    }

    /**
     * @dev Get the number of children attached to a parent
     * @param parentId The parent NFT token ID
     * @return Number of children
     */
    function getChildrenCount(uint256 parentId) external view returns (uint256) {
        return _children[parentId].length;
    }

    /**
     * @dev Living NFT: Perform an action to increase energy/level
     * @param tokenId The token to evolve
     */
    function performAction(uint256 tokenId) external {
        require(_tokenExists[tokenId], "Token doesn't exist");
        require(ownerOf(tokenId) == msg.sender, "Not owner");

        // Increase energy by 1
        energy[tokenId]++;
        lastActionTime[tokenId] = block.timestamp;

        emit ActionPerformed(tokenId, energy[tokenId]);
        emit MetadataUpdate(tokenId); // Signal metadata might have changed
    }

    /**
     * @dev Living NFT: Batch perform actions (gas efficient)
     * @param tokenId The token to evolve
     * @param times How many actions to perform
     */
    function performActionBatch(uint256 tokenId, uint256 times) external {
        require(_tokenExists[tokenId], "Token doesn't exist");
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(times > 0 && times <= 100, "Invalid times");

        energy[tokenId] += times;
        lastActionTime[tokenId] = block.timestamp;

        emit ActionPerformed(tokenId, energy[tokenId]);
        emit MetadataUpdate(tokenId);
    }

    /**
     * @dev Living NFT: Get current stage based on energy level
     * @param tokenId The token ID
     * @return stage number (0-4 based on energy levels)
     */
    function getStage(uint256 tokenId) public view returns (uint256) {
        uint256 e = energy[tokenId];
        if (e < 5) return 0;      // Seedling
        if (e < 10) return 1;    // Growing
        if (e < 20) return 2;    // Mature
        if (e < 50) return 3;    // Elder
        return 4;                 // Legendary
    }

    /**
     * @dev Update metadata for a token (emits MetadataUpdate event)
     * @param tokenId The token ID to update
     * @param newMetadata New metadata JSON string
     */
    function updateMetadata(uint256 tokenId, string memory newMetadata) external onlyOwner {
        require(_tokenExists[tokenId], "Token doesn't exist");
        _tokenMetadata[tokenId] = newMetadata;
        emit MetadataUpdate(tokenId);
    }

    /**
     * @dev Required by UUPSUpgradeable - authorizes upgrades
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    modifier onlyRelayer() {
        require(isRelayer[msg.sender], "Not a relayer");
        _;
    }

    function setRelayer(address r, bool allowed) external onlyOwner {
        isRelayer[r] = allowed;
    }

    function batchUpdate(RelationUpdate[] calldata updates) external nonReentrant onlyRelayer {
        uint256 len = updates.length;
        uint256[] memory touched = new uint256[](len * 2);
        uint256 tcount = 0;

        for (uint i = 0; i < len; i++) {
            RelationUpdate calldata u = updates[i];
            require(_tokenExists[u.a] && _tokenExists[u.b], "Token missing");
            require(u.a != u.b, "no self relation");

            Edge storage eAB = _edgeData[u.a][u.b];
            int256 newWeightSigned = int256(eAB.weight) + u.delta;

            if (newWeightSigned <= 0) {
                if (_neighbors[u.a].contains(u.b)) {
                    bytes32 rtype = eAB.relationType;
                    delete _edgeData[u.a][u.b];
                    delete _edgeData[u.b][u.a];
                    _neighbors[u.a].remove(u.b);
                    _neighbors[u.b].remove(u.a);
                    emit RelationRemoved(u.a, u.b, rtype);
                }
            } else {
                uint256 newW = uint256(newWeightSigned);
                if (!_neighbors[u.a].contains(u.b)) {
                    _neighbors[u.a].add(u.b);
                    _neighbors[u.b].add(u.a);
                    _edgeData[u.a][u.b] = Edge({ weight: newW, createdAt: block.timestamp, lastUpdated: block.timestamp, relationType: u.relationType });
                    _edgeData[u.b][u.a] = Edge({ weight: newW, createdAt: block.timestamp, lastUpdated: block.timestamp, relationType: u.relationType });
                    emit RelationAdded(u.a, u.b, u.relationType, newW);
                } else {
                    eAB.weight = newW;
                    eAB.lastUpdated = block.timestamp;
                }
            }

            touched[tcount++] = u.a;
            touched[tcount++] = u.b;
        }

        for (uint i = 0; i < tcount; i++) {
            bool seen = false;
            for (uint j = 0; j < i; j++) if (touched[j] == touched[i]) { seen = true; break; }
            if (!seen) emit MetadataUpdate(touched[i]);
        }
    }
}

