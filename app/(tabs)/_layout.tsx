import {
  Ionicons,
  MaterialCommunityIcons as Material,
} from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useGame } from "../../src/context/GameContext";

const TABS = [
  { name: "index", Icon: Ionicons, icon: "home", size: 24 },
  { name: "roster", Icon: Material, icon: "shield-star", size: 26 },
  { name: "show", Icon: Ionicons, icon: "film", size: 24 },
  { name: "finances", Icon: Ionicons, icon: "stats-chart", size: 22 },
];

export default function TabLayout() {
  const { brandTheme } = useGame();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // Colores: Activo usa tu tema, inactivo un gris más sutil
        tabBarActiveTintColor: brandTheme || "#FFF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.6)",

        // Estilos de la barra flotante
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,

        // Fondo Glassmorphism (Efecto Apple Music)
        tabBarBackground: () => (
          <View style={styles.blurWrap}>
            <BlurView
              intensity={20} // Blur intenso
              tint="dark" // Tinte oscuro nativo
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
      }}
    >
      {TABS.map(({ name, Icon, icon, size }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View
                style={[
                  styles.iconContainer,
                  // Efecto sutil de fondo cuando está activo (como Apple Music)
                  focused && { backgroundColor: "rgba(255,255,255,0.12)" },
                ]}
              >
                {/* @ts-ignore */}
                <Icon name={icon as any} size={size} color={color} />
              </View>
            ),
          }}
        />
      ))}
      <Tabs.Screen name="history" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 30,
    // --- SOLUCIÓN RESPONSIVE (Estilo Apple Music) ---
    left: 40, // Margen izquierdo
    right: 40, // Margen derecho (Define el ancho automáticamente y centra)
    // ------------------------------------------------
    height: 70, // Altura un poco mayor para dar presencia
    borderRadius: 35, // Bordes completamente redondos (Cápsula)
    backgroundColor: "transparent", // Transparente para ver el Blur
    borderTopWidth: 0,
    elevation: 0, // Quitamos elevación nativa

    // Sombra suave para profundidad
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    marginLeft: 40,
    marginRight: 40,
  },
  item: {
    height: 70, // Coincide con la barra
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 15 : 0,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
  },
  blurWrap: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35, // Debe coincidir con 'bar'
    overflow: "hidden", // Recorta el blur a la forma de cápsula

    // FONDO SEMI-SÓLIDO (Clave para que se vea oscuro y no transparente)
    backgroundColor: "rgba(53, 53, 53, 0.2)",

    // Borde muy fino y sutil
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
});
