import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { getBrowserTimezone } from "@/lib/timezone";

export type UserType = "doctor" | "patient";

export interface User {
  id: string;
  name: string;
  email: string;
  type: UserType;
}

interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const timezone = getBrowserTimezone();
    const url = timezone
      ? `/auth/me?timezone=${encodeURIComponent(timezone)}`
      : "/auth/me";
    api
      .get<{ success: boolean; user: User }>(url)
      .then((res) => {
        if (res.success && res.user) {
          setUserState(res.user);
        }
        setIsInitialized(true);
      })
      .catch(() => {
        setIsInitialized(true);
      });
  }, []);

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
  }, []);

  const login = useCallback(
    (user: { id: string; name: string; email: string; type: UserType }) => {
      setUserState(user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Ignore - we'll clear local state anyway
    }
    setUserState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      setUser,
      login,
      logout,
      isAuthenticated: user !== null,
      isInitialized,
    }),
    [user, setUser, login, logout, isInitialized]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
