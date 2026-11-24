import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useStorageDatabase } from "@/database/DatabaseProvider";
import { getStorageValue, setStorageValue } from "@/database/storageDatabase";

const THEME_KEY = "@bitprogress_theme";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const db = useStorageDatabase();

  useEffect(() => {
    let cancelled = false;
    getStorageValue(db, THEME_KEY)
      .then((value) => {
        if (!cancelled) setIsDark(value === "dark");
      })
      .catch((error) => {
        console.error("Failed to load the saved theme:", error);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const toggleTheme = useCallback(async () => {
    setIsDark((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setStorageValue(db, THEME_KEY, isDark ? "dark" : "light").catch((error) => {
      console.error("Failed to persist the selected theme:", error);
    });
  }, [db, isDark, loaded]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
