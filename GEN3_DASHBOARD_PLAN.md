# Gen3 Dashboard & Mint System

## Overview

Gen3 studio becomes the central dashboard for:
1. **Designing** base visual parameters
2. **Minting** new NFTs to holders
3. **Manually modifying** existing NFTs
4. **Automated updates** via batch scripts
5. **Monitoring** NFT evolution over time

---

## Architecture

### Networks
- **Mint/Test**: Base Sepolia
- **Watch/Read**: Base Mainnet (for analyzing existing wallet activity)
- **Contract**: Upgradable Gen3 contract on Base Sepolia

### Workflow

```
Gen3 Studio → Export Settings → Batch Script → IPFS → Update Metadata
     ↓             ↓               ↓
  Design      JSON Config    Holder Analysis
```

---

## Gen3 Studio UI Redesign

### Layout (Card-Based)

```
┌─────────────────────────────────────────────────────────┐
│  GEN3 NFT DESIGN STUDIO                          [Base Sepolia] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ CANVAS       │  │ LAYER        │  │ DATA INFLUENCE│  │
│  │ (Live Loop)  │  │ CONTROLS     │  │ MODIFIERS     │  │
│  │              │  │              │  │              │  │
│  │ [Animation]  │  │ Flow Field   │  │ ☑ Farcaster  │  │
│  │              │  │   Base Freq  │  │   User ID     │  │
│  │              │  │   Amplitude  │  │   Mood        │  │
│  └──────────────┘  │              │  │              │  │
│  ┌──────────────┐  │ FlowFields   │  │ ☐ Neighbor   │  │
│  │ BASE         │  │   Base Freq  │  │ ☐ Txns       │  │
│  │ SETTINGS     │  │   Density    │  │ ☐ Holdings   │  │
│  │              │  │              │  └──────────────┘  │
│  │ [Export]     │  │ Contour      │  ┌──────────────┐ │
│  │ [Save]       │  │   Levels     │  │ MANUAL       │ │
│  └──────────────┘  └──────────────┘  │ OVERRIDES    │ │
│                                      │              │ │
│  ┌────────────────────────────────┐  │ Color Override│ │
│  │ ON-CHAIN ACTIONS               │  │ Freq Override │ │
│  │                                │  │ [Apply]      │ │
│  │ [Connect Wallet]               │  └──────────────┘ │
│  │                                │                  │
│  │ Mint New:                      │   ┌────────────┐ │
│  │   To Address: [_____________]  │   │ DATA       │ │
│  │   Count: [1]                   │   │ SOURCES    │ │
│  │   [Mint to Address]             │   │ LEGEND     │ │
│  │                                 │   │            │ │
│  │ Update Existing:                │   └────────────┘ │
│  │   Token ID: [#]                 │                  │
│  │   [Fetch Current]                │                  │
│  │   [Generate New Render]          │                  │
│  │   [Upload to IPFS]               │                  │
│  │   [Update On-Chain]              │                  │
│  │                                 │                  │
│  │ Batch Operations:               │                  │
│  │   [Run Batch Update Script]     │                  │
│  │   Status: [Idle/Running/Done]   │                  │
│  └────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

---

## Card Components

### 1. Canvas Card
- Live animation loop preview
- Current frame indicator
- Play/Pause (for single-frame inspection)
- Full quality export preview

### 2. Layer Controls Card
- **Flow Field** (background)
  - Base frequency
  - Amplitude
  - Color 1 (picker)
  - Color 2 (picker)
  - Rotation (0-360°)
  - Direction (clockwise/counterclockwise)
- **FlowFields** (lines)
  - Base frequency
  - Amplitude
  - Line density
  - Line length
  - Rotation (0-360°)
  - Direction (clockwise/counterclockwise)
- **Contour Mapping**
  - Base frequency
  - Amplitude
  - Levels
  - Smoothness

### 3. Data Source Influence Card
- Checkbox toggles for each data source
- **Farcaster Mood** (☑ Active)
  - Text input: User ID
  - Dropdown: Last 10 / Last 100
  - Live mood indicator: [Positive/Negative/Neutral]
  - Preview color impact
- **Neighbor Associations** (☐ Coming Soon)
  - Toggle
- **Token Transactions** (☐ Coming Soon)
  - Toggle
- **Wallet Holdings** (☐ Coming Soon)
  - Toggle

### 4. Manual Overrides Card
- **Color Overrides**
  - Override Color 1: [picker]
  - Override Color 2: [picker]
  - [Clear Overrides]
- **Frequency Override**
  - Base Freq: [slider]
  - [Reset to Data Source]
- **Levels Override**
  - Contour Levels: [slider]
  - [Reset]
- [Apply to Current NFT]

### 5. On-Chain Actions Card
**Mint Section:**
- [Connect Wallet] button (walletconnect + wagmi)
- Address input: [_____________]
- Mint count: [1-10]
- [Mint to Address] button
- Network indicator: Base Sepolia

**Update Section:**
- Token ID input: [#]
- [Fetch Current Settings]
- Current settings display
- [Generate New Render]
- [Upload to IPFS]
- [Update On-Chain Metadata]

**Batch Section:**
- [Run Batch Update Script] button
- Status: Idle | Running | Complete
- Last run: [timestamp]
- [View Logs]

### 6. Data Sources Legend (Bottom Right)
Compact version of available data sources:
- ✅ Farcaster Mood API
- ✅ Neynar User Data
- ✅ On-Chain NFT Data
- ✅ Contract State
- 🔧 Metadata Update Function
- ⏳ Transaction History (TODO)
- ⏳ Token Holdings (TODO)

---

## Technical Implementation

### Wallet Connect
```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { walletConnectConfig } from '../config/wagmi';

