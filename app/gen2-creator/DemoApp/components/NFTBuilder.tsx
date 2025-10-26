import React, { useEffect, useRef, useState } from 'react';
import { NFT, VisualTraits } from '../types';

interface NFTBuilderProps {
    nfts: NFT[];
    selectedNft: NFT | null;
    onSelectNft: (nftId: number | null) => void;
    onUpdateNft: (nft: NFT) => void;
}

const NFTBuilder: React.FC<NFTBuilderProps> = ({ nfts, selectedNft, onSelectNft, onUpdateNft }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [traits, setTraits] = useState<VisualTraits | null>(selectedNft?.visualTraits || null);

    useEffect(() => {
        if (selectedNft) {
            setTraits(selectedNft.visualTraits);
        }
    }, [selectedNft]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !traits) return;

        // Set a fixed size for the canvas
        const size = Math.min(600, window.innerWidth * 0.6, window.innerHeight * 0.8);
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        const particles: any[] = [];
        const width = size;
        const height = size;

        const particleCount = traits.particleCount;

        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * traits.speed,
                vy: (Math.random() - 0.5) * traits.speed,
                size: Math.random() * 3 + 1, // Slightly larger particles
            });
        }

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = traits.color;

            particles.forEach(p => {
                // Update position
                p.x += p.vx;
                p.y += p.vy;

                // Wall collision
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                // Pattern-based movement - more visible effects
                switch (traits.pattern) {
                    case 'swirl':
                        const dx = p.x - width / 2;
                        const dy = p.y - height / 2;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const force = 0.0005 * Math.min(distance, 100);
                        p.vx += (-dy / distance) * force * traits.speed;
                        p.vy += (dx / distance) * force * traits.speed;
                        break;
                    case 'explode':
                        p.vx *= 1.01;
                        p.vy *= 1.01;
                        break;
                    case 'flow':
                    default:
                        p.vx += 0.01 * Math.sin(p.y * 0.01) * traits.speed;
                        p.vy += 0.01 * Math.cos(p.x * 0.01) * traits.speed;
                        break;
                }
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            animationFrameId = window.requestAnimationFrame(render);
        };

        render();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    }, [traits]);

    const handleTraitChange = <K extends keyof VisualTraits>(key: K, value: VisualTraits[K]) => {
        if (selectedNft) {
            const newTraits = { ...selectedNft.visualTraits, [key]: value };
            onUpdateNft({ ...selectedNft, visualTraits: newTraits });
        }
    };

    if (!selectedNft || !traits) {
        return (
             <div className="w-full h-full flex items-center justify-center bg-slate-800/50 rounded-lg shadow-2xl border border-slate-700 p-6">
                <p className="text-slate-400 text-center">Select an NFT from the dropdown to begin designing its visualization.</p>
                <select
                    onChange={(e) => onSelectNft(Number(e.target.value))}
                    className="ml-4 bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                >
                    <option>Choose NFT...</option>
                    {nfts.map(nft => <option key={nft.id} value={nft.id}>NFT #{nft.id}</option>)}
                </select>
            </div>
        )
    }

    return (
        <div className="w-full h-[calc(100vh-150px)] flex flex-row gap-6">
            {/* Options Panel - Fixed width */}
            <div className="w-96 bg-slate-800/50 rounded-lg shadow-2xl border border-slate-700 p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-cyan-300">Design NFT #{selectedNft.id}</h2>
                    <select
                        value={selectedNft.id}
                        onChange={(e) => onSelectNft(Number(e.target.value))}
                        className="bg-slate-700 border border-slate-600 rounded-md p-2 text-white"
                    >
                        {nfts.map(nft => <option key={nft.id} value={nft.id}>NFT #{nft.id}</option>)}
                    </select>
                </div>
                
                <div className="space-y-6">
                    {/* Color Picker */}
                    <div>
                        <label className="block text-slate-400 font-semibold mb-2" htmlFor="color">Color</label>
                        <input
                            id="color"
                            type="color"
                            value={traits.color}
                            onChange={(e) => handleTraitChange('color', e.target.value)}
                            className="w-full h-10 p-1 bg-slate-700 border border-slate-600 rounded-md cursor-pointer"
                        />
                    </div>

                    {/* Particle Count Slider */}
                    <div>
                        <label className="block text-slate-400 font-semibold mb-2" htmlFor="particleCount">Particle Count ({traits.particleCount})</label>
                        <input
                            id="particleCount"
                            type="range"
                            min="10"
                            max="500"
                            step="10"
                            value={traits.particleCount}
                            onChange={(e) => handleTraitChange('particleCount', Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    
                    {/* Speed Slider */}
                    <div>
                        <label className="block text-slate-400 font-semibold mb-2" htmlFor="speed">Speed ({traits.speed.toFixed(1)})</label>
                        <input
                            id="speed"
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={traits.speed}
                            onChange={(e) => handleTraitChange('speed', Number(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    {/* Pattern Selector */}
                    <div>
                        <label className="block text-slate-400 font-semibold mb-2">Movement Pattern</label>
                        <div className="flex gap-2">
                            {(['flow', 'swirl', 'explode'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => handleTraitChange('pattern', p)}
                                    className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors ${traits.pattern === p ? 'bg-cyan-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* NFT Preview - Takes remaining space */}
            <div className="flex-1 bg-slate-900 rounded-lg shadow-inner border border-slate-700 overflow-hidden flex items-center justify-center">
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full max-h-full"
                  style={{
                    backgroundColor: '#1e293b', // Dark slate background
                    aspectRatio: '1/1',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
            </div>
        </div>
    );
};

export default NFTBuilder;