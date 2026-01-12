import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GameProvider, useGame } from "../src/context/GameContext";
import { initDatabase } from "../src/database/db";

function RootLayoutNav() {
  const { saveId } = useGame();
  const segments = useSegments();
  const router = useRouter();

  // 1. Estado para saber si la app ya cargó
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // 2. No hacer nada si no está montado
    if (!isMounted) return;

    const inTabsGroup = segments[0] === "(tabs)";

    // CASO A: Usuario hace Logout (saveId es null) pero sigue en Tabs
    if (saveId === null && inTabsGroup) {
      router.replace("/");
    }
    // CASO B: Usuario hace Login (saveId tiene valor) y está en el Login (root)
    else if (saveId !== null && segments[0] === undefined) {
      // Nota: segments[0] undefined significa que estás en la ruta "/" (index.tsx)
      router.replace("/(tabs)");
    }
  }, [saveId, segments, isMounted]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F7FA" },
        // Usamos 'fade' o 'default' según prefieras, 'fade' se ve bien en login
        animation: Platform.OS === "ios" ? "default" : "fade",
        freezeOnBlur: true,
        gestureEnabled: false, // Evita volver atrás con gestos en el login
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GameProvider>
        <StatusBar barStyle="dark-content" />
        <RootLayoutNav />
      </GameProvider>
    </GestureHandlerRootView>
  );
}
