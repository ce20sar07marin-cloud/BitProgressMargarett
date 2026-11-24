import { useEffect } from "react";

import { Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, Vibration, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { font, radius, shadow, spacing } from "@/constants/theme";
import { achievements } from "@/constants/achievements";
import achievementImages from "@/data/achievements/images";
import { useAchievements } from "@/context/AchievementsContext";
import ModalBackdrop from "@/components/ModalBackdrop";

interface Props {
  visible: boolean;
  achievementId: string | null;
  onDismiss: () => void;
}

const PATTERN = [0, 100, 80, 100, 80, 200];

export default function AchievementModal({ visible, achievementId, onDismiss }: Props) {
  const colors = useColors();
  const { modalShownIds } = useAchievements();
  const achievement = achievements.find((a) => a.id === achievementId);
  const imageSource = achievement ? achievementImages[achievement.id] : undefined;

  useEffect(() => {
    if (!visible || !achievement || modalShownIds.includes(achievement.id)) {
      if (visible) onDismiss();
    }
  }, [achievement, modalShownIds, onDismiss, visible]);

  useEffect(() => {
    if (!visible || !achievement || modalShownIds.includes(achievement.id)) return;
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate(PATTERN);
      } else {
        Vibration.vibrate();
      }
    } catch (error) {
      console.warn("Could not play achievement vibration:", error);
    }
  }, [achievement, modalShownIds, visible]);

  if (!visible || !achievement || modalShownIds.includes(achievement.id)) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <ModalBackdrop />
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <Text style={[styles.headerLabel, { color: colors.primary }]}>
            ¡Logro Desbloqueado!
          </Text>

          {imageSource ? (
            <View style={[styles.imageFrame, { borderColor: colors.primary }]}>
              <Image source={imageSource} style={styles.image} resizeMode="contain" />
            </View>
          ) : null}

          <Text style={[styles.name, { color: colors.textMain }]}>
            {achievement.name}
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => onDismiss()}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>
              ¡Genial!
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
    width: "80%",
    maxWidth: 380,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.lg,
    ...shadow.lg,
  },
  headerLabel: {
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    letterSpacing: -0.3,
  },
  imageFrame: {
    width: 140,
    height: 140,
    borderRadius: radius.xl,
    borderWidth: 3,
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  name: {
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    textAlign: "center",
    letterSpacing: -0.3,
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