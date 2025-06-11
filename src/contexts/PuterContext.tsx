import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the context type
interface PuterContextType {
  puter: any;
  isAuthenticated: boolean;
  username: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

// Create the context with a default value
const PuterContext = createContext<PuterContextType>({
  puter: null,
  isAuthenticated: false,
  username: null,
  signIn: async () => {},
  signOut: () => {},
});

// Provider component
export const PuterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [puter, setPuter] = useState<any>(null);

  useEffect(() => {
    // Access the global puter object
    if (typeof window !== 'undefined' && window.puter) {
      setPuter(window.puter);
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Use the correct puter.auth.isSignedIn() method
      if (window.puter && window.puter.auth) {
        const isSignedIn = window.puter.auth.isSignedIn();
        setIsAuthenticated(isSignedIn);

        if (isSignedIn) {
          // Use the correct puter.auth.getUser() method
          const user = await window.puter.auth.getUser();
          setUsername(user.username);
        }
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setIsAuthenticated(false);
    }
  };

  const signIn = async () => {
    try {
      // Use the correct puter.auth.signIn() method
      if (window.puter && window.puter.auth) {
        await window.puter.auth.signIn();
        const isSignedIn = window.puter.auth.isSignedIn();
        setIsAuthenticated(isSignedIn);
        
        if (isSignedIn) {
          const user = await window.puter.auth.getUser();
          setUsername(user.username);
        }
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const signOut = () => {
    try {
      // Use the correct puter.auth.signOut() method
      if (window.puter && window.puter.auth) {
        window.puter.auth.signOut();
        setIsAuthenticated(false);
        setUsername(null);
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <PuterContext.Provider value={{ puter, isAuthenticated, username, signIn, signOut }}>
      {children}
    </PuterContext.Provider>
  );
};

// Custom hook for using the context
export const usePuter = () => useContext(PuterContext);

// Type declarations for global puter object
declare global {
  interface Window {
    puter: any;
  }
}