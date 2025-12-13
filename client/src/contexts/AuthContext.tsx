import { createContext, useContext, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "creator" | "admin" | "king";
  language: string | null;
  country: string | null;
  referredBy: number | null;
  creatorStatus: string | null;
  contentType: string[] | null;
  primaryBrand: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
