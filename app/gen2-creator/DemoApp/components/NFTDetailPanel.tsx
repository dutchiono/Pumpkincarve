import React, { useMemo } from 'react';
import { NFT, Relationship, RelationshipType } from '../types';

interface NFTDetailPanelProps {
    nft: NFT | null;
    relationships: Relationship[];
    onSelectNft: (nftId: number) => void;
    nfts: NFT[];
}

const NFTDetailPanel: React.FC<NFTDetailPanelProps> = ({ nft, relationships, onSelectNft }) => {
    const relatedNfts = useMemo(() => {
        if (!nft) return [];
        const related: { id: number; type: RelationshipType | 'Child' }[] = [];
        
        relationships.forEach(r => {
            if (r.source === nft.id) {
                // The selected NFT is the source of the relationship
                const type = r.type === 'Parent' ? 'Child' : r.type;
                related.push({ id: r.target, type });
            } else if (r.target === nft.id) {
                // The selected NFT is the target of the relationship
                related.push({ id: r.source, type: r.type });
            }
        });
        
        // Sort to group by type
        related.sort((a, b) => a.type.localeCompare(b.type));
        return related;
    }, [nft, relationships]);

    if (!nft) {
        return (
            <div className="bg-slate-800/50 rounded-lg shadow-2xl border border-slate-700 p-6 h-full flex items-center justify-center">
                <p className="text-slate-400 text-center">Select an NFT to see its details and relationships.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 rounded-lg shadow-2xl border border-slate-700 p-6 flex flex-col gap-6 h-full">
            <div>
                <h3 className="text-2xl font-bold text-cyan-300">NFT #{nft.id}</h3>
                <p className="text-sm text-slate-400 mt-1">
                    Owner: <span className="font-mono bg-slate-700 px-2 py-1 rounded">{nft.owner}</span>
                </p>
            </div>
            
            <div className="border-t border-slate-700 pt-4">
                <h4 className="font-bold text-lg text-slate-300 mb-3">Relationships</h4>
                {relatedNfts.length > 0 ? (
                    <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {relatedNfts.map(({ id, type }) => (
                            <li key={`${id}-${type}`} 
                                className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md hover:bg-slate-700 transition-colors cursor-pointer"
                                onClick={() => onSelectNft(id)}>
                                <span>
                                    <span className="font-semibold text-slate-400">{type}</span>: NFT #{id}
                                </span>
                                <span className="text-cyan-400 text-xs">VIEW</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-500">This NFT has no direct relationships.</p>
                )}
            </div>
        </div>
    );
};

export default NFTDetailPanel;