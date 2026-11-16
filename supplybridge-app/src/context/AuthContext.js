import { createContext, useContext, useEffect, useState } from "react";

import {
  acceptCurrentTerms,
  changeActiveRole,
  getCurrentUser,
  loginUser,
  registerUser
} from "../services/authService";
import {
  clearStoredSession,
  getCachedUser,
  getSessionToken,
  saveCachedUser,
  saveSessionToken
} from "../utils/sessionStorage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const saveSession = async (newToken, newUser) => {
    await Promise.all([
      saveSessionToken(newToken),
      saveCachedUser(newUser)
    ]);

    setToken(newToken);
    setUser(newUser);
  };

  const clearSession = async () => {
    await clearStoredSession();
    setToken(null);
    setUser(null);
  };

  const restoreSession = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        getSessionToken(),
        getCachedUser()
      ]);

      if (!storedToken) {
        await clearStoredSession();
        return;
      }

      setToken(storedToken);

      try {
        // Confirm the saved token with the backend.
        const response = await getCurrentUser(storedToken);

        setUser(response.user);
        await saveCachedUser(response.user);
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          await clearSession();
        } else if (storedUser) {
          // The server may be temporarily unreachable. Keep the cached user
          // so the app still opens, and let later requests show errors.
          setUser(storedUser);
        } else {
          await clearSession();
        }
      }
    } catch (error) {
      console.error("Unable to restore the saved session:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const response = await loginUser(email, password);
    await saveSession(response.token, response.user);
    return response.user;
  };

  const register = async (formData) => {
    const response = await registerUser(formData);
    await saveSession(response.token, response.user);
    return response.user;
  };

  const logout = async () => {
    await clearSession();
  };

  const acceptTerms = async (termsVersion) => {
    if (!token) {
      throw new Error("You need to log in again.");
    }

    const response = await acceptCurrentTerms(token, termsVersion);

    setUser(response.user);
    await saveCachedUser(response.user);

    return response.user;
  };

  const switchRole = async (activeRole) => {
    if (!token) {
      throw new Error("You need to log in again.");
    }

    const response = await changeActiveRole(token, activeRole);

    setUser(response.user);
    await saveCachedUser(response.user);

    return response.user;
  };

  const value = {
    user,
    token,
    isInitializing,
    isAuthenticated: Boolean(user && token),
    login,
    register,
    logout,
    acceptTerms,
    switchRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Small hook so screens can access the auth state without importing
// the context object directly.
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
};
