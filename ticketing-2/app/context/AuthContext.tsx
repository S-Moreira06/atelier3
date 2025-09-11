// app/context/AuthContext.tsx
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useEffect, useState } from 'react';

export type User = {
  id: string;
  username: string;
  email: string;
  company: string;
  admin: boolean;
  admin_level: number;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Au démarrage, tenter de recharger le token et l'user depuis SecureStore
  useEffect(() => {
    (async () => {
      const savedToken = await SecureStore.getItemAsync('userToken');
      const savedUser = await SecureStore.getItemAsync('userInfo');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (newToken: string, newUser: User) => {
    await SecureStore.setItemAsync('userToken', newToken);
    await SecureStore.setItemAsync('userInfo', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userInfo');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
