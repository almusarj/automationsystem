import { createContext, useContext, useState } from "react";
import { auth } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(auth.isAuthenticated());
  const [error, setError] = useState("");

  async function login(username, password) {
    setError("");
    try {
      await auth.login(username, password);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Incorrect username or password."
          : "Couldn't reach the server. Try again."
      );
      return false;
    }
  }

  function logout() {
    auth.logout();
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
