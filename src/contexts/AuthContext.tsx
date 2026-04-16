import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  firebaseReady: boolean;
  authError: string | null;
  signInAnonymous: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let attemptedAnonymousLogin = false;

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser && !attemptedAnonymousLogin) {
        attemptedAnonymousLogin = true;
        try {
          await signInAnonymously(auth);
          setAuthError(null);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Falha ao autenticar anonimamente.';
          setAuthError(message);
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInAnonymous = useCallback(async () => {
    if (!auth || !isFirebaseConfigured) return;
    try {
      await signInAnonymously(auth);
      setAuthError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao autenticar anonimamente.';
      setAuthError(message);
      throw error;
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (!auth || !isFirebaseConfigured) return;
    await signOut(auth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      firebaseReady: isFirebaseConfigured,
      authError,
      signInAnonymous,
      signOutUser,
    }),
    [authError, loading, signInAnonymous, signOutUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
