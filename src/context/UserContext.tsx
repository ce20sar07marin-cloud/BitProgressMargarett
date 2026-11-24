import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useStorageDatabase } from "@/database/DatabaseProvider";

import {
  getStorageValue,
  removeStorageValue,
  setStorageValue,
} from "@/database/storageDatabase";
import {
  getUsuarioById,
  type PublicDBUsuario,
} from "@/database/userQueries";

const USER_ID_KEY = "@bitprogress_user_id";

interface UserContextType {
  userId: number | null;
  usuario: PublicDBUsuario | null;
  isLoading: boolean;
  setUsuario: (user: PublicDBUsuario) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  userId: null,
  usuario: null,
  isLoading: true,
  setUsuario: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  const [usuario, setUsuario] = useState<PublicDBUsuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const db = useStorageDatabase();

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const value = await getStorageValue(db, USER_ID_KEY);
        const storedId = value ? Number(value) : NaN;
        const storedUser = Number.isSafeInteger(storedId)
          ? await getUsuarioById(db, storedId)
          : null;
        const user = storedUser?.estado === 1 ? storedUser : null;
        if (value && !user) await removeStorageValue(db, USER_ID_KEY);
        if (cancelled) return;
        setUsuario(user);
        setUserId(user?.id_usuario ?? null);
      } catch (error) {
        console.error("Failed to restore the saved user session:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setUsuarioFn = useCallback(async (user: PublicDBUsuario) => {
    await setStorageValue(db, USER_ID_KEY, String(user.id_usuario));
    setUsuario(user);
    setUserId(user.id_usuario);
  }, [db]);

  const logout = useCallback(async () => {
    await removeStorageValue(db, USER_ID_KEY);
    setUsuario(null);
    setUserId(null);
  }, [db]);

  return (
    <UserContext.Provider
      value={{ userId, usuario, isLoading, setUsuario: setUsuarioFn, logout }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
