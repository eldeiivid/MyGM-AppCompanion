import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import { useGame } from "../context/GameContext"; // <--- 1. IMPORTAR CONTEXTO
import { getCurrentShowCost, getGameState } from "../database/operations";

export const ManagementHeader = () => {
  const { saveId, brandTheme } = useGame(); // <--- 2. USAR CONTEXTO
  const [state, setState] = useState({ currentWeek: 1, currentCash: 0 });
  const [showCost, setShowCost] = useState(0);

  const refreshData = useCallback(() => {
    if (!saveId) return;

    // 3. PASAR SAVE_ID
    const gameState: any = getGameState(saveId);
    const cost = getCurrentShowCost(saveId);

    if (gameState) {
      setState({
        currentWeek: gameState.currentWeek,
        currentCash: gameState.currentCash,
      });
    }
    setShowCost(cost);
  }, [saveId]);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData])
  );

  if (!saveId) return null;

  return (
    <View
      style={[
        styles.container,
        // 4. APLICAR TEMA: Borde inferior del color de la marca
        { borderBottomColor: brandTheme },
      ]}
    >
      <View style={styles.safeArea} />

      <View style={styles.content}>
        {/* BLOQUE 1: SEMANA */}
        <View style={styles.section}>
          <Text style={styles.label}>SEMANA</Text>
          <View style={styles.row}>
            {/* Icono del color de la marca */}
            <Ionicons name="calendar" size={14} color={brandTheme} />
            <Text style={styles.valueLarge}>{state.currentWeek}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* BLOQUE 2: FINANZAS (CAJA) */}
        <View style={[styles.section, { flex: 2 }]}>
          <Text style={styles.label}>PRESUPUESTO DISPONIBLE</Text>
          <Text
            style={[
              styles.value,
              { color: state.currentCash < 0 ? "#EF4444" : "#10B981" }, // Verde/Rojo moderno
            ]}
          >
            ${state.currentCash.toLocaleString()}
          </Text>
        </View>

        {/* BLOQUE 3: COSTO SHOW (GASTO CORRIENTE) */}
        {showCost > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.sectionEnd}>
              <Text style={styles.label}>COSTO SHOW</Text>
              <Text style={styles.expenseValue}>
                -${showCost.toLocaleString()}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E293B", // Slate-800 (Coincide con el nuevo diseño oscuro)
    borderBottomWidth: 3, // Borde más grueso para resaltar el color de la marca
    zIndex: 100,
    elevation: 4,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  safeArea: {
    height: 0,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: "space-between",
  },
  section: {
    justifyContent: "center",
  },
  sectionEnd: {
    alignItems: "flex-end",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "#334155", // Slate-700
    marginHorizontal: 15,
  },
  label: {
    fontSize: 10,
    color: "#94A3B8", // Slate-400
    fontWeight: "bold",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    fontVariant: ["tabular-nums"],
  },
  valueLarge: {
    fontSize: 20,
    fontWeight: "900",
    color: "white",
  },
  expenseValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#EF4444", // Rojo alerta
  },
});
