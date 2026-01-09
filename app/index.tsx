import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { BRANDS } from "../src/constants/brands";
import { useGame } from "../src/context/GameContext";
import {
  createNewSave,
  deleteSave,
  getAllSaves,
} from "../src/database/operations";

const { width } = Dimensions.get("window");

export default function SetupScreen() {
  const router = useRouter();
  const { setGameSession } = useGame();

  const [saves, setSaves] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Formulario
  const [gmName, setGmName] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedBrand, setSelectedBrand] = useState(BRANDS[0]);

  const loadSaves = useCallback(() => {
    const data = getAllSaves();
    setSaves(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSaves();
    }, [])
  );

  const handleCreate = () => {
    if (!gmName || !budget)
      return Alert.alert(
        "Faltan Datos",
        "Por favor completa el nombre y el presupuesto."
      );

    const cash = parseFloat(budget.replace(/,/g, ""));
    const saveId = createNewSave(
      gmName,
      selectedBrand.name,
      cash,
      selectedBrand.color
    );

    if (saveId) {
      setModalVisible(false);
      setGmName("");
      setBudget("");
      enterGame(saveId, selectedBrand.color);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Eliminar Oficina",
      "Esta acción no se puede deshacer. ¿Borrar partida?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            deleteSave(id);
            loadSaves();
          },
        },
      ]
    );
  };

  const enterGame = (id: number, theme: string) => {
    setGameSession(id, theme);
    router.replace("/(tabs)");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* HEADER ELEGANTE */}
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>MY GM</Text>
            <Text style={styles.titleHighlight}>MANAGER</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="briefcase" size={24} color="white" />
          </View>
        </View>
        <Text style={styles.subtitle}>
          Selecciona tu oficina para continuar
        </Text>
      </SafeAreaView>

      {/* LISTA DE PARTIDAS */}
      <FlatList
        data={saves}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="folder-open" size={40} color="#64748B" />
            </View>
            <Text style={styles.emptyText}>No hay partidas guardadas</Text>
            <Text style={styles.emptySubText}>
              Crea una nueva para comenzar tu legado.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => enterGame(item.id, item.themeColor)}
            style={styles.cardWrapper}
          >
            <LinearGradient
              // Gradiente sutil basado en el color de la marca
              colors={["#1E293B", "#0F172A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.saveCard, { borderLeftColor: item.themeColor }]}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.brandBadge, { color: item.themeColor }]}>
                    {item.brand.toUpperCase()}
                  </Text>
                  <Text style={styles.weekBadge}>
                    SEMANA {item.currentWeek}
                  </Text>
                </View>

                <Text style={styles.saveName} numberOfLines={1}>
                  {item.name}
                </Text>

                <View style={styles.cashRow}>
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={16}
                    color="#10B981"
                  />
                  <Text style={styles.saveCash}>
                    ${item.currentCash.toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />

      {/* FAB - NUEVA PARTIDA */}
      <TouchableOpacity
        style={styles.fabContainer}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient colors={["#3B82F6", "#2563EB"]} style={styles.fab}>
          <Ionicons name="add" size={32} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* MODAL DE CREACIÓN MEJORADO */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardView}
            >
              <View
                style={[
                  styles.modalContent,
                  { borderTopColor: selectedBrand.color },
                ]}
              >
                {/* Barra de agarre visual */}
                <View style={styles.handleBar} />

                <Text style={styles.modalTitle}>Crear Nueva Oficina</Text>

                {/* 1. SELECCIONAR MARCA */}
                <Text style={styles.label}>SELECCIONA TU MARCA</Text>
                <View style={styles.brandContainer}>
                  {BRANDS.map((brand) => {
                    const isSelected = selectedBrand.id === brand.id;
                    return (
                      <TouchableOpacity
                        key={brand.id}
                        style={[
                          styles.brandOption,
                          isSelected && {
                            backgroundColor: brand.color,
                            borderColor: brand.color,
                            transform: [{ scale: 1.05 }],
                          },
                        ]}
                        onPress={() => setSelectedBrand(brand)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.brandOptionText,
                            isSelected
                              ? { color: "white" }
                              : { color: "#94A3B8" },
                          ]}
                        >
                          {brand.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 2. NOMBRE */}
                <Text style={styles.label}>NOMBRE DEL GM</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person"
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Adam Pearce"
                    placeholderTextColor="#475569"
                    value={gmName}
                    onChangeText={setGmName}
                    returnKeyType="next"
                  />
                </View>

                {/* 3. PRESUPUESTO */}
                <Text style={styles.label}>PRESUPUESTO INICIAL</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="cash"
                    size={20}
                    color="#10B981"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 2,750,000"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    value={budget}
                    onChangeText={setBudget}
                    returnKeyType="done"
                  />
                </View>

                {/* BOTONES */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.createBtn,
                      { backgroundColor: selectedBrand.color },
                    ]}
                    onPress={handleCreate}
                  >
                    <Text style={styles.createBtnText}>COMENZAR</Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// Componente auxiliar para SafeAreaView en Android
const SafeAreaView = ({ style, children }: any) => (
  <View style={[styles.safeAreaBase, style]}>{children}</View>
);

const styles = StyleSheet.create({
  safeAreaBase: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1, backgroundColor: "#0F172A" },

  // HEADER
  header: {
    paddingHorizontal: 24,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "300", // Light
    color: "white",
    letterSpacing: 2,
  },
  titleHighlight: {
    fontSize: 32,
    fontWeight: "900", // Heavy
    color: "white",
    marginTop: -5,
    letterSpacing: 1,
  },
  headerIcon: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
  },

  // LISTA
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },

  emptyState: { alignItems: "center", marginTop: 80 },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: { color: "white", fontSize: 18, fontWeight: "bold" },
  emptySubText: { color: "#64748B", marginTop: 5, fontSize: 14 },

  // TARJETA DE SAVE
  cardWrapper: {
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveCard: {
    borderRadius: 16,
    borderLeftWidth: 6,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },
  brandBadge: { fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  weekBadge: {
    fontSize: 10,
    color: "#64748B",
    backgroundColor: "#0F172A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },

  saveName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 6,
  },

  cashRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  saveCash: { fontSize: 16, fontWeight: "600", color: "#E2E8F0" },

  deleteBtn: {
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    marginLeft: 10,
  },

  // FAB
  fabContainer: { position: "absolute", bottom: 40, right: 24 },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)", // Fondo más oscuro
    justifyContent: "flex-end",
  },
  keyboardView: { width: "100%" },
  modalContent: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    borderTopWidth: 4, // Toque de color de marca arriba
    paddingBottom: 50,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "white",
    marginBottom: 25,
    textAlign: "center",
  },

  label: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 1,
  },

  // MARCAS (Botones)
  brandContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 25,
  },
  brandOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#334155",
    backgroundColor: "#0F172A",
  },
  brandOptionText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // INPUTS CON ICONOS
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  inputIcon: { paddingLeft: 16 },
  input: {
    flex: 1,
    color: "white",
    padding: 16,
    fontSize: 16,
    fontWeight: "600",
  },

  // BOTONES ACCION
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    gap: 15,
  },
  cancelBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  cancelText: { color: "#94A3B8", fontWeight: "600" },
  createBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  createBtnText: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  safeArea: {
    marginBottom: 20, // Espacio debajo del header
  },
});
