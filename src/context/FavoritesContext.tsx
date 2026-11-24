import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useStorageDatabase } from "@/database/DatabaseProvider";
import { getStorageValue, setStorageValue } from "@/database/storageDatabase";
import { useUser } from "@/context/UserContext";

const FAVORITES_KEY_PREFIX = "@bitprogress_favorites_";

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<number | null>(null);
  const { userId } = useUser();
  const db = useStorageDatabase();
  const effectiveFavorites = useMemo(
    () => (userId && loadedUserId === userId ? favorites : []),
    [favorites, loadedUserId, userId],
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const key = FAVORITES_KEY_PREFIX + userId;
    getStorageValue(db, key)
      .then((value) => {
        const parsed: unknown = value ? JSON.parse(value) : [];
        if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
          throw new Error("Stored favorites are invalid.");
        }
        if (!cancelled) setFavorites(parsed);
      })
      .catch((error) => {
        console.error("Failed to load saved favorites:", error);
        if (!cancelled) setFavorites([]);
      })
      .finally(() => {
        if (!cancelled) setLoadedUserId(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [db, userId]);

  const toggleFavorite = useCallback((id: string) => {
    if (!userId || loadedUserId !== userId) return;
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, [loadedUserId, userId]);

  useEffect(() => {
    if (!userId || loadedUserId !== userId) return;
    setStorageValue(
      db,
      FAVORITES_KEY_PREFIX + userId,
      JSON.stringify(favorites),
    ).catch((error) => {
      console.error("Failed to persist saved favorites:", error);
    });
  }, [db, favorites, loadedUserId, userId]);

  const isFavorite = useCallback(
    (id: string) => effectiveFavorites.includes(id),
    [effectiveFavorites]
  );

  return (
    <FavoritesContext.Provider value={{ favorites: effectiveFavorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
