import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

interface AuthContextType {
    user: any;
    token: string | null;
    login: (email: string, password: string) => Promise<any>;
    register: (username: string, email: string, password: string) => Promise<void>;
    verify2FA: (userId: string, otp: string) => Promise<any>;
    toggle2FA: (enabled: boolean) => Promise<void>;
    logout: () => void;
    setUser: (user: any) => void;
    updatePushToken: (pushToken: string) => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // In a real app, we would load the token from AsyncStorage here

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
            if (response.data.require_2fa) {
                return response.data; // Return 2FA requirement to the screen
            }
            setUser(response.data);
            setToken(response.data.token);
            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const verify2FA = async (userId: string, otp: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/auth/verify-2fa`, { userId, otp });
            setUser(response.data);
            setToken(response.data.token);
            return response.data;
        } catch (error) {
            console.error('2FA verification error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username: string, email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${API_URL}/api/auth/register`, { username, email, password });
            setUser(response.data);
            setToken(response.data.token);
        } catch (error: any) {
            console.error('Register error:', error);
            const message = error.response?.data?.message || 'Registration failed';
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
    };

    const toggle2FA = async (enabled: boolean) => {
        if (!token) return;
        try {
            await axios.post(`${API_URL}/api/auth/toggle-2fa`, { enabled }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser((prev: any) => prev ? ({ ...prev, twoFactorEnabled: enabled }) : null);
        } catch (error) {
            console.error('Error toggling 2FA:', error);
            throw error;
        }
    };

    const updatePushToken = async (pushToken: string) => {
        if (!token) return;
        try {
            await axios.post(`${API_URL}/api/auth/push-token`, { pushToken }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser((prev: any) => prev ? ({ ...prev, pushToken }) : null);
        } catch (error) {
            console.error('Error updating push token on backend:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, verify2FA, toggle2FA, logout, setUser, updatePushToken, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
