import "react-native-get-random-values";

import React, { Suspense, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { BlurTargetView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { DatabaseProvider } from "@/database/DatabaseProvider";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import { FavoritesProvider } from "@/context/FavoritesContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { XPProvider } from "@/context/XPContext";
import { AchievementsProvider } from "@/context/AchievementsContext";
import { UserProvider, useUser } from "@/context/UserContext";
import DotGridBackground from "@/components/DotGridBackground";
import { ModalBlurTargetContext } from "@/components/ModalBackdrop";
import AdaptiveSidebar from "@/components/AdaptiveSidebar";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync().catch((error) => {
    console.warn("Could not keep the native splash screen visible:", error);
  });
}

// @ts-ignore – legacy defaultProps used for global font
Text.defaultProps = Text.defaultProps || {};
// @ts-ignore
Text.defaultProps.style = { fontFamily: "Poppins_400Regular" };

const LESSON_IDS = ["b1", "b2", "b3", "i1", "i2", "i3", "a1", "a2", "a3"];

function AppContent() {
  const { userId, isLoading } = useUser();
  const { isDark } = useTheme();
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const blurTargetRef = useRef<View | null>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const showSidebar = isDesktop && segments[0] !== "login";

  useEffect(() => {
    if (isLoading) return;
    if (!userId) {
      router.replace("/login");
    }
  }, [userId, isLoading, router]);

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={[
          styles.responsiveContainer,
          {
            flexDirection: isDesktop ? "row" : "column",
            maxWidth: isDesktop ? undefined : 768,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        {showSidebar && <AdaptiveSidebar />}
        <BlurTargetView
          ref={blurTargetRef}
          style={[
            styles.appContent,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <ModalBlurTargetContext.Provider value={blurTargetRef}>
            <DotGridBackground />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "transparent" },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="login" options={{ animation: "fade" }} />
              {LESSON_IDS.map((id) => (
                <Stack.Screen
                  key={id}
                  name={`lesson/${id}`}
                  options={{ animation: "slide_from_right" }}
                />
              ))}
              <Stack.Screen
                name="evaluation/[id]"
                options={{
                  animation: "slide_from_right",
                }}
              />
            </Stack>
          </ModalBlurTargetContext.Provider>
        </BlurTargetView>
      </View>
    </View>
  );
}

class RootErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled app render error:", error, info.componentStack);
    if (Platform.OS !== "web") {
      SplashScreen.hideAsync().catch((splashError) => {
        console.warn("Could not hide the native splash screen:", splashError);
      });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>La aplicación encontró un error</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.error(
        "Failed to load Poppins fonts; continuing to render the app.",
        fontError,
      );
    }
  }, [fontError]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== "web") {
      SplashScreen.hideAsync().catch((error) => {
        console.warn("Could not hide the native splash screen:", error);
      });
    }
  }, [fontsLoaded, fontError]);

  return (
    <View style={styles.root}>
      <DatabaseProvider>
        {fontsLoaded || fontError ? (
          <ThemeProvider>
            <UserProvider>
              <Suspense
                fallback={
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                  </View>
                }
              >
                <XPProvider>
                  <FavoritesProvider>
                    <AchievementsProvider>
                      <AppContent />
                    </AchievementsProvider>
                  </FavoritesProvider>
                </XPProvider>
              </Suspense>
            </UserProvider>
          </ThemeProvider>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </DatabaseProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <RootLayoutContent />
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  outerContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  responsiveContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  appContent: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#ffffff",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#b42318",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 8,
    color: "#344054",
    textAlign: "center",
  },
});
