import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

type Theme = {
    dark: boolean;
    colors: {
        primary: string;
        background: string;
        card: string;
        text: string;
        border: string;
        notification: string;
        subtext: string;
        inputBackground: string;
        myMessage: string;
        theirMessage: string;
        accent: string;
        error: string;
    };
    fonts: {
        regular: { fontFamily: string; fontWeight: "400" | "normal" | "100" | "200" | "300" | "500" | "600" | "700" | "800" | "900" };
        medium: { fontFamily: string; fontWeight: "500" | "normal" | "100" | "200" | "300" | "400" | "600" | "700" | "800" | "900" };
        bold: { fontFamily: string; fontWeight: "700" | "normal" | "100" | "200" | "300" | "400" | "500" | "600" | "800" | "900" };
        heavy: { fontFamily: string; fontWeight: "900" | "normal" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" };
    };
};

const DefaultFonts: Theme['fonts'] = {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '900' },
};

const LightTheme: Theme = {
    dark: false,
    colors: {
        primary: '#007AFF',
        background: '#f5f5f5',
        card: '#ffffff',
        text: '#000000',
        border: '#eeeeee',
        notification: '#FF3B30',
        subtext: '#666666',
        inputBackground: '#ffffff',
        myMessage: '#007AFF',
        theirMessage: '#ffffff',
        accent: '#4CAF50',
        error: '#F44336',
    },
    fonts: DefaultFonts,
};

const DarkTheme: Theme = {
    dark: true,
    colors: {
        primary: '#0A84FF',
        background: '#121212',
        card: '#1E1E1E',
        text: '#ffffff',
        border: '#333333',
        notification: '#FF453A',
        subtext: '#aaaaaa',
        inputBackground: '#2C2C2E',
        myMessage: '#0A84FF',
        theirMessage: '#2C2C2E',
        accent: '#34C759',
        error: '#FF453A',
    },
    fonts: DefaultFonts,
};

type ThemeContextType = {
    theme: Theme;
    isDarkMode: boolean;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

    useEffect(() => {
        setIsDarkMode(systemColorScheme === 'dark');
    }, [systemColorScheme]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const theme = isDarkMode ? DarkTheme : LightTheme;

    return (
        <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