// Connect button in On-Chain Actions card
const { address, isConnected } = useAccount();
const { connect, connectors } = useConnect();

// Show connected address or connect button
```

### Mint Function
```typescript
async function mintToAddress(destinationAddress: string, count: number) {
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS_BASE_SEPOLIA,
    gen3ABI,
    signer
  );

  const baseSettings = getExportedSettings();

  for (let i = 0; i < count; i++) {
    const tx = await contract.mintTo(destinationAddress, {
      value: MINT_PRICE,
    });
    await tx.wait();

    // Upload metadata with base settings to IPFS
    const metadata = {
      name: `Gen3 NFT #${tokenId}`,
      description: 'Evolving generative art',
      image: ipfsUrl,
      animation_url: ipfsUrl,
      attributes: baseSettings,
    };
    await uploadMetadata(metadata);
  }
}
```

### Fetch Current Settings
```typescript
async function fetchNFTMetadata(tokenId: number) {
  const metadataURI = await contract.tokenURI(tokenId);
  const response = await fetch(metadataURI);
  const metadata = await response.json();

  // Extract and display current visual parameters
  return metadata;
}
```

### Manual Update
```typescript
async function updateNFTMetadata(tokenId: number) {
  // 1. Get current settings OR use manual overrides
  const settings = manualOverrides || baseSettings;

  // 2. Modify based on data sources OR use overrides
  const modifiedSettings = await modifySettings(settings, holderData);

  // 3. Render GIF
  const gifUrl = await renderToGIF(modifiedSettings);

  // 4. Upload to IPFS
  const ipfsUrl = await uploadToIPFS(gifUrl);

  // 5. Update on-chain
  await contract.updateMetadata(tokenId, ipfsUrl);
}
```

---

## Data Flow

### Initial Mint
```
Design in Studio → Export Settings → Mint → Upload to IPFS → Store URI
```

### Automated Batch Update
```
Batch Script → Fetch Holder Data → Modify Settings → Render → Upload → Update
```

### Manual Override
```
Select Token → Fetch Current → Modify Manually → Render → Upload → Update
```

---

## Network Strategy

### Base Sepolia (Test)
- Deploy Gen3 contract
- Mint test NFTs
- Test batch scripts
- Test manual updates
- Use test wallet connect

### Base Mainnet (Production)
- **Read-only** in Gen3 studio (viewing existing NFTs)
- Wallet connect reads from Mainnet
- Batch scripts can watch Mainnet activity
- Don't mint to Mainnet from studio yet

### Why This Setup?
- Test thoroughly on Sepolia
- Use Mainnet activity data for realism
- Gradually deploy to Mainnet when ready

---

## Feature Checklist

### Core Features
- [ ] Wallet Connect integration
- [ ] Mint to address functionality
- [ ] Fetch current NFT metadata
- [ ] Manual override controls
- [ ] Data source influence toggles
- [ ] Export settings button
- [ ] Batch script runner
- [ ] Network indicator

### Data Integration
- [x] Farcaster Mood API
- [x] Neynar integration
- [x] Sentiment analysis
- [x] Post frequency calculation
- [ ] Transaction history (TODO)
- [ ] Token holdings (TODO)
- [ ] Neighbor associations (TODO)

### Contracts
- [ ] Gen3 contract on Base Sepolia
- [ ] `mintTo(address, count)` function
- [ ] `updateMetadata(tokenId, newURI)` function
- [ ] `tokenURI(tokenId)` function
- [ ] Ownership checks

### Rendering
- [ ] Live canvas preview
- [ ] Export high-quality GIF
- [ ] Server-side rendering for batch
- [ ] IPFS upload
- [ ] Metadata generation

---

## Next Steps

1. **Redesign Gen3 Studio UI** (card-based layout)
2. **Add wallet connect** to On-Chain Actions card
3. **Implement mint functionality** with wagmi
4. **Create fetch & update functions** for existing NFTs
5. **Add manual override controls** with live preview
6. **Connect batch script runner** to UI
7. **Deploy contract to Base Sepolia**
8. **Test end-to-end** workflow

