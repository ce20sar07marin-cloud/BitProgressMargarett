import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { useCallback, useState } from "react";

import { useFocusEffect, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import ScreenBackground from "@/components/ScreenBackground";
import ProgressBar from "@/components/ProgressBar";
import { font, radius, spacing } from "@/constants/theme";
import { useXP } from "@/context/XPContext";
import {
  getLeccionesCompletadasCount,
  getLeccionesResumen,
  getLeccionesCompletadasMap,
} from "@/database/queries";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useStorageDatabase } from "@/database/DatabaseProvider";
import { useUser } from "@/context/UserContext";

const TOTAL_LECCIONES = 9;

const LESSON_ORDER = ["b1", "b2", "b3", "i1", "i2", "i3", "a1", "a2", "a3"];

interface Module {
  id: string;
  title: string;
}

interface Level {
  id: string;
  name: string;
  color: string;
  image: number;
  imageTone: {
    light: { background: string; border: string };
    dark: { background: string; border: string };
  };
  modules: Module[];
}

const levelDefs: Omit<Level, "modules">[] = [
  {
    id: "basic",
    name: "Básico",
    color: "#34D399",
    image: require("@/assets/images/HeadOn.png"),
    imageTone: {
      light: { background: "#EAF7EF", border: "#B7E4C7" },
      dark: { background: "#1B3028", border: "#315A46" },
    },
  },
  {
    id: "intermediate",
    name: "Intermedio",
    color: "#FBBF24",
    image: require("@/assets/images/Creative.png"),
    imageTone: {
      light: { background: "#FFF7E5", border: "#F3D68A" },
      dark: { background: "#352C1B", border: "#6D5726" },
    },
  },
  {
    id: "advanced",
    name: "Avanzado",
    color: "#F87171",
    image: require("@/assets/images/Winner.png"),
    imageTone: {
      light: { background: "#FFF0EE", border: "#F3C1BA" },
      dark: { background: "#382322", border: "#70413D" },
    },
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const router = useRouter();
  const { totalXP } = useXP();
  const colors = useColors();
  const { isDark } = useTheme();
  const db = useStorageDatabase();
  const { userId } = useUser();

  const [completedCount, setCompletedCount] = useState(0);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [levels, setLevels] = useState<Level[]>([]);

  const loadProgress = useCallback(async (isActive: () => boolean) => {
    if (!userId) {
      if (isActive()) {
        setCompletedCount(0);
        setCompletedMap({});
        setLevels([]);
      }
      return;
    }
    try {
      const count = await getLeccionesCompletadasCount(db, userId);
      if (!isActive()) return;
      setCompletedCount(Math.min(TOTAL_LECCIONES, Math.max(0, count)));

      const map = await getLeccionesCompletadasMap(db, userId);
      if (!isActive()) return;
      setCompletedMap(map);

      const lessons = await getLeccionesResumen(db);
      const titleMap: Record<string, string> = {};
      for (const l of lessons) {
        titleMap[l.external_id] = l.titulo;
      }

      const built: Level[] = levelDefs.map((ld) => ({
        ...ld,
        modules: LESSON_ORDER.filter((id) => id.startsWith(ld.id[0])).map(
          (id) => ({
            id,
            title: titleMap[id] ?? id,
          }),
        ),
      }));
      setLevels(built);
    } catch (error) {
      console.error("Failed to load dashboard progress:", error);
    }
  }, [db, userId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadProgress(() => active);
      return () => {
        active = false;
      };
    }, [loadProgress]),
  );

  const isLessonUnlocked = useCallback(
    (lessonId: string): boolean => {
      const index = LESSON_ORDER.indexOf(lessonId);
      if (index === 0) return true;
      const prevId = LESSON_ORDER[index - 1];
      return completedMap[prevId] === true;
    },
    [completedMap],
  );

  const progressPercent = Math.min(
    100,
    Math.round((completedCount / TOTAL_LECCIONES) * 100),
  );

  return (
    <ScreenBackground>
    <FlatList
      key={isDesktop ? "desktop-level-grid" : "mobile-level-list"}
      data={levels}
      numColumns={isDesktop ? 3 : 1}
      columnWrapperStyle={isDesktop ? styles.levelRow : undefined}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: "transparent" }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          backgroundColor: "transparent",
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      ListHeaderComponent={
        <View style={styles.greeting}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={[styles.title, { color: colors.textMain }]}>
                BitProgress
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Aprende redes paso a paso
              </Text>
            </View>
            <View
              style={[styles.xpBadge, { backgroundColor: colors.primarySoft }]}
            >
              <Image
                source={require("@/assets/images/XPGanada.png")}
                style={styles.xpIcon}
              />
              <Text style={[styles.xpValue, { color: colors.primary }]}>
                {totalXP}
              </Text>
            </View>
          </View>

          <View style={[styles.generalProgress, { marginTop: spacing.lg }]}>
            <View style={styles.generalProgressHeader}>
              <Text
                style={[
                  styles.generalProgressLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Progreso general
              </Text>
              <Text
                style={[styles.generalProgressValue, { color: colors.primary }]}
              >
                {completedCount}/{TOTAL_LECCIONES} lecciones ({progressPercent}
                %)
              </Text>
            </View>
            <ProgressBar progress={progressPercent} />
          </View>
        </View>
      }
      renderItem={({ item: level }) => {
        const imageTone = level.imageTone[isDark ? "dark" : "light"];

        return (
          <View
            style={[
              styles.levelSection,
              isDesktop && styles.levelSectionDesktop,
            ]}
          >
            <View
              style={[
                styles.levelImageContainer,
                isDesktop && styles.levelImageContainerDesktop,
                {
                  backgroundColor: imageTone.background,
                  borderColor: imageTone.border,
                },
              ]}
            >
              <Image
                source={level.image}
                style={styles.levelImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.levelHeader}>
              <View
                style={[styles.levelDot, { backgroundColor: level.color }]}
              />
              <Text style={[styles.levelName, { color: colors.textMain }]}>
                {level.name}
              </Text>
            </View>

            {level.modules.map((mod) => {
              const unlocked = isLessonUnlocked(mod.id);
              const completed = completedMap[mod.id] === true;

              return (
                <TouchableOpacity
                  key={mod.id}
                  onPress={() => {
                    if (unlocked) {
                      router.push(`/lesson/${mod.id}` as any);
                    }
                  }}
                  activeOpacity={unlocked ? 0.7 : 1}
                  disabled={!unlocked}
                >
                  <Card
                    style={[styles.moduleCard, !unlocked && { opacity: 0.5 }]}
                  >
                    <View style={styles.moduleRow}>
                      <View style={styles.moduleInfo}>
                        <Text
                          style={[
                            styles.moduleTitle,
                            {
                              color: unlocked
                                ? colors.textMain
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {mod.title}
                        </Text>
                      </View>
                      {completed ? (
                        <View
                          style={[
                            styles.checkBadge,
                            { backgroundColor: "#34D399" },
                          ]}
                        >
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      ) : !unlocked ? (
                        <View
                          style={[
                            styles.lockBadge,
                            { backgroundColor: colors.primarySoft },
                          ]}
                        >
                          <Ionicons
                            name="lock-closed"
                            size={14}
                            color={colors.textSecondary}
                          />
                        </View>
                      ) : null}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }}
    />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  levelRow: {
    gap: spacing.lg,
  },
  greeting: {
    marginBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: font.size.title,
    fontWeight: font.weight.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: font.size.sm,
    marginTop: 4,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  xpIcon: {
    width: 20,
    height: 20,
  },
  xpValue: {
    fontSize: font.size.sm,
    fontWeight: font.weight.bold,
  },
  generalProgress: {
    gap: spacing.sm,
  },
  generalProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  generalProgressLabel: {
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
  },
  generalProgressValue: {
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
  },
  levelSection: {
    marginBottom: spacing.xl,
  },
  levelSectionDesktop: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  levelImageContainerDesktop: {
    width: 104,
    height: 104,
  },
  levelImageContainer: {
    width: 128,
    height: 128,
    alignSelf: "center",
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  levelImage: {
    width: "100%",
    height: "100%",
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  levelName: {
    flex: 1,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
  moduleCard: {
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
