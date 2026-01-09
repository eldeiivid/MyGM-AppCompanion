import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Platform, StatusBar } from "react-native";
import { GameProvider, useGame } from "../src/context/GameContext";
import { initDatabase } from "../src/database/db";

function RootLayoutNav() {
  const { saveId } = useGame();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const currentSegments = segments as any;
    const isAtRoot =
      !currentSegments ||
      currentSegments.length === 0 ||
      currentSegments[0] === "" ||
      currentSegments[0] === "(index)";
    const inTabsGroup = currentSegments[0] === "(tabs)";

    if (saveId === null && inTabsGroup) {
      router.replace("/");
    } else if (saveId !== null && isAtRoot) {
      router.replace("/(tabs)");
    }
  }, [saveId, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // CLAVE: Evita el parpadeo blanco entre cambios de pantalla
        contentStyle: { backgroundColor: "#F5F7FA" },
        // Animación fluida tipo iOS para todas las pantallas
        animation: Platform.OS === "ios" ? "default" : "slide_from_right",
        // Optimización de rendimiento
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />

      {/* Modales con animación dedicada */}
      <Stack.Screen
        name="luchador/new"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="planner"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <GameProvider>
      <StatusBar barStyle="dark-content" />
      <RootLayoutNav />
    </GameProvider>
  );
}
