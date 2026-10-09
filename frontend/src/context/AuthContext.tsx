import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  role: string;
  profilePhoto?: string | null;
};

type AuthResult = { success: boolean; error?: string };

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  signIn: (params: {
    username: string;
    email: string;
    password: string;
    rememberSession: boolean;
  }) => Promise<AuthResult>;
  signUp: (params: {
    username: string;
    email: string;
    password: string;
    role?: string;
    rememberSession: boolean;
  }) => Promise<AuthResult>;
  updateProfile: (
    params: Pick<UserProfile, "username" | "email"> & { profilePhoto: string | null },
  ) => Promise<AuthResult>;
  changePassword: (params: { newPassword: string }) => Promise<AuthResult>;
  resetPassword: (params: {
    username: string;
    email: string;
    newPassword: string;
  }) => Promise<AuthResult>;
  signOut: () => Promise<boolean>;
}

const AUTH_API_URL = (import.meta.env["VITE_AUTH_API_URL"] ?? "").replace(/\/$/, "");

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authError: null,
  signIn: async () => ({ success: false, error: "Authentication is unavailable." }),
  signUp: async () => ({ success: false, error: "Authentication is unavailable." }),
  updateProfile: async () => ({ success: false, error: "Authentication is unavailable." }),
  changePassword: async () => ({ success: false, error: "Authentication is unavailable." }),
  resetPassword: async () => ({
    success: false,
    error: "Authentication is unavailable.",
  }),
  signOut: async () => false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function requestAuth<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PATCH"; body?: Record<string, unknown> },
): Promise<T> {
  let response: Response;
  try {
    const init: RequestInit = {
      method: options?.method ?? "GET",
      credentials: "include",
      ...(options?.body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(options.body),
          }
        : {}),
    };
    response = await fetch(`${AUTH_API_URL}/api/auth${path}`, init);
  } catch (error) {
    console.error("Unable to reach the EdgeWear authentication service", error);
    throw new Error(
      "Can't reach the authentication service. Start the backend or check its configured URL.",
    );
  }

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "The authentication service returned an unexpected response.";
    throw new Error(message);
  }

  return result as T;
}

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "username" in value &&
    typeof value.username === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "role" in value &&
    typeof value.role === "string" &&
    (!("profilePhoto" in value) ||
      value.profilePhoto === null ||
      typeof value.profilePhoto === "string")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const result = await requestAuth<{ user: unknown }>("/session");
      if (!isUserProfile(result.user) && result.user !== null) {
        throw new Error("The authentication service returned an invalid session.");
      }
      setUser(isUserProfile(result.user) ? result.user : null);
      setAuthError(null);
    } catch (error) {
      setUser(null);
      setAuthError(
        error instanceof Error ? error.message : "Unable to verify your sign-in session.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(
    async ({
      username,
      email,
      password,
      rememberSession,
    }: {
      username: string;
      email: string;
      password: string;
      rememberSession: boolean;
    }): Promise<AuthResult> => {
      try {
        const result = await requestAuth<{ user: unknown }>("/signin", {
          method: "POST",
          body: { username, email, password, rememberSession },
        });
        if (!isUserProfile(result.user)) {
          throw new Error("The authentication service returned an invalid user profile.");
        }
        setUser(result.user);
        setAuthError(null);
        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Sign in failed. Please try again.";
        setAuthError(message);
        return { success: false, error: message };
      }
    },
    [],
  );

  const signUp = useCallback(
    async ({
      username,
      email,
      password,
      role,
      rememberSession,
    }: {
      username: string;
      email: string;
      password: string;
      role?: string;
      rememberSession: boolean;
    }): Promise<AuthResult> => {
      try {
        const result = await requestAuth<{ user: unknown }>("/signup", {
          method: "POST",
          body: { username, email, password, role, rememberSession },
        });
        if (!isUserProfile(result.user)) {
          throw new Error("The authentication service returned an invalid user profile.");
        }
        setUser(result.user);
        setAuthError(null);
        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Account creation failed. Please try again.";
        setAuthError(message);
        return { success: false, error: message };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await requestAuth("/signout", { method: "POST" });
      setUser(null);
      setAuthError(null);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign out. Please try again.";
      setAuthError(message);
      console.error("Unable to sign out from EdgeWear", error);
      return false;
    }
  }, []);

  const updateProfile = useCallback(
    async (profile: Pick<UserProfile, "username" | "email"> & { profilePhoto: string | null }) => {
      try {
        const result = await requestAuth<{ user: unknown }>("/profile", {
          method: "PATCH",
          body: profile,
        });
        if (!isUserProfile(result.user)) {
          throw new Error("The authentication service returned an invalid user profile.");
        }
        setUser(result.user);
        setAuthError(null);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update your profile.";
        setAuthError(message);
        return { success: false, error: message };
      }
    },
    [],
  );

  const changePassword = useCallback(async (params: { newPassword: string }) => {
    try {
      await requestAuth("/change-password", {
        method: "POST",
        body: params,
      });
      setUser(null);
      setAuthError(null);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unable to change your password.",
      };
    }
  }, []);

  const resetPassword = useCallback(
    async (params: { username: string; email: string; newPassword: string }) => {
      try {
        await requestAuth("/reset-password", {
          method: "POST",
          body: params,
        });
        setUser(null);
        setAuthError(null);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unable to reset your password.",
        };
      }
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        authError,
        signIn,
        signUp,
        updateProfile,
        changePassword,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContext;
}
