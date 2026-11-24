import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { achievements } from "@/constants/achievements";
import { useStorageDatabase } from "@/database/DatabaseProvider";
import { useUser } from "@/context/UserContext";
import { getProgresoMapByExternalId } from "@/database/queries";
import {
  getStorageValue,
  setStorageValue,
} from "@/database/storageDatabase";

const STORAGE_KEY_PREFIX = "@bitprogress_achievements_";
const VALID_ACHIEVEMENT_IDS = new Set(achievements.map((a) => a.id));

function sanitizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && VALID_ACHIEVEMENT_IDS.has(id) && !seen.has(id)) {
      seen.add(id);
      valid.push(id);
    }
  }
  return valid;
}

interface StoredAchievementState {
  unlockedIds: string[];
  modalShownIds: string[];
}

function parseStoredAchievements(raw: string | null): StoredAchievementState {
  if (!raw) return { unlockedIds: [], modalShownIds: [] };
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object") {
    throw new Error("Stored achievements are invalid.");
  }
  const stored = data as { unlockedIds?: unknown; modalShownIds?: unknown };
  if (
    (stored.unlockedIds !== undefined && !Array.isArray(stored.unlockedIds)) ||
    (stored.modalShownIds !== undefined && !Array.isArray(stored.modalShownIds))
  ) {
    throw new Error("Stored achievements are invalid.");
  }
  return {
    unlockedIds: sanitizeIds(stored.unlockedIds),
    modalShownIds: sanitizeIds(stored.modalShownIds),
  };
}

interface AchievementsContextType {
  isLoaded: boolean;
  unlockedIds: string[];
  modalShownIds: string[];
  isUnlocked: (id: string) => boolean;
  dismissAchievement: (achievementId?: string) => void;
  checkUnlocks: (preferredLessonId?: string) => Promise<string | null>;
  resetAchievements: () => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextType>({
  isLoaded: false,
  unlockedIds: [],
  modalShownIds: [],
  isUnlocked: () => false,
  dismissAchievement: () => {},
  checkUnlocks: async () => null,
  resetAchievements: async () => {},
});

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [modalShownIds, setModalShownIds] = useState<string[]>([]);
  const [loadedUserId, setLoadedUserId] = useState<number | null>(null);
  const db = useStorageDatabase();
  const { userId } = useUser();

  const unlockedIdsRef = useRef<string[]>([]);
  const modalShownIdsRef = useRef<string[]>([]);
  const loadedUserIdRef = useRef<number | null>(null);
  const unlockQueueRef = useRef<Promise<string | null>>(Promise.resolve(null));

  const isLoaded = userId !== null && loadedUserId === userId;
  const effectiveUnlockedIds = useMemo(
    () => (isLoaded ? unlockedIds : []),
    [isLoaded, unlockedIds],
  );
  const effectiveModalShownIds = useMemo(
    () => (isLoaded ? modalShownIds : []),
    [isLoaded, modalShownIds],
  );

  useEffect(() => {
    unlockedIdsRef.current = effectiveUnlockedIds;
  }, [effectiveUnlockedIds]);

  useEffect(() => {
    modalShownIdsRef.current = effectiveModalShownIds;
  }, [effectiveModalShownIds]);

