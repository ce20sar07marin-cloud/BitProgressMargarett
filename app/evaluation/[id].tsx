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

import { useLocalSearchParams, useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import ProgressBar from "@/components/ProgressBar";
import { useStorageDatabase } from "@/database/DatabaseProvider";
import DotGridBackground from "@/components/DotGridBackground";
import Quiz from "@/components/lesson/Quiz";
import type { QuizData } from "@/types/lesson";
import type { QuizFooterAction } from "@/components/lesson/Quiz";
import { font, radius, shadow, spacing } from "@/constants/theme";
import { achievements } from "@/constants/achievements";
import achievementImages from "@/data/achievements/images";
import { useXP } from "@/context/XPContext";
import {
  getEvaluacionByExternalId,
  getPreguntasConRespuestas,
  getProgresoLeccion,
  saveEvaluacionCompletada,
  type DBPregunta,
  type DBRespuesta,
} from "@/database/queries";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useAchievements } from "@/context/AchievementsContext";

import ExitModal from "@/components/lesson/ExitModal";
import ModalBackdrop from "@/components/ModalBackdrop";

interface EvalPage {
  id: string;
  title: string;
  quiz: QuizData;
}

function normalizePercentage(correctCount: unknown, totalQuestions: unknown): number {
  const safeCorrect =
    typeof correctCount === "number" && Number.isFinite(correctCount)
      ? Math.max(0, correctCount)
      : 0;
  const safeTotal =
    typeof totalQuestions === "number" && Number.isFinite(totalQuestions)
      ? totalQuestions
      : 0;
  if (safeTotal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((safeCorrect / safeTotal) * 100)));
}

function normalizeNonNegativeInt(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
}

interface DoneEvalModalProps {
  visible: boolean;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  evaluationTitle: string;
  achievementId: string | null;
  processingError: string | null;
  onConfirm: () => void;
}

function DoneEvalModal({
  visible,
  correctCount,
  totalQuestions,
  xpEarned,
  evaluationTitle,
  achievementId,
  processingError,
  onConfirm,
}: DoneEvalModalProps) {
  const colors = useColors();
  const safeTotal = normalizeNonNegativeInt(totalQuestions);
  const rawCorrect = normalizeNonNegativeInt(correctCount);
  const safeCorrect = safeTotal > 0 ? Math.min(rawCorrect, safeTotal) : 0;
  const safeXp = normalizeNonNegativeInt(xpEarned);
  const safeTitle =
    typeof evaluationTitle === "string" && evaluationTitle.trim().length > 0
      ? evaluationTitle.trim()
      : "Evaluación";
  const percentage = normalizePercentage(safeCorrect, safeTotal);
  const achievement = achievements.find(({ id }) => id === achievementId);

  if (!visible) return null;

  return (
    <View
      style={modalStyles.overlay}
      onStartShouldSetResponder={() => true}
    >
      <ModalBackdrop />
      <View style={[modalStyles.modal, { backgroundColor: colors.surface }]}>
        <ScrollView
          style={modalStyles.scroll}
          contentContainerStyle={modalStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require("@/assets/images/XPtotal.png")}
            style={modalStyles.xpImage}
            resizeMode="contain"
          />
          <Text style={[modalStyles.title, { color: colors.textMain }]}>
            ¡Evaluación completada!
          </Text>
          <Text style={[modalStyles.detail, { color: colors.textSecondary }]}>
            Evaluación: {safeTitle}
          </Text>
          <Text style={[modalStyles.score, { color: colors.primary }]}>
            {percentage}%
          </Text>
          <Text style={[modalStyles.detail, { color: colors.textSecondary }]}>
            {safeCorrect}/{safeTotal} respuestas correctas
          </Text>
          <Text style={[modalStyles.xpText, { color: colors.primary }]}>
            +{safeXp} XP
          </Text>
          {achievement ? (
            <View style={modalStyles.achievement}>
              <Image
                source={achievementImages[achievement.id]}
                style={modalStyles.achievementImage}
                resizeMode="contain"
              />
              <Text style={[modalStyles.achievementTitle, { color: colors.primary }]}>
                ¡Logro desbloqueado!
              </Text>
              <Text style={[modalStyles.achievementName, { color: colors.textMain }]}>
                {achievement.name}
              </Text>
            </View>
          ) : null}
          {processingError ? (
            <Text style={[modalStyles.processingError, { color: colors.error }]}>
              {processingError}
            </Text>
          ) : null}
          <TouchableOpacity
            style={[modalStyles.button, { backgroundColor: colors.primary }]}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Text
              style={[modalStyles.buttonText, { color: colors.textOnPrimary }]}
            >
              Volver a evaluaciones
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modal: {
    borderRadius: radius.xl,
    width: "85%",
    maxWidth: 420,
    maxHeight: "88%",
    ...shadow.lg,
  },
  scroll: {
    width: "100%",
  },
  scrollContent: {
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
  },
  xpImage: {
    width: 72,
    height: 72,
  },
  achievement: {
    alignItems: "center",
    gap: spacing.xs,
  },
  achievementImage: {
    width: 88,
    height: 88,
  },
  achievementTitle: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    textAlign: "center",
  },
  achievementName: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
    textAlign: "center",
  },
  processingError: {
    fontSize: font.size.sm,
    textAlign: "center",
  },
  title: {
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    textAlign: "center",
  },
  score: {
    fontSize: 48,
    fontWeight: font.weight.bold,
  },
  detail: {
    fontSize: font.size.base,
    textAlign: "center",
  },
  xpText: {
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: font.size.base,
    fontWeight: font.weight.bold,
  },
});

