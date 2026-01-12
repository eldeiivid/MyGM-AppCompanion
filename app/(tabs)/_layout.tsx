import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useGame } from "../../src/context/GameContext";

export default function TabLayout() {
  const { brandTheme } = useGame();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brandTheme || "#EF4444",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarShowLabel: false,
        // Configuración crítica para el centrado
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () => (
          <View style={styles.blurContainer}>
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="shield-star"
              size={28}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="show"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="film" size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="stats-chart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="history" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 30, // Elevación sobre el borde
    left: 50, // Más estrecha para que parezca cápsula
    right: 50,
    height: 64, // Altura fija
    borderRadius: 32,
    backgroundColor: "transparent",
    borderTopWidth: 0,
    elevation: 0,
    paddingBottom: 0, // RESET de iOS: Esto evita que se suban los iconos
    marginBottom: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  tabBarItem: {
    // Forzamos el centrado vertical absoluto del contenedor del icono
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Platform.OS === "ios" ? 0 : 0, // Ignoramos el safe area automático
    top: 10,
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)", // Brillo sutil de cristal
  },
});
