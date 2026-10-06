import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "../services/authService";

const C = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshAuth() {
    const token = localStorage.getItem("ecoplastic_token");
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const r = await getCurrentUser();
      setUser({ uid: r.profile.id, email: r.profile.email });
      setProfile(r.profile);
    } catch {
      localStorage.removeItem("ecoplastic_token");
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshAuth(); }, []);

  return (
    <C.Provider value={{ user, profile, setProfile, loading, refreshAuth }}>
      {children}
    </C.Provider>
  );
}
export const useAuth = () => useContext(C);
