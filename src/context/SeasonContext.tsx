import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SeasonContextType {
    selectedSeason: string;
    setSelectedSeason: (season: string) => void;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export const SeasonProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedSeason, setSelectedSeason] = useState<string>(new Date().getFullYear().toString());

    return (
        <SeasonContext.Provider value={{ selectedSeason, setSelectedSeason }}>
            {children}
        </SeasonContext.Provider>
    );
};

export const useSeason = () => {
    const context = useContext(SeasonContext);
    if (context === undefined) {
        throw new Error('useSeason must be used within a SeasonProvider');
    }
    return context;
};
