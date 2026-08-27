import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';
import { StudentProfile } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  firebaseUser: User | null;
  currentUserProfile: StudentProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  currentUserProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Clean up any old mock state on mount
  useEffect(() => {
    localStorage.removeItem('mockEducator');
    localStorage.removeItem('mockEducator_v2');
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          // Sync account state and fetch backend user profile
          const intendedRole = localStorage.getItem('intendedRole');
          const res = await api.post('/auth/sync', { role: intendedRole || 'student' });
          setCurrentUserProfile(res.data);
        } catch (error) {
          console.error('Failed to sync/load user profile from backend API:', error);
        }
      } else {
        setCurrentUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Failed to sign in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Failed to sign in with Email:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('mockEducator');
    localStorage.removeItem('mockEducator_v2');
    try {
      await api.post('/auth/logout').catch(() => {});
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setCurrentUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      try {
        const res = await api.get('/auth/me');
        setCurrentUserProfile(res.data);
      } catch (error) {
        console.error('Failed to refresh user profile:', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: firebaseUser,
        firebaseUser,
        currentUserProfile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signOut: handleSignOut,
        logout: handleSignOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
