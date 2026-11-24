import { useCallback, useEffect, useRef, useState } from "react";

import {
  Alert,
  InteractionManager,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import ProgressBar from "@/components/ProgressBar";
import DotGridBackground from "@/components/DotGridBackground";
import Quiz, { type QuizFooterAction } from "@/components/lesson/Quiz";
import DoneModal from "@/components/lesson/DoneModal";
import ExitModal from "@/components/lesson/ExitModal";
import type { LessonConfig } from "@/types/lesson";
import { font, radius, shadow, spacing } from "@/constants/theme";
import { useXP } from "@/context/XPContext";
import { useAchievements } from "@/context/AchievementsContext";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useStorageDatabase } from "@/database/DatabaseProvider";
import {
  saveLeccionCompletada,
  getProgresoLeccion,
  getLeccionByExternalId,
} from "@/database/queries";

const MODAL_CLOSE_DELAY_MS = 400;

interface Props {
  lesson: LessonConfig;
}

export default function LessonView({ lesson }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { addLessonXP } = useXP();
  const { checkUnlocks } = useAchievements();
  const colors = useColors();
  const db = useStorageDatabase();
  const { userId } = useUser();

  const [lessonDbId, setLessonDbId] = useState<number | null>(null);
  const [lessonProgress, setLessonProgress] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const row = await getLeccionByExternalId(db, lesson.id);
        if (!cancelled && row) {
          setLessonDbId(row.id_leccion);

          // Fetch user progress for this lesson
          if (userId) {
            const existing = await getProgresoLeccion(db, userId, row.id_leccion);
            if (existing) {
              // Progress based on puntuacion (XP) out of max 20
              const progressPercent = (existing.puntuacion / 20) * 100;
              setLessonProgress(progressPercent);
            } else {
              setLessonProgress(0);
            }
          } else {
            setLessonProgress(0);
          }
        }
      } catch (error) {
        console.error("Failed to load lesson progress:", error);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [lesson.id, db, userId]);

  const [currentPage, setCurrentPage] = useState(0);
  const [canAdvance, setCanAdvance] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [isLeavingScreen, setIsLeavingScreen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, boolean>>({});
  const [xpEarned, setXpEarned] = useState(0);
  const [earnedPercentage, setEarnedPercentage] = useState(100);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const nextActionRef = useRef(false);
  const leavingRef = useRef(false);
  const quizAnswersRef = useRef<Record<number, boolean>>({});
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [quizFooterAction, setQuizFooterAction] =
    useState<{ page: number; action: QuizFooterAction } | null>(null);
  const handleQuizFooterAction = useCallback(
    (action: QuizFooterAction | null) => {
      setQuizFooterAction(action ? { page: currentPage, action } : null);
    },
    [currentPage],
  );

  const pages = lesson.pages;
  const totalPages = pages.length;
  const isLastPage = currentPage === totalPages - 1;
  const hasQuiz = !!pages[currentPage]?.quiz;

  useEffect(() => {
    nextActionRef.current = false;
  }, [currentPage]);

  useEffect(() => {
    if (hasQuiz) return;
    const timer = setTimeout(() => setCanAdvance(true), 1500);
    return () => clearTimeout(timer);
  }, [currentPage, hasQuiz]);

  const handleBack = useCallback(() => {
    if (currentPage > 0) {
      setCanAdvance(false);
      setQuizCorrect(true);
      setCurrentPage((p) => p - 1);
    } else {
      setShowExitModal(true);
    }
  }, [currentPage]);

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  const handleQuizAnswer = useCallback((correct: boolean) => {
    quizAnswersRef.current[currentPage] = correct;
    setQuizCorrect(correct);
    setQuizAnswers((prev) => ({ ...prev, [currentPage]: correct }));
    setCanAdvance(true);
  }, [currentPage]);

  const handleNext = useCallback(async () => {
    if (!canAdvance || nextActionRef.current) return;
    nextActionRef.current = true;
    setSubmitError(null);

    if (!isLastPage) {
      setCanAdvance(false);
      setQuizCorrect(true);
      setCurrentPage((p) => p + 1);
      return;
    }

    if (!userId || lessonDbId === null) {
      nextActionRef.current = false;
      const msg = "No se encontró la sesión o lección activa.";
      setSubmitError(msg);
      if (Platform.OS !== "web") {
        Alert.alert("No se pudo finalizar", msg);
      }
      return;
    }

    setIsSubmitting(true);
    const quizIndices = pages
      .map((p, idx) => (p.quiz ? idx : -1))
      .filter((idx) => idx >= 0);
    const totalQuizzes = quizIndices.length;
    const mergedAnswers = { ...quizAnswers, ...quizAnswersRef.current };
    const correctQuizzes = quizIndices.filter((idx) => mergedAnswers[idx] === true).length;
    const computedPercentage =
      totalQuizzes > 0
        ? Math.min(100, Math.max(0, Math.round((correctQuizzes / totalQuizzes) * 100)))
        : 100;

    let earned = 0;
    try {
      const existing = await getProgresoLeccion(db, userId, lessonDbId);
      const priorXP = existing?.puntuacion ?? 0;

      if (existing?.leccion_completada === 1 || priorXP >= 20) {
        earned = 0;
      } else if (quizCorrect) {
        earned = priorXP >= 15 ? 5 : 20;
      } else {
        earned = priorXP >= 15 ? 0 : 15;
      }

      const totalXPForLesson = Math.min(priorXP + earned, 20);
      await saveLeccionCompletada(db, userId, lessonDbId, totalXPForLesson);

      if (earned > 0) {
        await addLessonXP(earned);
      }

      try {
        await checkUnlocks(lesson.id);
      } catch (unlockError) {
        console.error("Failed to check lesson achievement unlock:", unlockError);
      }
    } catch (error) {
      console.error("Failed to save lesson completion:", error);
      nextActionRef.current = false;
      setIsSubmitting(false);
      setCanAdvance(true);
      const msg = "No se pudo guardar la lección. Inténtalo nuevamente.";
      setSubmitError(msg);
      if (Platform.OS !== "web") {
        Alert.alert("Error", msg);
      }
      return;
    }

    setIsSubmitting(false);
    setXpEarned(earned);
    setEarnedPercentage(computedPercentage);
    setShowDoneModal(true);
  }, [
    addLessonXP,
    canAdvance,
    checkUnlocks,
    db,
    isLastPage,
    lesson.id,
    lessonDbId,
    pages,
    quizAnswers,
    quizCorrect,
    userId,
  ]);

  const handleConfirmExit = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setIsLeavingScreen(true);
    setShowExitModal(false);
    InteractionManager.runAfterInteractions(() => {
      navTimeoutRef.current = setTimeout(() => router.back(), MODAL_CLOSE_DELAY_MS);
    });
  }, [router]);

  const handleDone = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setIsLeavingScreen(true);
    setShowDoneModal(false);
    InteractionManager.runAfterInteractions(() => {
      navTimeoutRef.current = setTimeout(() => router.replace("/(tabs)"), MODAL_CLOSE_DELAY_MS);
    });
  }, [router]);

  const page = pages[currentPage];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {isDesktop && <DotGridBackground />}
      <View
        style={[styles.pageLayout, isDesktop && styles.pageLayoutDesktop]}
      >
        {isDesktop && (
          <View
            style={[
              styles.desktopIllustrationPane,
              { backgroundColor: colors.illustrationBg },
            ]}
          >
            <Image
              source={page.illustration ?? require("@/assets/images/HeadOn.png")}
              style={styles.desktopIllustration}
              resizeMode="contain"
            />
          </View>
        )}
        <View
          style={[
            styles.pageContentPane,
            isDesktop && styles.pageContentPaneDesktop,
          ]}
        >
          <View
            style={[
              styles.headerFixed,
              isDesktop && styles.headerDesktop,
              { paddingTop: isDesktop ? spacing.md : insets.top },
            ]}
            onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
          >
            <View style={styles.topBar}>
              {!isLastPage && (
                <TouchableOpacity
                  onPress={handleBack}
                  style={[
                    styles.iconButton,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={colors.textMain}
                  />
                </TouchableOpacity>
              )}
              {isLastPage && <View style={styles.iconButton} />}
              <Text
                style={[styles.pageIndicator, { color: colors.textSecondary }]}
              >
                {currentPage + 1}/{totalPages}
              </Text>
              {!isLastPage && (
                <TouchableOpacity
                  onPress={() => setShowExitModal(true)}
                  style={[
                    styles.iconButton,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Ionicons name="home" size={20} color={colors.textMain} />
                </TouchableOpacity>
              )}
              {isLastPage && <View style={styles.iconButton} />}
            </View>
            <ProgressBar progress={lessonProgress} />
          </View>

          <ScrollView
            style={[styles.scroll, { backgroundColor: "transparent" }]}
            contentContainerStyle={[
              styles.scrollContent,
              isDesktop && styles.scrollContentDesktop,
              {
                backgroundColor: "transparent",
                paddingTop: isDesktop ? spacing.md : headerHeight + spacing.xl,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {!hasQuiz && (
              <View
                style={[
                  styles.contentCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.pageTitle, { color: colors.primary }]}>
                  {page.title}
                </Text>
                <Text style={[styles.pageContent, { color: colors.textMain }]}>
                  {page.content}
                </Text>

                {page.illustration && !isDesktop && (
                  <View
                    style={[
                      styles.illustrationContainer,
                      { backgroundColor: colors.illustrationBg },
                    ]}
                  >
                    <Image
                      source={page.illustration}
                      style={styles.illustration}
                      resizeMode="contain"
                    />
                  </View>
                )}
              </View>
            )}

            {page.conceptBox && !hasQuiz && (
              <View
                style={[
                  styles.conceptCard,
                  {
                    backgroundColor: colors.illustrationBg,
                    borderColor: colors.primarySoft,
                  },
                ]}
              >
                <Text style={[styles.conceptText, { color: colors.primary }]}>
                  {page.conceptBox}
                </Text>
              </View>
            )}

            {page.quiz && (
              <Quiz
                key={currentPage}
                quiz={page.quiz}
                onAnswer={handleQuizAnswer}
                renderVerifyButtonInFooter={isDesktop}
                onFooterAction={
                  isDesktop ? handleQuizFooterAction : undefined
                }
              />
            )}
          </ScrollView>

          <View
            style={[
              styles.bottomBar,
              isDesktop && styles.bottomBarDesktop,
              {
                paddingBottom: insets.bottom + spacing.sm,
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {isDesktop && (
              <TouchableOpacity
                style={[
                  styles.previousButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: currentPage > 0 ? 1 : 0.55,
                  },
                ]}
                onPress={handleBack}
                disabled={currentPage === 0}
                activeOpacity={0.7}
              >
                <Text style={[styles.previousText, { color: colors.textMain }]}>
                  Anterior
                </Text>
              </TouchableOpacity>
            )}
            {isDesktop &&
              quizFooterAction?.page === currentPage &&
              page.quiz && (
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  {
                    backgroundColor: quizFooterAction.action.disabled
                      ? colors.disabled
                      : colors.primary,
                  },
                ]}
                onPress={quizFooterAction.action.onPress}
                disabled={quizFooterAction.action.disabled}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.nextText,
                    {
                      color: quizFooterAction.action.disabled
                        ? colors.disabledText
                        : colors.textOnPrimary,
                    },
                  ]}
                >
                  {quizFooterAction.action.label}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.nextButton,
                isDesktop && styles.nextButtonDesktop,
                {
                  backgroundColor:
                    canAdvance && !isSubmitting ? colors.primary : colors.disabled,
                },
              ]}
              onPress={handleNext}
              disabled={!canAdvance || isSubmitting}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.nextText,
                  {
                    color:
                      canAdvance && !isSubmitting
                        ? colors.textOnPrimary
                        : colors.disabledText,
                  },
                ]}
              >
                {isLastPage
                  ? isSubmitting
                    ? "Finalizando..."
                    : "Finalizar lección"
                  : isDesktop
                    ? "Continuar"
                    : "Siguiente"}
              </Text>
              <Ionicons
                name={isLastPage ? "checkmark-circle" : "arrow-forward"}
                size={20}
                color={canAdvance && !isSubmitting ? colors.textOnPrimary : colors.disabledText}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {submitError ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.errorSoft, borderColor: colors.error }]}>
          <Text style={[styles.errorBannerText, { color: colors.error }]}>{submitError}</Text>
        </View>
      ) : null}

      <ExitModal
        visible={showExitModal}
        onConfirm={handleConfirmExit}
        onCancel={() => setShowExitModal(false)}
      />
      <DoneModal
        visible={showDoneModal}
        lessonTitle={lesson.title}
        xpEarned={xpEarned}
        percentage={earnedPercentage}
        disabled={isLeavingScreen}
        onConfirm={handleDone}
      />
      {isLeavingScreen ? (
        <View
          style={styles.navigationBlocker}
          onStartShouldSetResponder={() => true}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorBannerText: {
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    textAlign: "center",
  },
  navigationBlocker: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  container: {
    flex: 1,
  },
  pageLayout: {
    flex: 1,
  },
  pageLayoutDesktop: {
    flexDirection: "row",
    padding: spacing.xl,
    gap: spacing.xl,
  },
  desktopIllustrationPane: {
    width: "40%",
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  desktopIllustration: {
    width: "100%",
    height: "100%",
    maxHeight: 520,
  },
  pageContentPane: {
    flex: 1,
  },
  pageContentPaneDesktop: {
    minWidth: 0,
    height: "100%",
  },
  headerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "transparent",
  },
  headerDesktop: {
    position: "relative",
    top: undefined,
    left: undefined,
    right: undefined,
    zIndex: 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pageIndicator: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  scrollContentDesktop: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  contentCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    ...shadow.sm,
  },
  pageTitle: {
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  pageContent: {
    fontSize: font.size.base,
    lineHeight: 28,
  },
  conceptCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
  },
  conceptText: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
    textAlign: "center",
    lineHeight: 24,
  },
  illustrationContainer: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: "100%",
    height: 200,
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    flexShrink: 0,
  },
  bottomBarDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  previousButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  previousText: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
  },
  verifyButton: {
    minHeight: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: radius.lg,
    gap: spacing.sm,
    ...shadow.sm,
  },
  nextButtonDesktop: {
    flex: 1,
  },
  nextText: {
    fontSize: font.size.base,
    fontWeight: font.weight.bold,
  },
});
