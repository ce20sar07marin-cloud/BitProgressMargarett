import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

import { useTheme } from "@/context/ThemeContext";

import type { RefObject } from "react";
import type { View as NativeView } from "react-native";
import { createContext } from "react";

export const ModalBlurTargetContext =
  createContext<RefObject<NativeView | null> | null>(null);

export default function ModalBackdrop() {
  const { isDark } = useTheme();

  if (Platform.OS === "android") {
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? "rgba(15, 11, 31, 0.72)"
              : "rgba(25, 18, 56, 0.45)",
          },
        ]}
      />
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <BlurView
        intensity={22}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? "rgba(109,74,255,0.22)"
              : "rgba(109,74,255,0.14)",
          },
        ]}
      />
    </View>
  );
}