  useEffect(() => {
    loadedUserIdRef.current = loadedUserId;
  }, [loadedUserId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const key = STORAGE_KEY_PREFIX + userId;
    getStorageValue(db, key)
      .then((value) => {
        const parsed = parseStoredAchievements(value);
        if (!cancelled) {
          unlockedIdsRef.current = parsed.unlockedIds;
          modalShownIdsRef.current = parsed.modalShownIds;
          setUnlockedIds(parsed.unlockedIds);
          setModalShownIds(parsed.modalShownIds);
        }
      })
      .catch((error) => {
        console.error("Failed to load saved achievements:", error);
        if (!cancelled) {
          unlockedIdsRef.current = [];
          modalShownIdsRef.current = [];
          setUnlockedIds([]);
          setModalShownIds([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          loadedUserIdRef.current = userId;
          setLoadedUserId(userId);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [db, userId]);

  useEffect(() => {
    if (userId && loadedUserId === userId) {
      setStorageValue(
        db,
        STORAGE_KEY_PREFIX + userId,
        JSON.stringify({
          unlockedIds: sanitizeIds(unlockedIds),
          modalShownIds: sanitizeIds(modalShownIds),
        }),
      ).catch((error) => {
        console.error("Failed to persist saved achievements:", error);
      });
    }
  }, [db, loadedUserId, modalShownIds, unlockedIds, userId]);

  const isUnlocked = useCallback(
    (id: string) => effectiveUnlockedIds.includes(id),
    [effectiveUnlockedIds],
  );

  const dismissAchievement = useCallback((achievementId?: string) => {
    if (achievementId && VALID_ACHIEVEMENT_IDS.has(achievementId)) {
      setModalShownIds((prev) => {
        const next = sanitizeIds([...prev, achievementId]);
        modalShownIdsRef.current = next;
        return next;
      });
    }
  }, []);

  const persist = useCallback(
    async (ids: string[], shownIds: string[], targetUserId: number) => {
      const dedupedIds = sanitizeIds(ids);
      const dedupedShown = sanitizeIds(shownIds);
      unlockedIdsRef.current = dedupedIds;
      modalShownIdsRef.current = dedupedShown;
      loadedUserIdRef.current = targetUserId;
      setUnlockedIds(dedupedIds);
      setModalShownIds(dedupedShown);
      setLoadedUserId(targetUserId);
      await setStorageValue(
        db,
        STORAGE_KEY_PREFIX + targetUserId,
        JSON.stringify({
          unlockedIds: dedupedIds,
          modalShownIds: dedupedShown,
        }),
      );
    },
    [db],
  );

  const checkUnlocks = useCallback(
    (preferredLessonId?: string): Promise<string | null> => {
      const runCheck = async (): Promise<string | null> => {
        if (!userId) return null;

        let currentUnlocked = unlockedIdsRef.current;
        let currentShown = modalShownIdsRef.current;

        if (loadedUserIdRef.current !== userId) {
          try {
            const raw = await getStorageValue(db, STORAGE_KEY_PREFIX + userId);
            const stored = parseStoredAchievements(raw);
            currentUnlocked = stored.unlockedIds;
            currentShown = stored.modalShownIds;
          } catch (error) {
            console.error("Failed to load achievements before unlock check:", error);
            currentUnlocked = [];
            currentShown = [];
          }
        }

        const progresoMap = await getProgresoMapByExternalId(db, userId);
        const unlockedSet = new Set(currentUnlocked);
        const newlyUnlocked = achievements.filter((ach) => {
          const progress = progresoMap[ach.lessonId];
          return (
            !unlockedSet.has(ach.id) &&
            progress?.lessonDone === true &&
            progress.evalDone === true
          );
        });

        if (newlyUnlocked.length === 0) return null;

        const updatedIds = sanitizeIds([
          ...currentUnlocked,
          ...newlyUnlocked.map((ach) => ach.id),
        ]);
        await persist(updatedIds, currentShown, userId);

        const preferred = preferredLessonId
          ? newlyUnlocked.find((ach) => ach.lessonId === preferredLessonId)
          : undefined;
        return preferred?.id ?? newlyUnlocked[0].id;
      };

      const next = unlockQueueRef.current.catch(() => null).then(runCheck);
      unlockQueueRef.current = next;
      return next;
    },
    [db, persist, userId],
  );

  const resetAchievements = useCallback(async () => {
    if (userId) {
      await setStorageValue(
        db,
        STORAGE_KEY_PREFIX + userId,
        JSON.stringify({
          unlockedIds: [],
          modalShownIds: [],
        }),
      );
    }
    unlockedIdsRef.current = [];
    modalShownIdsRef.current = [];
    setUnlockedIds([]);
    setModalShownIds([]);
  }, [db, userId]);

  return (
    <AchievementsContext.Provider
      value={{
        isLoaded,
        unlockedIds: effectiveUnlockedIds,
        modalShownIds: effectiveModalShownIds,
        isUnlocked,
        dismissAchievement,
        checkUnlocks,
        resetAchievements,
      }}
    >
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  return useContext(AchievementsContext);
}