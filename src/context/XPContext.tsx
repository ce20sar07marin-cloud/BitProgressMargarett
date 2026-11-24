import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useStorageDatabase } from "@/database/DatabaseProvider";
import { useUser } from "@/context/UserContext";
import { getUsuarioById } from "@/database/userQueries";
import { updateUsuarioXP } from "@/database/queries";

const XP_PER_LESSON = 20;

interface XPContextType {
  totalXP: number;
  addLessonXP: (amount?: number) => Promise<void>;
  resetXP: () => Promise<void>;
}

const XPContext = createContext<XPContextType>({
  totalXP: 0,
  addLessonXP: async () => {},
  resetXP: async () => {},
});

export function XPProvider({ children }: { children: React.ReactNode }) {
  const [loadedState, setLoadedState] = useState<{
    userId: number | null;
    xp: number;
  }>({ userId: null, xp: 0 });
  const db = useStorageDatabase();
  const { userId } = useUser();
  const totalXP = userId && loadedState.userId === userId ? loadedState.xp : 0;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getUsuarioById(db, userId).then((u) => {
      if (!cancelled) setLoadedState({ userId, xp: u?.xp_total ?? 0 });
    }).catch((error) => {
      console.error("Failed to load user XP:", error);
    });
    return () => { cancelled = true; };
  }, [userId, db]);

  const addLessonXP = useCallback(async (amount: number = XP_PER_LESSON) => {
    if (!userId) return;
    const safeAmount =
      typeof amount === "number" && Number.isFinite(amount) && amount > 0
        ? Math.round(amount)
        : 0;
    if (safeAmount === 0) return;

    let baseXp = loadedState.userId === userId ? loadedState.xp : 0;
    if (loadedState.userId !== userId) {
      try {
        const u = await getUsuarioById(db, userId);
        baseXp = typeof u?.xp_total === "number" && Number.isFinite(u.xp_total) ? u.xp_total : 0;
      } catch (error) {
        console.error("Failed to fetch base XP before adding XP:", error);
      }
    }

    const newXp = baseXp + safeAmount;
    setLoadedState({ userId, xp: newXp });
    await updateUsuarioXP(db, userId, newXp);
  }, [loadedState, userId, db]);

  const resetXP = useCallback(async () => {
    if (!userId) return;
    setLoadedState({ userId, xp: 0 });
    await updateUsuarioXP(db, userId, 0);
  }, [userId, db]);

  return (
    <XPContext.Provider value={{ totalXP, addLessonXP, resetXP }}>
      {children}
    </XPContext.Provider>
  );
}

export function useXP() {
  return useContext(XPContext);
}
