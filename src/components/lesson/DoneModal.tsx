import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { font, radius, shadow, spacing } from "@/constants/theme";
import ModalBackdrop from "@/components/ModalBackdrop";

interface Props {
  visible: boolean;
  lessonTitle: string;
  xpEarned: number;
  percentage?: number | null;
  disabled?: boolean;
  onConfirm: () => void;
}

function sanitizeNumber(value: unknown, min: number, max?: number): number {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return min;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return min;
  const rounded = Math.round(numeric);
  const aboveMin = Math.max(min, rounded);
  return max !== undefined ? Math.min(max, aboveMin) : aboveMin;
}

export default function DoneModal({
  visible,
  lessonTitle,
  xpEarned,
  percentage = 100,
  disabled = false,
  onConfirm,
}: Props) {
  const colors = useColors();
  const safePercentage = sanitizeNumber(percentage, 0, 100);
  const safeXp = sanitizeNumber(xpEarned, 0);
  const safeTitle =
    typeof lessonTitle === "string" && lessonTitle.trim().length > 0
      ? lessonTitle.trim()
      : "Lección";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
    >
      <View style={styles.overlay}>
        <ModalBackdrop />
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={[styles.xpBadge, { backgroundColor: colors.primarySoft }]}>
            <Image source={require("@/assets/images/XPtotal.png")} style={styles.xpImage} />
            <Text style={[styles.xpAmount, { color: colors.primary }]}>+{safeXp} XP</Text>
          </View>

          <Text style={[styles.scoreValue, { color: colors.primary }]}>{safePercentage}%</Text>
          <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
            Resultado obtenido
          </Text>

          <Text style={[styles.title, { color: colors.textMain }]}>¡Lección completada!</Text>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Felicidades, completaste &quot;{safeTitle}&quot;. Sigue aprendiendo para dominar las redes.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, opacity: disabled ? 0.6 : 1 }]}
            onPress={onConfirm}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>
              {disabled ? "Volviendo..." : "Volver al inicio"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    maxWidth: 400,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: "center",
    ...shadow.lg,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  xpImage: {
    width: 44,
    height: 44,
  },
  xpAmount: {
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: font.weight.bold,
    lineHeight: 46,
  },
  scoreLabel: {
    fontSize: font.size.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  message: {
    fontSize: font.size.md,
    marginBottom: spacing.xl,
    lineHeight: 22,
    textAlign: "center",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    width: "100%",
    alignItems: "center",
    ...shadow.sm,
  },
  buttonText: {
    fontSize: font.size.base,
    fontWeight: font.weight.bold,
  },
});
