import React from 'react';

type ActiveTab = 'constellation' | 'builder';

interface TabNavigatorProps {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
}

const TabNavigator: React.FC<TabNavigatorProps> = ({ activeTab, setActiveTab }) => {
    const getButtonClass = (tabName: ActiveTab) => {
        return activeTab === tabName
            ? "bg-cyan-500 text-white"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600";
    };

    return (
        <nav className="p-4 flex justify-center gap-4">
            <button
                onClick={() => setActiveTab('constellation')}
                className={`px-6 py-2 rounded-md font-semibold transition-colors ${getButtonClass('constellation')}`}
            >
                NFT Constellation
            </button>
            <button
                onClick={() => setActiveTab('builder')}
                className={`px-6 py-2 rounded-md font-semibold transition-colors ${getButtonClass('builder')}`}
            >
                NFT Builder
            </button>
        </nav>
    );
};

export default TabNavigator;