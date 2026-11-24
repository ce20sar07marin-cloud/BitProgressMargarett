import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import DotGridBackground from "@/components/DotGridBackground";
import { useColors } from "@/hooks/useColors";

interface ScreenBackgroundProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenBackground({
  children,
  style,
}: ScreenBackgroundProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        style,
        { backgroundColor: colors.background },
      ]}
    >
      <DotGridBackground />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  content: {
    flex: 1,
    position: "relative",
    zIndex: 1,
  },
});
