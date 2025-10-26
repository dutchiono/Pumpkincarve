# Living NFT + Composable NFTs on Base — Reference

> A reference guide (Markdown) for building **living, on‑chain evolving NFTs** on **Base (EVM)**. Includes recommended standards, design patterns, OpenZeppelin 5.2 guidance, code snippets, deployment and security checklist for use inside an IDE.

---

## Overview

A **Living NFT** is an ERC‑721 (or ERC‑1155) whose metadata and visual state evolve in response to **on‑chain actions**. Combining this with **composable/nestable NFTs** (EIP‑7401 style) produces artwork that can grow, spawn sub‑assets, or react to DeFi/governance/gameplay events.

This document explains architecture patterns, standards to consider, practical code snippets, storage & hosting options, indexing, and a deployment/testing checklist.

---

## Goals for a Living NFT project

* **On‑chain determinism**: art state is derived from on‑chain variables or calls.
* **Live updates**: clients re‑fetch metadata when state changes (use events like ERC‑4906).
* **Composability**: parent NFTs can own children (ERC‑7401-style) so assets can be nested.
* **Gas & UX**: minimize costs for users and enable sponsored interactions (account abstraction / ERC‑4337 if needed).
* **Security & Upgradeability**: safe upgrade patterns and careful storage layout.

---

## Relevant Standards & Tools (Summary)

* **ERC‑721** — classic NFT type. (Base usage, OpenZeppelin `ERC721`)
* **ERC‑1155** — multi‑token standard; efficient for editions & inventories.
* **ERC‑4906** — metadata update events (`MetadataUpdate`, `BatchMetadataUpdate`) to signal clients.
* **EIP‑6551 (Token Bound Accounts)** — token‑owned smart wallets enabling NFTs to own assets.
* **EIP‑7401 (Composable / Nestable NFTs)** — patterns for parent/child ownership (RMRK, Nestable).
* **EIP‑4337 + EIP‑7579** — Account Abstraction and smart account modules (gas sponsorship, modular wallets).
* **EIP‑2981** — royalty standard.
* **ERC‑721A / ERC‑721Psi** — gas‑optimized minting implementations (not official EIPs but widely used).
* **OpenZeppelin Contracts v5.2** — recommended base library for solidity `^0.8.20`.
* **OZ Community Contracts** — contains implementations / helpers for account abstraction and cross‑chain messaging (ERC‑7786 style).

---

## Architectural Patterns

### 1) On‑chain state → tokenURI logic

Implement `tokenURI(uint256 tokenId)` to compute or select metadata based on on‑chain state variables (counters, timestamps, mapping values, scores, etc.).

**Pros:** Client can read metadata deterministically, no off‑chain orchestration required for simple logic.
**Cons:** Complex on‑chain computation increases gas and contract size.

**Pattern:** keep the heavy art generation off‑chain (pre‑rendered IPFS URIs) and only choose which URI to return using cheap on‑chain checks. For on‑chain SVGs, keep logic compact.

```solidity
function tokenURI(uint256 id) public view override returns (string memory) {
    uint256 level = energy[id];
    if (level < 5) return _stageURI[0];
    if (level < 10) return _stageURI[1];
    return _stageURI[2];
}
```

Emit `MetadataUpdate(id)` after state changes so marketplaces refresh.

---

### 2) Event‑driven metadata refresh (ERC‑4906)

Emit `MetadataUpdate` whenever the stored state that affects `tokenURI` changes. This is crucial for marketplaces and indexers to re‑pull metadata and show the new art.

```solidity
import "@openzeppelin/contracts/interfaces/IERC4906.sol";

// after updating state
emit MetadataUpdate(tokenId);
```

---

### 3) Nested / Composable NFTs (EIP‑7401 style)

Options:

* Use a **custom parent/child registry** that records attachments (parentId -> childIds).
* Reuse community implementations (RMRK patterns, or a lightweight `attach(detach)` API).

**Design:** Parent contract tracks ownership and attached children. When a child is attached/detached, `emit MetadataUpdate(parent)` so the parent art updates.

**Security caution:** ensure only owner or approved addresses can attach/detach; avoid reentrancy.

---

### 4) Token Bound Accounts (EIP‑6551)

Use token bound accounts to give each NFT its own wallet. This enables the NFT to hold ERC‑20s, ERC‑721s, or call other contracts.

**Use cases:** inventory, treasury, programmable behavior.

**Integration:** deploy or reference a TBA registry and map NFT (contract, tokenId) -> account address. Interact with that account for deposits/actions.

---

### 5) Account Abstraction for UX (EIP‑4337)

If you want to sponsor gas or enable meta‑transactions (so owners can interact with the living NFT without paying gas directly), integrate EIP‑4337 supporting bundles or paymasters.

**Tradeoffs:** increases complexity; relies on bundlers and paymasters support on Base.

---

## Metadata & Rendering Strategies

### A. Off‑chain hosted metadata (IPFS/Arweave)

* Store different stages as separate JSON files (or SVG images) on IPFS/Arweave.
* On chain, store pointers (`ipfs://Qm...`) or stage URIs in storage.
* Benefits: cheap, flexible, keeps heavy assets off‑chain.

**Pattern:** maintain a `mapping(uint => string) stageURI` and `tokenURI` picks stage index.

### B. On‑chain SVG generation

* Use compact SVG generation + Base64 encoding in `tokenURI`.
* Good for fully decentralized art but expensive for many dynamic changes.

### C. Hybrid: on‑chain seeds + off‑chain renderer

* Store a small seed on‑chain; external renderer builds the full SVG/JSON.
* When state changes, emit `MetadataUpdate`; the renderer fetches new traits and writes to IPFS (or just serves dynamically via a gateway).

