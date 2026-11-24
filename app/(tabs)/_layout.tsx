import { Tabs } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { useWindowDimensions, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { font } from "@/constants/theme";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const icon =
    (name: React.ComponentProps<typeof Ionicons>["name"]) =>
    function TabBarIcon({ color, size }: { focused: boolean; color: ColorValue; size: number }) {
      return <Ionicons name={name} size={size} color={color} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          display: isDesktop ? "none" : "flex",
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 4,
        },
        tabBarLabelStyle: {
          fontSize: font.size.xs - 1,
          fontWeight: font.weight.semibold,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Inicio", tabBarIcon: icon("home") }}
      />
      <Tabs.Screen
        name="evaluaciones"
        options={{ title: "Evaluar", tabBarIcon: icon("clipboard-outline") }}
      />
      <Tabs.Screen
        name="glossary"
        options={{ title: "Glosario", tabBarIcon: icon("book") }}
      />
      <Tabs.Screen
        name="calculator"
        options={{ title: "Calc", tabBarIcon: icon("calculator") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Perfil", tabBarIcon: icon("person") }}
      />
    </Tabs>
  );
}
