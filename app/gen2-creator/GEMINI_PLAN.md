# Gemini Development Plan for "Mood Ring" NFT

This document outlines the development plan for the dynamic "Mood Ring" NFT, incorporating on-chain and off-chain data to influence visual traits. The `gen2-creator` will serve as the primary development and testing environment, focusing on the "art studio" aspect of the project.

## Overall Vision: "Mood Ring" NFT (Art Studio Focus)

*   **Dynamic Traits:** NFT visual traits will dynamically adjust based on various on-chain and off-chain data points.
*   **Data Sources:** Neighbor associations, token transactions, total wallet holdings (on-chain), and Farcaster post history/general "mood" read by an AI server (off-chain).
*   **Visual Impact:** Data will influence visual elements like color, speed, haphazardness of particles, and potentially more advanced "moving fields" later. The goal is to make it "look really nice."
*   **Goal:** To create a visually appealing and evolving NFT that reflects the owner's social activity and on-chain presence, with a strong emphasis on the visual experimentation and development experience.

## Phase 1: Core NFT Generation & Display (Current Focus - Art Studio)

### 1.1 Frontend (`app/gen2-creator/Gen2App.tsx`)

*   **Dynamic Trait Selection:** Implement UI for selecting traits, similar to the current `page.tsx`, but with a focus on how these traits will map to the dynamic "mood ring" concept.
*   **Real-time Visual Preview:** Connect the trait selection to the `/api/gen2/generate-image` endpoint to show a live preview.
*   **Farcaster User Input:** Add an input field for a Farcaster user ID or address to trigger mood analysis.
*   **Display Mood Data:** Display the "mood" data (once implemented) in the UI.
*   **"Save Design" Button:** This will trigger the IPFS upload of the generated image and metadata.
*   **"Mint NFT" Button:** This will trigger the minting process on the `Gen2` contract.

### 1.2 Backend (`/api/gen2/generate-image` & `/api/gen2/mint`)

*   **Image Generation:** Continue using `sharp` to composite trait layers.
*   **Dynamic Output Format:** Investigate and implement support for generating dynamic formats like GIFs or MP4s. This will require research into suitable libraries and how to integrate them with `sharp` or as a separate step.
*   **IPFS Upload:** Reuse the `uploadToIPFS` service for both image and metadata.
*   **Metadata Generation:** Generate rich metadata JSON that includes all the dynamic traits and the Farcaster mood data.

### 1.3 Smart Contract (`contracts/Gen2.sol`)

*   **Current State:** The contract now includes the `batchUpdate` function and related data structures for "cousin relationships."
*   **Mint Price:** Still need to fetch the actual `mintPrice` from the contract.
*   **Contract Address:** The deployed contract address (`0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C`) has been integrated into `Gen2App.tsx` and `watcher/src/index.ts`.

## Phase 2: Farcaster Mood Analysis & Dynamic Trait Integration

### 2.1 Farcaster Mood API (`/api/gen2/farcaster-mood`)

*   **Neynar Integration:** Use the Neynar API to fetch a Farcaster user's post history.
*   **Sentiment Analysis:** Implement (or integrate a library for) sentiment analysis on the post history to determine a "mood" (e.g., positive, negative, neutral, erratic).
*   **Return Mood Data:** Return the analyzed mood data to the frontend.

### 2.2 Dynamic Trait Mapping

*   Define how the "mood" data (and other on-chain data from the watcher) will influence the visual traits (e.g., mood -> particle speed, color, pattern).
*   **Update Image Generation Logic:** Incorporate these dynamic mappings into the image generation process.

## Phase 3: Off-chain Watcher Service

*   **Scanner:** Monitor Base chain for relevant events (e.g., `Transfer` events for token transactions, other contract interactions).
*   **Translator:** Map wallet interactions to token pairs and identify "neighbor associations" and other relevant data.
*   **Aggregator:** Aggregate interactions hourly and calculate delta weights for relationships.
*   **Relayer Sender:** Daily batch update to the `Gen2` contract via the `batchUpdate` function.
*   **Database:** Store interaction data and processed relationships.

## Phase 4: Advanced Visuals & Optimization

*   **Moving Fields/Advanced Particles:** Research and implement more sophisticated visual effects.
*   **Performance Optimization:** Ensure efficient image/video generation and delivery.
*   **Subgraph/Indexer:** Consider a subgraph or custom indexer for efficient querying of relationship data for rendering.

---

**Current Status & Next Steps:**

*   **Contract:** `Gen2.sol` is compiled and includes the `batchUpdate` logic. (Updated)
*   **Frontend (`gen2-creator`):** Basic trait selection, image preview, and Farcaster user ID input are set up. `Gen2App.tsx` is created and rendered by `page.tsx`. (Updated)
*   **Farcaster Mood API:** `/api/gen2/farcaster-mood/route.ts` is created with basic sentiment analysis. (Updated)
*   **Watcher Service:** Basic project structure is set up. `GEN2_CONTRACT_ADDRESS` and `RELAYER_PRIVATE_KEY` are integrated. `BASE_RPC_ENDPOINT` is set to a placeholder `http://localhost:8545`.

**Remaining Configuration:**

*   **Base RPC Endpoint:** Please confirm the desired Base RPC endpoint for the watcher service. If a public one is preferred, please provide it. Otherwise, `http://localhost:8545` will be used for local testing.
*   **Neynar API Key:** The `NEYNAR_API_KEY` from `.env` is being used by the Farcaster Mood API.

**Next Immediate Focus (Art Studio):**

I will now focus on enhancing the dynamic visual traits and integrating the Farcaster mood into the image generation process. This aligns with the "art studio" aspect of the project.