**Important:** ensure canonical metadata exists in IPFS or an immutable store if provenance is necessary.

---

## Interaction Triggers (what can change the art)

* Direct actions: `performAction()` called by owner or approved contracts
* Cross‑contract calls: DeFi or game contracts call into NFT contract to update traits
* Events & Oracles: Chainlink or an oracle updates state (e.g., external real‑world events)
* Time based: `block.timestamp` or `block.number` thresholds
* Token holdings: if holder owns specific ERC‑20 balance or child tokens

For each trigger, enforce access control and emit `MetadataUpdate(tokenId)`.

---

## Example: Minimal LivingArt (ERC‑721 + 4906)

> This is a conceptual snippet — use OpenZeppelin v5.2 and full access control in production.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC4906.sol";

contract LivingArt is ERC721URIStorage, IERC4906, Ownable {
    mapping(uint256 => uint256) public energy;
    string[] public stageURI;

    constructor() ERC721("LivingArt", "LV") {}

    function performAction(uint256 tokenId) external {
        require(_exists(tokenId), "Doesn't exist");
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        energy[tokenId]++;
        emit MetadataUpdate(tokenId);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        uint256 e = energy[id];
        if (e < 5) return stageURI[0];
        else if (e < 10) return stageURI[1];
        else return stageURI[2];
    }

    // admin helpers to set stage URIs
    function setStageURI(uint idx, string memory uri) external onlyOwner {
        if (idx >= stageURI.length) stageURI.push(uri);
        else stageURI[idx] = uri;
    }
}
```

---

## Example: Simple Parent/Child Attachment API (7401-style)

```solidity
mapping(uint256 => uint256[]) private _children;
mapping(uint256 => mapping(uint256 => uint256)) private _childIndex; // childId -> index+1

function attachChild(uint256 parentId, uint256 childId) external {
    require(ownerOf(parentId) == msg.sender, "Not parent owner");
    _childIndex[parentId][childId] = _children[parentId].length + 1;
    _children[parentId].push(childId);
    emit MetadataUpdate(parentId);
}

function detachChild(uint256 parentId, uint256 childId) external {
    // implement removal and update indices carefully
    emit MetadataUpdate(parentId);
}
```

---

## Indexing & Off‑chain Services

* **TheGraph / custom subgraph**: index `MetadataUpdate` events, energy counters, attachments and present stage URIs.
* **Event watchers**: use Alchemy/QuickNode or a node RPC + webhooks to trigger automated off‑chain rendering and IPFS pinning when certain thresholds happen.
* **Defender / Automation**: schedule or react to on‑chain events to run maintenance tasks (e.g., snapshot states and pin assets).

---

## Storage, Pinning, and Metadata Format

* JSON metadata example (ERC‑721):

```json
{
  "name": "Bloom #1",
  "description": "A living tree that grows",
  "image": "ipfs://Qm...svg",
  "attributes": [ {"trait_type":"Stage","value":"Sapling"} ]
}
```

* Pin to **NFT.storage** or **Arweave** for permanence. Keep URIs immutable where provenance matters.

---

## UX & Gas Considerations

* Use batch operations or gas‑optimized mint (ERC‑721A) for large mints.
* Keep frequent state updates inexpensive — prefer counters or small mappings instead of large array operations.
* Consider meta‑transactions (EIP‑4337) to sponsor user interactions if you expect frequent micro‑actions.

---

## Security Checklist

* Use OpenZeppelin Contracts v5.2.
* Apply `nonReentrant` where needed (attach/detach flows).
* Validate inputs and access control (`onlyOwner`, `onlyApproved`).
* If using upgradeable patterns, read OZ v5 storage layout changes and use namespaced storage.
* Unit tests for every state transition and event emission.
* Third‑party audit for production (especially when TBA or paymasters are involved).

---

## Testing & Dev Flow

* Local testing: Hardhat + Foundry for unit & fuzz tests.
* Use Base Sepolia / Base testnet for integration testing.
* Simulate heavy interaction patterns and estimate gas.

---

## Deployment Checklist

* Prepare contract with OZ v5.2 and pin metadata.
* Deploy to Base Sepolia first; verify events & indexer reactivity.
* Configure TheGraph / event watchers to index `MetadataUpdate`.
* Deploy to Base mainnet and monitor via Defender / Grafana dashboards.

---

## Further Ideas & Extensions

* **Composable traits marketplace**: children (leaves/items) can be detached and traded; parent art updates.
* **Autonomous NFTs**: combine TBA + scheduled jobs to let NFTs act on yield farming or governance proposals.
* **On‑chain provenance art**: fully on‑chain SVG for ultimate decentralization.
* **Reactive cross‑chain art**: listen to events on other chains and reflect state via ERC‑7786 messaging.

---

## Resources

* OpenZeppelin Contracts: [https://github.com/OpenZeppelin/openzeppelin-contracts](https://github.com/OpenZeppelin/openzeppelin-contracts)
* OpenZeppelin Blog/releases (v5.0–5.2)
* EIP references: ERC‑721, ERC‑1155, ERC‑4906, EIP‑6551, EIP‑7401 (community), EIP‑4337
* NFT.storage / Pinata / Arweave docs

---

## Appendix: Quick CLI & IDE Tips

* `npm init -y && npm i --save-dev hardhat @openzeppelin/contracts@^5.2.0` (use your package manager)
* Use VSCode Solidity extension + solhint + prettier for formatting.
* Keep `artifacts/` and `cache/` out of git; pin metadata folders to IPFS and commit URIs.

---

*Created for quick reference while developing living NFTs on Base using OpenZeppelin 5.2.*
