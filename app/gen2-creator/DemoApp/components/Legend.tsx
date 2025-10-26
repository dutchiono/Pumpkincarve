import React from 'react';
import { RELATIONSHIP_COLORS, WALLET_COLORS } from '../constants';

interface LegendProps {
    selectedNftId: number | null;
}

const Legend: React.FC<LegendProps> = ({ selectedNftId }) => {
    const isNftSelected = selectedNftId !== null;

    return (
        <div className="absolute bottom-4 left-4 bg-slate-900/70 backdrop-blur-sm p-3 rounded-lg border border-slate-700 text-sm w-48">
            <h4 className="font-bold mb-2 text-gray-300">
                {isNftSelected ? 'Relationship Colors' : 'Owner Wallet Colors'}
            </h4>
            {isNftSelected ? (
                 <ul>
                    {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
                        <li key={type} className="flex items-center mb-1">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></span>
                            <span className="text-gray-400">{type}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul>
                    {WALLET_COLORS.map((color, i) => (
                        <li key={color} className="flex items-center mb-1">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></span>
                            <span className="text-gray-400">Wallet Group {i + 1}</span>
                        </li>
                    ))}
                </ul>
            )}
             <p className="text-xs text-gray-500 mt-2">
                {isNftSelected ? "Nodes colored by relationship to selected." : "Nodes colored by owner wallet."}
            </p>
        </div>
    );
};

export default Legend;