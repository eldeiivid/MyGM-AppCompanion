import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { useGame } from "../../src/context/GameContext";

export default function TabLayout() {
  const { brandTheme } = useGame();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,

        // --- CLAVE PARA LA FLUIDEZ ---
        // 'fade' o 'slide_from_right' hacen que el cambio no sea un salto seco
        animation: "fade",

        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 30 : 20,
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: "#ffffff",
          borderRadius: 25,
          height: 65,
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="home" color={brandTheme} />
          ),
        }}
      />

      <Tabs.Screen
        name="roster"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="people" color={brandTheme} />
          ),
        }}
      />

      <Tabs.Screen
        name="show"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="calendar" color={brandTheme} />
          ),
        }}
      />

      <Tabs.Screen
        name="finances"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="wallet" color={brandTheme} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} name="time" color={brandTheme} />
          ),
        }}
      />
    </Tabs>
  );
}

// --- COMPONENTE ICONO ANIMADO MEJORADO ---
const TabIcon = ({
  focused,
  name,
  color,
}: {
  focused: boolean;
  name: any;
  color: string;
}) => {
  const animVal = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animVal, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false, // false para animar colores y sombras
      friction: 7,
      tension: 70,
    }).start();
  }, [focused]);

  const translateY = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12], // Salto más sutil para no verse exagerado
  });

  const backgroundColor = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ["transparent", color],
  });

  const scale = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        style={[
          styles.bubble,
          {
            transform: [{ translateY }, { scale }],
            backgroundColor,
            shadowColor: color,
            shadowOpacity: focused ? 0.4 : 0,
          },
        ]}
      >
        <Ionicons
          name={focused ? name : `${name}-outline`}
          size={24}
          color={focused ? "white" : "#94A3B8"}
        />
      </Animated.View>
      {focused && (
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: color, opacity: animVal },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: "100%",
  },
  bubble: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  indicator: {
    position: "absolute",
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
