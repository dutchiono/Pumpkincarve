# Upgrade Failure Analysis

## Problem Summary
The upgrade script reports "success" but no upgrade transaction is sent. The contract remains on the old implementation.

## Root Causes

### 1. **Manifest Has Duplicate Implementation Entries**
The `.openzeppelin/base.json` file has TWO implementation entries for the same address `0xd8c9C56b1ef231207bAd219A488244aD34576F92`:

- **Entry 1** (hash `b24ab318...`): NEW Gen1 contract with `savePrice` at slot 15
- **Entry 2** (hash `1aa957...`): OLD Gen1Old contract without `savePrice` (ends at whitelisted slot 14)

### 2. **Hardhat's upgradeProxy Logic**
When `upgrades.upgradeProxy()` runs:
1. It reads the proxy's implementation address from on-chain: `0xd8c9...`
2. It looks in the manifest for implementations with that address
3. It finds TWO entries and doesn't know which one matches what's actually deployed
4. It likely compares the NEW Gen1 contract to itself, thinks they're "compatible", and skips the upgrade

### 3. **Script Bug**
Line 128 references `newImplementationAddress` which doesn't exist - should be `implementationAddress`.

## Why No Transaction Was Sent

`upgradeProxy` likely:
- Calculated the storage hash of the new Gen1 contract
- Found entry 1 (which has that hash) pointing to the same address
- Thought: "This implementation already exists at this address, no upgrade needed"
- Returned "success" without sending a transaction

## Current State

- ✅ Contract is safe and functional (old version)
- ✅ No gas was spent on upgrade transaction
- ❌ New features (`savePrice`, `saveAsChild`) are not deployed
- ❌ Contract is still on old implementation

## Solution

The manifest needs to be cleaned up so Hardhat knows which implementation the proxy is actually using. The proxy entry should reference the OLD implementation (Gen1Old hash `1aa957...`).

However, since the proxy entry in the manifest doesn't store an implementation hash reference, we need to either:
1. Remove the wrong entry (entry 1 with NEW Gen1)
2. Or ensure `forceImport` properly associates the proxy with the OLD implementation

The safest approach: Remove entry 1 (the NEW Gen1 entry with hash `b24ab318...`) from the manifest, leaving only entry 2 (Gen1Old with hash `1aa957...`). Then when `upgradeProxy` runs, it will:
- See the proxy uses address `0xd8c9...`
- Find only ONE entry (Gen1Old)
- Compare Gen1Old to NEW Gen1
- See they're different and actually perform the upgrade

