import { NFT, Relationship } from './types';

export const WALLET_COLORS = [
    '#4ade80', // green-400
    '#facc15', // yellow-400
    '#22d3ee', // cyan-400
    '#a78bfa', // violet-400
    '#f472b6', // pink-400
];

export const RELATIONSHIP_COLORS: { [key: string]: string } = {
    Parent: '#ffffff',   // white
    Sibling: '#fde047', // yellow-300
    Cousin: '#c084fc',  // purple-400
};

export const INITIAL_NFTS: NFT[] = [
    { id: 1, owner: '0xA1...c2E3', visualTraits: { color: '#4ade80', particleCount: 100, speed: 1.5, pattern: 'flow' } },
    { id: 2, owner: '0xA1...c2E3', visualTraits: { color: '#4ade80', particleCount: 150, speed: 1, pattern: 'swirl' } },
    { id: 3, owner: '0xB4...d5F6', visualTraits: { color: '#facc15', particleCount: 80, speed: 2, pattern: 'explode' } },
    { id: 4, owner: '0xB4...d5F6', visualTraits: { color: '#facc15', particleCount: 120, speed: 1.2, pattern: 'flow' } },
    { id: 5, owner: '0xC7...e8G9', visualTraits: { color: '#22d3ee', particleCount: 200, speed: 0.8, pattern: 'swirl' } },
    { id: 6, owner: '0xA1...c2E3', visualTraits: { color: '#a78bfa', particleCount: 90, speed: 1.8, pattern: 'explode' } },
    { id: 7, owner: '0xD0...h1I2', visualTraits: { color: '#f472b6', particleCount: 130, speed: 1.3, pattern: 'flow' } },
    { id: 8, owner: '0xD0...h1I2', visualTraits: { color: '#f472b6', particleCount: 110, speed: 1.6, pattern: 'swirl' } },
    { id: 9, owner: '0xC7...e8G9', visualTraits: { color: '#22d3ee', particleCount: 160, speed: 1.1, pattern: 'explode' } },
    { id: 10, owner: '0xB4...d5F6', visualTraits: { color: '#facc15', particleCount: 70, speed: 2.5, pattern: 'flow' } },
];

export const INITIAL_RELATIONSHIPS: Relationship[] = [
    // Wallet A1's family
    { source: 1, target: 2, type: 'Sibling' },
    { source: 1, target: 6, type: 'Cousin' },
    // Wallet B4's family
    { source: 3, target: 1, type: 'Parent' },
    { source: 3, target: 4, type: 'Sibling' },
    { source: 10, target: 4, type: 'Cousin' },
    // Wallet C7's family
    { source: 5, target: 3, type: 'Cousin' },
    { source: 9, target: 5, type: 'Sibling' },
    // Wallet D0's family
    { source: 7, target: 8, type: 'Sibling' },
    { source: 7, target: 2, type: 'Cousin' },
    { source: 8, target: 5, type: 'Parent' },
];