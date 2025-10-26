import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 shadow-lg p-4">
            <div className="container mx-auto">
                <h1 className="text-2xl font-bold text-center text-cyan-300 tracking-wider">
                    Living NFT Visualizer & Builder
                </h1>
            </div>
        </header>
    );
};

export default Header;