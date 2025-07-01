import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { offlineStorage } from '../utils/offlineStorage';
import { useOffline } from '../hooks/useOffline';
import { supabase } from '../lib/supabase';
import { OTPService } from '../services/otpService';

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // User is signed in
        console.log('User signed in:', session.user);
        
        // Load user data from database
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (userData && !error) {
            const mappedUser: User = {
              id: userData.id,
              email: userData.email,
              fullName: userData.full_name,
              phone: userData.phone,
              isAdmin: userData.is_admin,
              walletBalance: Number(userData.wallet_balance),
              createdAt: new Date(userData.created_at)
            };
            
            setUser(mappedUser);
            localStorage.setItem('user', JSON.stringify(mappedUser));
            await offlineStorage.saveData('user', mappedUser);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        // User is signed out
        console.log('User signed out');
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    loadUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [isOnline]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // For demo purposes, use hardcoded credentials
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

      // Try Supabase authentication for real users
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data.user) {
        // User data will be loaded in the auth state change listener
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const signup = async (userData: { fullName: string; email: string; phone?: string; password: string }): Promise<boolean> => {
    try {
      // Check if email is verified
      const isVerified = await OTPService.isEmailVerified(userData.email);
      if (!isVerified) {
        throw new Error('Email must be verified before creating account');
      }

      // Create user in database
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          full_name: userData.fullName,
          phone: userData.phone,
          email_verified: true,
          email_verified_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('User creation error:', insertError);
        return false;
      }

      if (newUser) {
        // Create auth user (optional - for future password-based auth)
        try {
          await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
              data: {
                full_name: userData.fullName,
                phone: userData.phone
              }
            }
          });
        } catch (authError) {
          console.warn('Auth user creation failed, but database user created:', authError);
        }

        // Map user data
        const mappedUser: User = {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          phone: newUser.phone,
          isAdmin: newUser.is_admin,
          walletBalance: Number(newUser.wallet_balance),
          createdAt: new Date(newUser.created_at)
        };

        setUser(mappedUser);
        localStorage.setItem('user', JSON.stringify(mappedUser));
        await offlineStorage.saveData('user', mappedUser);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Signup failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    
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