import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { offlineStorage } from '../utils/offlineStorage';
import { useOffline } from '../hooks/useOffline';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: { fullName: string; email: string; phone?: string; password: string }) => Promise<boolean>;
  logout: () => void;
  updateWallet: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { isOnline } = useOffline();

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        // Try to load from localStorage first
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          
          // Also save to IndexedDB for offline access
          await offlineStorage.saveData('user', userData);
        } else if (!isOnline) {
          // If offline and no localStorage, try IndexedDB
          const offlineUser = await offlineStorage.getData('user', 'user1');
          if (offlineUser) {
            setUser(offlineUser);
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoading(false);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // User is signed in
        console.log('User signed in:', session.user);
      } else {
        // User is signed out
        console.log('User signed out');
      }
    });

    loadUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [isOnline]);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Dummy authentication
    if (email === 'test@gmail.com' && password === '12345677') {
      const userData: User = {
        id: 'user1',
        email,
        fullName: 'Demo User',
        isAdmin: false,
        walletBalance: 1000,
        createdAt: new Date()
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      await offlineStorage.saveData('user', userData);
      return true;
    } else if (email === 'Admin@admin.com' && password === '9794478972') {
      const adminData: User = {
        id: 'admin1',
        email,
        fullName: 'System Admin',
        isAdmin: true,
        walletBalance: 0,
        createdAt: new Date()
      };
      setUser(adminData);
      localStorage.setItem('user', JSON.stringify(adminData));
      await offlineStorage.saveData('user', adminData);
      return true;
    }
    return false;
  };

  const signup = async (userData: { fullName: string; email: string; phone?: string; password: string }): Promise<boolean> => {
    try {
      // Simulate user registration
      const newUser: User = {
        id: `user_${Date.now()}`,
        email: userData.email,
        fullName: userData.fullName,
        phone: userData.phone,
        isAdmin: false,
        walletBalance: 0,
        createdAt: new Date()
      };
      
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      await offlineStorage.saveData('user', newUser);
      return true;
    } catch (error) {
      console.error('Signup failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateWallet = (amount: number) => {
    if (user) {
      const updatedUser = { ...user, walletBalance: user.walletBalance + amount };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      offlineStorage.saveData('user', updatedUser);

      // Save offline action if offline
      if (!isOnline) {
        offlineStorage.saveOfflineAction({
          type: 'updateWallet',
          data: { userId: user.id, amount }
        });
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateWallet }}>
      {children}
    </AuthContext.Provider>
  );
};