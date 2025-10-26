# Gen3 NFT Evolution Mapping

## How Data Becomes Visual Changes

### 🎨 Colors (Flow Field Background)

**Data Source**: Farcaster Post Sentiment
**Analysis**: Last 10 posts + Last 100 posts
**Method**: AI-generated colors based on personality analysis
**Implementation**:
- Uses existing AI service to analyze posts
- Generates colors that match personality/mood
- Example: Creative person → purple/blue, Technical → blue/cyan

**Code**: `app/services/gen3-data-analyzer.ts` → `generateColorsWithAI()`

---

### 🌊 Flow Fields Base Frequency

**Data Source**: Farcaster Post Frequency
**Analysis**: Posts per day over last 100 posts
**Method**: Higher frequency = higher base frequency
**Formula**: `baseFreq * (1 + postsPerDay / 10)`
**Effect**: More active users get more dynamic flowing lines

**Example**:
- User posts 5 times/day → 1.5x frequency
- User posts 20 times/day → 2.0x frequency (capped)

**Code**: `app/services/gen3-data-analyzer.ts` → `modifySettings()` line

---

### 📊 Contour Levels

**Data Source**: Token Holdings Count
**Analysis**: How many NFTs/tokens holder owns
**Method**: More tokens = more contour levels
**Formula**: `3 + floor(tokenCount / 5)` (capped at 10)
**Effect**: Collectors get more detailed contour patterns

---

### 📐 Line Density

**Data Source**: Post Frequency
**Method**: More active → denser lines
**Formula**: `baseDensity + (postsPerDay * 0.01)` (capped at 0.3)

---

## Execution Flow

1. **Initial Mint**: All NFTs minted with same base settings
2. **Weekly/Daily Batch Update**:
   ```
   for each tokenId:
     - Get holder address
     - Fetch Farcaster data via Neynar
     - Analyze posts with AI
     - Calculate post frequency
     - Generate personalized colors
     - Modify base frequency
     - Render updated GIF
     - Upload to IPFS
     - Update metadata on-chain
   ```
3. **Result**: NFTs evolve to reflect holder activity

---

## Example Evolution

### Active Creative User
- Posts frequently about art/projects
- Sentiment: Positive
- Result: Warm colors (purple/pink), dynamic flow, high line density

### Technical Builder
- Posts about code/deployments
- Sentiment: Neutral-positive
- Result: Cool colors (blue/cyan), moderate flow, medium density

### Quiet Collector
- Posts rarely, but owns many NFTs
- Sentiment: Neutral
- Result: Neutral colors, low flow, but high contour levels

---

## Data Sources Summary

✅ **Available NOW**:
- Farcaster posts (Neynar API)
- Post count & timestamps
- Sentiment analysis (AI)
- Post frequency calculation

✅ **Can Add Later**:
- Token holdings count
- Transaction history
- Neighbor associations
- Wallet balance/value

