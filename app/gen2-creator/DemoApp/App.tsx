
import React, { useState, useCallback } from 'react';
// FIX: Removed a stray 's' from an import statement that was causing a syntax error.
import { NFT, Relationship } from './types';
import { INITIAL_NFTS, INITIAL_RELATIONSHIPS } from './constants';
import NFTGraph from './components/NFTGraph';
import NFTDetailPanel from './components/NFTDetailPanel';
import Header from './components/Header';
import Legend from './components/Legend';
import NFTBuilder from './components/NFTBuilder';
import TabNavigator from './components/TabNavigator';

type ActiveTab = 'constellation' | 'builder';

const App: React.FC = () => {
    const [nfts, setNfts] = useState<NFT[]>(INITIAL_NFTS);
    const [relationships] = useState<Relationship[]>(INITIAL_RELATIONSHIPS);
    const [selectedNftId, setSelectedNftId] = useState<number | null>(1);
    const [activeTab, setActiveTab] = useState<ActiveTab>('constellation');

    const handleSelectNft = useCallback((nftId: number | null) => {
        setSelectedNftId(nftId);
    }, []);

    const handleUpdateNft = (updatedNft: NFT) => {
        setNfts(currentNfts =>
            currentNfts.map(nft => nft.id === updatedNft.id ? updatedNft : nft)
        );
    };
    
    const selectedNft = nfts.find(nft => nft.id === selectedNftId) || null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-900 text-gray-200 font-sans">
            <Header />
            <TabNavigator activeTab={activeTab} setActiveTab={setActiveTab} />
            <main className="flex-grow flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
                {activeTab === 'constellation' && (
                    <>
                        <div className="flex-grow md:w-2/3 flex flex-col bg-slate-800/50 rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
                            <h2 className="text-xl font-bold p-4 border-b border-slate-700 text-cyan-300">NFT Constellation</h2>
                            <div className="relative flex-grow">
                                <NFTGraph
                                    nfts={nfts}
                                    relationships={relationships}
                                    onSelectNft={handleSelectNft}
                                    selectedNftId={selectedNftId}
                                />
                                <Legend selectedNftId={selectedNftId} />
                            </div>
                        </div>
                        <div className="md:w-1/3 flex-shrink-0">
                            <NFTDetailPanel
                                nft={selectedNft}
                                relationships={relationships}
                                onSelectNft={handleSelectNft}
                                nfts={nfts}
                            />
                        </div>
                    </>
                )}
                 {activeTab === 'builder' && (
                    <NFTBuilder
                        nfts={nfts}
                        selectedNft={selectedNft}
                        onSelectNft={handleSelectNft}
                        onUpdateNft={handleUpdateNft}
                    />
                )}
            </main>
        </div>
    );
};

export default App;