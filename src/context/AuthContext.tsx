import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { offlineStorage } from '../utils/offlineStorage';
import { useOffline } from '../hooks/useOffline';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
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
  const { isOnline } = useOffline();

  useEffect(() => {
    const loadUser = async () => {
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
      }
    };

    loadUser();
  }, [isOnline]);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Dummy authentication
    if (email === 'test@gmail.com' && password === '12345677') {
      const userData: User = {
        id: 'user1',
        email,
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
    <AuthContext.Provider value={{ user, login, logout, updateWallet }}>
      {children}
    </AuthContext.Provider>
  );
};