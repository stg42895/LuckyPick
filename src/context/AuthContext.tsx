import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { offlineStorage } from '../utils/offlineStorage';
import { useOffline } from '../hooks/useOffline';

interface SignupData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
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
    // Check existing demo accounts
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
        fullName: 'Admin User',
        isAdmin: true,
        walletBalance: 0,
        createdAt: new Date()
      };
      setUser(adminData);
      localStorage.setItem('user', JSON.stringify(adminData));
      await offlineStorage.saveData('user', adminData);
      return true;
    }

    // Check registered users from localStorage
    try {
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const foundUser = registeredUsers.find((u: any) => 
        (u.email === email || u.phone === email) && u.password === password
      );

      if (foundUser) {
        const userData: User = {
          id: foundUser.id,
          email: foundUser.email,
          phone: foundUser.phone,
          fullName: foundUser.fullName,
          isAdmin: false,
          walletBalance: foundUser.walletBalance || 100, // Welcome bonus
          createdAt: new Date(foundUser.createdAt)
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        await offlineStorage.saveData('user', userData);
        return true;
      }
    } catch (error) {
      console.error('Error checking registered users:', error);
    }

    return false;
  };

  const signup = async (userData: SignupData): Promise<boolean> => {
    try {
      // Get existing registered users
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      
      // Check if email or phone already exists
      const emailExists = registeredUsers.some((u: any) => u.email === userData.email);
      const phoneExists = registeredUsers.some((u: any) => u.phone === userData.phone);
      
      if (emailExists || phoneExists) {
        return false; // User already exists
      }

      // Create new user
      const newUser = {
        id: `user_${Date.now()}`,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        walletBalance: 100, // Welcome bonus
        createdAt: new Date().toISOString()
      };

      // Add to registered users
      registeredUsers.push(newUser);
      localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

      // Auto-login the new user
      const userForState: User = {
        id: newUser.id,
        email: newUser.email,
        phone: newUser.phone,
        fullName: newUser.fullName,
        isAdmin: false,
        walletBalance: newUser.walletBalance,
        createdAt: new Date(newUser.createdAt)
      };

      setUser(userForState);
      localStorage.setItem('user', JSON.stringify(userForState));
      await offlineStorage.saveData('user', userForState);

      return true;
    } catch (error) {
      console.error('Signup error:', error);
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

      // Update in registered users list if not a demo account
      if (!['user1', 'admin1'].includes(user.id)) {
        try {
          const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
          const updatedUsers = registeredUsers.map((u: any) => 
            u.id === user.id ? { ...u, walletBalance: updatedUser.walletBalance } : u
          );
          localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
        } catch (error) {
          console.error('Error updating registered users:', error);
        }
      }

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
    <AuthContext.Provider value={{ user, login, signup, logout, updateWallet }}>
      {children}
    </AuthContext.Provider>
  );
};