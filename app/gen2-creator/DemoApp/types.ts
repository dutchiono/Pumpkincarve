export interface VisualTraits {
    color: string;
    particleCount: number;
    speed: number;
    pattern: 'flow' | 'explode' | 'swirl';
}

export interface NFT {
    id: number;
    owner: string; // Wallet address
    visualTraits: VisualTraits;
}

export type RelationshipType = 'Parent' | 'Sibling' | 'Cousin';

export interface Relationship {
    source: number;
    target: number;
    type: RelationshipType;
}