function buildQuizData(
  pregunta: DBPregunta,
  respuestas: DBRespuesta[],
): QuizData {
  const tipo = pregunta.tipo_pregunta;

  if (tipo === "multiple-choice" || tipo === "true-false") {
    return {
      type: tipo,
      question: pregunta.enunciado,
      options: respuestas.map((r) => ({
        label: r.texto_respuesta,
        isCorrect: r.es_correcta === 1,
      })),
    };
  }

  if (tipo === "ordering") {
    return {
      type: "ordering",
      question: pregunta.enunciado,
      correctOrder: respuestas
        .sort((a, b) => a.id_respuesta - b.id_respuesta)
        .map((r) => r.texto_respuesta),
    };
  }

  if (tipo === "fill-blank") {
    const correctAnswers = respuestas
      .filter((r) => r.es_correcta === 1)
      .map((r) => r.texto_respuesta);
    return {
      type: "fill-blank",
      question: pregunta.enunciado,
      blankAnswer:
        correctAnswers.length > 1 ? correctAnswers : (correctAnswers[0] ?? ""),
    };
  }

  return { type: "multiple-choice", question: pregunta.enunciado, options: [] };
}

export default function EvaluationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { addLessonXP } = useXP();
  const colors = useColors();
  const db = useStorageDatabase();
  const { userId } = useUser();
  const { checkUnlocks, dismissAchievement } = useAchievements();

  const [pages, setPages] = useState<EvalPage[]>([]);
  const [leccionId, setLeccionId] = useState<number | null>(null);
  const [minimumScore, setMinimumScore] = useState(75);
  const [evaluationTitle, setEvaluationTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [unlockedAchievementId, setUnlockedAchievementId] = useState<string | null>(null);
  const [achievementError, setAchievementError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!id) return;
        const evalRow = await getEvaluacionByExternalId(db, id);
        if (cancelled || !evalRow) return;

        const preguntas = await getPreguntasConRespuestas(db, evalRow.id_evaluacion);
        if (cancelled) return;
        const evalPages: EvalPage[] = preguntas.preguntas.map((preg, i) => ({
          id: `eval-p${i + 1}`,
          title: `Pregunta ${i + 1}`,
          quiz: buildQuizData(preg, preguntas.respuestasMap[preg.id_pregunta] ?? []),
        }));

        setPages(evalPages);
        setLeccionId(evalRow.id_leccion);
        setMinimumScore(evalRow.puntaje_minimo);
        setEvaluationTitle(evalRow.titulo);
      } catch (error) {
        console.error("Failed to load evaluation:", error);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, db]);

  const [currentPage, setCurrentPage] = useState(0);
  const [timerUnlockedPage, setTimerUnlockedPage] = useState<number | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLeavingScreen, setIsLeavingScreen] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const nextActionRef = useRef(false);
  const finishingRef = useRef(false);
  const leavingRef = useRef(false);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [quizFooterAction, setQuizFooterAction] =
    useState<{ page: number; action: QuizFooterAction } | null>(null);
  const handleQuizFooterAction = useCallback(
    (action: QuizFooterAction | null) => {
      setQuizFooterAction(action ? { page: currentPage, action } : null);
    },
    [currentPage],
  );
  const [answeredPages, setAnsweredPages] = useState<
    Record<number, { selected: string; isCorrect: boolean }>
  >({});

  const totalPages = pages.length;
  const correctCount = Object.values(answeredPages).filter(
    (answer) => answer.isCorrect,
  ).length;
  const isLastPage = currentPage === totalPages - 1;
  const hasQuiz = !!pages[currentPage]?.quiz;
  const canAdvance =
    Boolean(answeredPages[currentPage]) ||
    (!hasQuiz && timerUnlockedPage === currentPage);
  const XP_PER_QUESTION = 10;

  useEffect(() => {
    nextActionRef.current = false;
  }, [currentPage]);

  useEffect(() => {
    if (hasQuiz) return;
    const timer = setTimeout(() => setTimerUnlockedPage(currentPage), 1500);
    return () => clearTimeout(timer);
  }, [currentPage, hasQuiz]);

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  const handleBack = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((p) => p - 1);
    } else {
      setShowExitModal(true);
    }
  }, [currentPage]);

  const handleQuizAnswer = useCallback(
    (correct: boolean, selected?: string) => {
      setAnsweredPages((prev) => ({
        ...prev,
        [currentPage]: { selected: selected ?? "", isCorrect: correct },
      }));
    },
    [currentPage],
  );

  const handleNext = useCallback(async () => {
    if (!canAdvance || nextActionRef.current) return;
    nextActionRef.current = true;

    if (!isLastPage) {
      setCurrentPage((p) => p + 1);
      return;
    }

    if (!userId || leccionId === null || totalPages === 0) {
      nextActionRef.current = false;
      const msg = "No se encontró la sesión o evaluación activa.";
      setSubmitError(msg);
      if (Platform.OS !== "web") {
        Alert.alert("No se pudo finalizar", msg);
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setAchievementError(null);
    setUnlockedAchievementId(null);
    const newPercentage = normalizePercentage(correctCount, totalPages);
    const safeMinimumScore = Number.isFinite(minimumScore) ? minimumScore : 75;
    const aprobada = newPercentage >= safeMinimumScore;

    let xpToAward = 0;
    try {
      const existing = await getProgresoLeccion(db, userId, leccionId);
      const rawPreviousScore = existing?.puntuacion_evaluacion ?? 0;
      const previousScore = Number.isFinite(rawPreviousScore)
        ? Math.min(100, Math.max(0, rawPreviousScore))
        : 0;
      const previousCorrect =
        previousScore > 0
          ? Math.round((previousScore / 100) * totalPages)
          : 0;
      const newCorrect = correctCount;
      const improvement = Math.max(0, newCorrect - previousCorrect);
      xpToAward = Math.min(improvement * XP_PER_QUESTION, 80);

      await saveEvaluacionCompletada(
        db,
        userId,
        leccionId,
        newPercentage,
        aprobada,
      );

      if (xpToAward > 0) {
        await addLessonXP(xpToAward);
      }
      try {
        setUnlockedAchievementId(await checkUnlocks(id));
      } catch (error) {
        console.error("Failed to check evaluation achievement:", error);
        setAchievementError(
          "No se pudo verificar el logro. El resultado de la evaluación sí se guardó.",
        );
      }
    } catch (error) {
      console.error("Failed to save evaluation progress:", error);
      nextActionRef.current = false;
      setIsSubmitting(false);
      const msg = "No se pudo guardar la evaluación. Inténtalo nuevamente.";
      setSubmitError(msg);
      if (Platform.OS !== "web") {
        Alert.alert("Error", msg);
      }
      return;
    }
    setIsSubmitting(false);
    setXpEarned(xpToAward);
    setShowDoneModal(true);
  }, [canAdvance, isLastPage, correctCount, totalPages, leccionId, minimumScore, db, addLessonXP, checkUnlocks, id, userId]);

  const handleConfirmExit = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setIsLeavingScreen(true);
    setShowExitModal(false);
    InteractionManager.runAfterInteractions(() => {
      navTimeoutRef.current = setTimeout(() => router.back(), 400);
    });
  }, [router]);

  const handleDone = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (unlockedAchievementId) dismissAchievement(unlockedAchievementId);
    setShowDoneModal(false);
    setIsLeavingScreen(true);
    InteractionManager.runAfterInteractions(() => router.replace("/(tabs)/evaluaciones"));
  }, [dismissAchievement, router, unlockedAchievementId]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Cargando...
        </Text>
      </View>
    );
  }

  if (pages.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {loadError ? "No se pudo cargar la evaluación" : "Evaluación no encontrada"}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: colors.primary }]}>
            Volver
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
              source={
                id?.startsWith("b")
                  ? require("@/assets/images/HeadOn.png")
                  : id?.startsWith("a")
                    ? require("@/assets/images/Winner.png")
                    : require("@/assets/images/Creative.png")
              }
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
              <Text
                style={[styles.pageIndicator, { color: colors.textSecondary }]}
              >
                {currentPage + 1}/{totalPages}
              </Text>
              <TouchableOpacity
                onPress={() => setShowExitModal(true)}
                style={[
                  styles.iconButton,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <Ionicons name="home" size={20} color={colors.textMain} />
              </TouchableOpacity>
            </View>
            <ProgressBar
              progress={
                totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0
              }
            />
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
            <View
              style={[
                styles.contentCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.pageTitle, { color: colors.primary }]}>
                {page.title}
              </Text>
              <Text style={[styles.pageContent, { color: colors.textSecondary }]}>
                Pregunta {currentPage + 1} de {totalPages}
              </Text>
            </View>

            {page.quiz && (
              <Quiz
                key={currentPage}
                quiz={page.quiz}
                onAnswer={handleQuizAnswer}
                locked={!!answeredPages[currentPage]}
                lockedAnswer={answeredPages[currentPage] ?? null}
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
                    color: canAdvance && !isSubmitting
                      ? colors.textOnPrimary
                      : colors.disabledText,
                  },
                ]}
              >
                {isLastPage
                  ? isSubmitting
                    ? "Procesando resultados..."
                    : "Finalizar evaluación"
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
      <DoneEvalModal
        visible={showDoneModal}
        correctCount={correctCount}
        totalQuestions={totalPages}
        xpEarned={xpEarned}
        evaluationTitle={evaluationTitle}
        achievementId={unlockedAchievementId}
        processingError={achievementError}
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: font.size.lg,
    marginBottom: spacing.lg,
  },
  backLink: {
    padding: spacing.md,
  },
  backLinkText: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
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
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  pageContent: {
    fontSize: font.size.base,
    lineHeight: 24,
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
