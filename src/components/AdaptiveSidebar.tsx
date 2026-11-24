import { usePathname, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { font, radius, spacing } from "@/constants/theme";
import { useColors } from "@/hooks/useColors";

const items: {
  label: string;
  href: Href;
  tab: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { label: "Inicio", href: "/(tabs)", tab: "index", icon: "home" },
  {
    label: "Evaluar",
    href: "/(tabs)/evaluaciones",
    tab: "evaluaciones",
    icon: "clipboard-outline",
  },
  {
    label: "Glosario",
    href: "/(tabs)/glossary",
    tab: "glossary",
    icon: "book",
  },
  {
    label: "Calc",
    href: "/(tabs)/calculator",
    tab: "calculator",
    icon: "calculator",
  },
  {
    label: "Perfil",
    href: "/(tabs)/profile",
    tab: "profile",
    icon: "person",
  },
];

export default function AdaptiveSidebar() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = pathname.includes("/lesson/")
    ? "index"
    : pathname.includes("/evaluation/") || pathname.endsWith("/evaluaciones")
      ? "evaluaciones"
      : pathname.endsWith("/glossary")
        ? "glossary"
        : pathname.endsWith("/calculator")
          ? "calculator"
          : pathname.endsWith("/profile")
            ? "profile"
            : "index";

  return (
    <View
      style={[
        styles.sidebar,
        { backgroundColor: colors.surface, borderRightColor: colors.border },
      ]}
    >
      <View style={styles.brand}>
        <Text style={[styles.title, { color: colors.textMain }]}>
          BitProgress
        </Text>
      </View>
      <View style={styles.navigation}>
        {items.map((item) => {
          const active = activeTab === item.tab;
          return (
            <TouchableOpacity
              key={item.tab}
              onPress={() => router.navigate(item.href)}
              style={[
                styles.navigationItem,
                {
                  backgroundColor: active ? colors.primarySoft : "transparent",
                },
              ]}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.navigationLabel,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
  },
  navigation: {
    gap: spacing.xs,
  },
  navigationItem: {
    minHeight: 48,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  navigationLabel: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
  },
});
