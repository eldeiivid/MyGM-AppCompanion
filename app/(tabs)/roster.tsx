import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useGame } from "../../src/context/GameContext"; // <--- 1. IMPORTAR CONTEXTO
import { getAllLuchadores, getAllTitles } from "../../src/database/operations";

// Componente Header Global
import { ManagementHeader } from "../../src/components/ManagementHeader";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// --- OPCIONES DE FILTRO ---
const SORT_OPTIONS = [
  { id: "Name", label: "Nombre (A-Z)" },
  { id: "RatingDesc", label: "Nivel (Mayor a Menor)" },
  { id: "RatingAsc", label: "Nivel (Menor a Mayor)" },
  { id: "Wins", label: "Más Victorias" },
  { id: "Losses", label: "Más Derrotas" },
  { id: "ContractAsc", label: "Contrato (Por Vencer)" },
];

const GENDER_OPTIONS = ["Todos", "Male", "Female"];
const ROLE_OPTIONS = ["Todos", "Face", "Heel"];
const CLASS_OPTIONS = [
  "Todos",
  "Giant",
  "Cruiser",
  "Bruiser",
  "Fighter",
  "Specialist",
];
const STATUS_OPTIONS = [
  { id: "All", label: "Ver Todos" },
  { id: "Champions", label: "Solo Campeones" },
  { id: "Draft", label: "Draft Permanente" },
  { id: "Expiring", label: "Por Vencer (<5 sem)" },
  { id: "Expired", label: "Contrato Vencido" },
];

export default function RosterScreen() {
  const router = useRouter();
  const { saveId, brandTheme } = useGame(); // <--- 2. USAR CONTEXTO

  const [roster, setRoster] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);

  // ESTADOS DE FILTRO
  const [modalVisible, setModalVisible] = useState(false);

  const [filters, setFilters] = useState({
    sortBy: "Name",
    status: "All",
    gender: "Todos",
    role: "Todos",
    fighterClass: "Todos",
  });

  const [tempFilters, setTempFilters] = useState(filters);

  // NOTA: initDatabase() ya se llama en _layout.tsx, no hace falta aquí.

  const loadData = () => {
    if (!saveId) return; // Protección

    // 3. PASAR SAVE_ID A LAS FUNCIONES
    const luchadoresData = getAllLuchadores(saveId);
    const titlesData = getAllTitles(saveId);

    setRoster(luchadoresData);
    setTitles(titlesData);
  };

  // Dentro de RosterScreen en app/(tabs)/roster.tsx
  const [isReady, setIsReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const task = setTimeout(() => {
        loadData();
        setIsReady(true);
      }, 100); // 100ms es suficiente para que la transición se vea fluida

      return () => clearTimeout(task);
    }, [])
  );

  if (!isReady) return <View style={{ flex: 1, backgroundColor: "#F5F7FA" }} />;

  const openFilterModal = () => {
    setTempFilters(filters);
    setModalVisible(true);
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setModalVisible(false);
  };

  // --- MOTOR DE FILTRADO ---
  const getProcessedRoster = () => {
    let data = [...roster];

    // 1. Filtros
    if (filters.gender !== "Todos") {
      data = data.filter((l) => l.gender === filters.gender);
    }
    if (filters.role !== "Todos") {
      data = data.filter((l) => l.crowd === filters.role);
    }
    if (filters.fighterClass !== "Todos") {
      data = data.filter((l) => l.mainClass === filters.fighterClass);
    }

    // 2. Estado
    if (filters.status === "Champions") {
      data = data.filter((l) =>
        titles.some((t) => t.holderId1 === l.id || t.holderId2 === l.id)
      );
    } else if (filters.status === "Draft") {
      data = data.filter((l) => l.isDraft === 1);
    } else if (filters.status === "Expiring") {
      data = data.filter(
        (l) => l.isDraft === 0 && l.weeksLeft <= 5 && l.weeksLeft > 0
      );
    } else if (filters.status === "Expired") {
      data = data.filter((l) => l.isDraft === 0 && l.weeksLeft <= 0);
    }

    // 3. Ordenamiento
    data.sort((a, b) => {
      switch (filters.sortBy) {
        case "Name":
          return a.name.localeCompare(b.name);
        case "RatingDesc":
          return (b.ringLevel || 0) - (a.ringLevel || 0);
        case "RatingAsc":
          return (a.ringLevel || 0) - (b.ringLevel || 0);
        case "Wins":
          return b.normalWins - a.normalWins;
        case "Losses":
          return b.normalLosses - a.normalLosses;
        case "ContractAsc":
          if (a.isDraft === 1) return 1;
          if (b.isDraft === 1) return -1;
          return a.weeksLeft - b.weeksLeft;
        default:
          return 0;
      }
    });

    return data;
  };

  const filteredData = getProcessedRoster();

  // --- HELPERS ---
  const getChampionTitle = (luchadorId: number) => {
    return titles.find(
      (t) => t.holderId1 === luchadorId || t.holderId2 === luchadorId
    );
  };

  // --- HELPER COMPONENT ---
  const RenderChip = ({
    label,
    value,
    selectedValue,
    defaultValue,
    onPress,
  }: any) => {
    const isSelected = value === selectedValue;
    const isDefault = value === defaultValue;

    return (
      <TouchableOpacity
        style={[
          styles.chip,
          isSelected &&
            (isDefault
              ? styles.chipDefaultSelected
              : {
                  backgroundColor: brandTheme, // 4. USAR COLOR TEMA
                  borderColor: brandTheme,
                }),
        ]}
        onPress={onPress}
      >
        <Text
          style={[
            styles.chipText,
            isSelected &&
              (isDefault
                ? styles.chipTextDefaultSelected
                : styles.chipTextActive),
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCard = ({ item }: { item: any }) => {
    const isExpired = item.isDraft === 0 && item.weeksLeft <= 0;
    const activeTitle = getChampionTitle(item.id);
    const weeks = item.weeksLeft || 0;

    let contractColor = "#10B981";
    if (weeks <= 5) contractColor = "#EF4444";
    else if (weeks <= 10) contractColor = "#F59E0B";
    if (item.isDraft === 1) contractColor = "#3B82F6";

    const isHeel = item.crowd === "Heel";
    const alignColor = isHeel ? "#EF4444" : "#3B82F6";
    const genderIcon =
      item.gender === "Female" ? "gender-female" : "gender-male";
    const genderColor = item.gender === "Female" ? "#EC4899" : "#3B82F6";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`../luchador/${item.id}`)}
        style={[styles.cardContainer, isExpired && { opacity: 0.6 }]}
      >
        <View style={styles.cardInner}>
          <View style={styles.imageContainer}>
            {item.imageUri ? (
              <Image
                source={{ uri: item.imageUri }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[styles.placeholder, { backgroundColor: "#F1F5F9" }]}
              >
                <Text style={styles.placeholderText}>
                  {item.name.charAt(0)}
                </Text>
              </View>
            )}

            <View style={styles.ringLevelBadge}>
              <Text style={styles.ringLevelText}>{item.ringLevel || 50}</Text>
            </View>

            <View
              style={[styles.genderBadge, { backgroundColor: genderColor }]}
            >
              <MaterialCommunityIcons
                name={genderIcon}
                size={12}
                color="white"
              />
            </View>
          </View>

          <View style={styles.infoContainer}>
            {activeTitle ? (
              <LinearGradient
                colors={["#F59E0B", "#B45309"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.champBanner}
              >
                <Ionicons name="trophy" size={10} color="white" />
                <Text style={styles.champBannerText} numberOfLines={1}>
                  {activeTitle.name}
                </Text>
              </LinearGradient>
            ) : (
              <View style={{ height: 4 }} />
            )}

            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>

            <View style={styles.statsRow}>
              <View
                style={[
                  styles.alignBadge,
                  { borderColor: alignColor, marginRight: 6 },
                ]}
              >
                <Text style={[styles.alignText, { color: alignColor }]}>
                  {item.crowd.toUpperCase().slice(0, 4)}
                </Text>
              </View>
              <Text style={styles.classText}>{item.mainClass}</Text>
              <View style={{ flex: 1 }} />
              <Text style={styles.recordText}>
                <Text style={{ color: "#10B981" }}>{item.normalWins}W</Text>-
                <Text style={{ color: "#EF4444" }}>{item.normalLosses}L</Text>
              </Text>
            </View>

            <View style={{ marginTop: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <Text style={styles.contractLabel}>Contrato</Text>
                <Text style={[styles.contractValue, { color: contractColor }]}>
                  {item.isDraft === 1 ? "∞" : `${weeks} sem.`}
                </Text>
              </View>
              {item.isDraft === 0 && (
                <View style={styles.contractBarBg}>
                  <View
                    style={[
                      styles.contractBarFill,
                      {
                        width: `${Math.min((weeks / 25) * 100, 100)}%`,
                        backgroundColor: contractColor,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <ManagementHeader />

      {/* SUB-HEADER */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.headerTitle}>Mi Roster</Text>
          <Text style={styles.headerSubtitle}>
            {filteredData.length} Talentos encontrados
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={openFilterModal}
            style={[
              styles.iconBtn,
              (filters.status !== "All" ||
                filters.gender !== "Todos" ||
                filters.sortBy !== "Name") && {
                borderColor: brandTheme, // TEMA
                backgroundColor: "#EFF6FF", // Podríamos ajustar esto también, pero azul claro suele quedar bien
              },
            ]}
          >
            <Ionicons
              name="filter"
              size={20}
              color={
                filters.status !== "All" ||
                filters.gender !== "Todos" ||
                filters.sortBy !== "Name"
                  ? brandTheme // TEMA
                  : "#64748B"
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/titles/manage")}
            style={styles.iconBtn}
          >
            <Ionicons name="trophy" size={20} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              No hay talentos con estos filtros.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("../luchador/new")}
      >
        <LinearGradient
          // TEMA PARA EL BOTÓN +
          colors={[brandTheme, "#1E293B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={30} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* --- MODAL DE FILTROS --- */}
      <Modal
        animationType="slide"
        visible={modalVisible}
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtrar y Ordenar</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text
                style={{ color: brandTheme, fontSize: 16, fontWeight: "600" }}
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.sectionLabel}>ORDENAR POR</Text>
            <View style={styles.chipsContainer}>
              {SORT_OPTIONS.map((opt) => (
                <RenderChip
                  key={opt.id}
                  label={opt.label}
                  value={opt.id}
                  selectedValue={tempFilters.sortBy}
                  defaultValue="Name"
                  onPress={() =>
                    setTempFilters({ ...tempFilters, sortBy: opt.id })
                  }
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>ESTADO DEL CONTRATO</Text>
            <View style={styles.chipsContainer}>
              {STATUS_OPTIONS.map((opt) => (
                <RenderChip
                  key={opt.id}
                  label={opt.label}
                  value={opt.id}
                  selectedValue={tempFilters.status}
                  defaultValue="All"
                  onPress={() =>
                    setTempFilters({ ...tempFilters, status: opt.id })
                  }
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>GÉNERO</Text>
            <View style={styles.chipsContainer}>
              {GENDER_OPTIONS.map((opt) => (
                <RenderChip
                  key={opt}
                  label={opt}
                  value={opt}
                  selectedValue={tempFilters.gender}
                  defaultValue="Todos"
                  onPress={() =>
                    setTempFilters({ ...tempFilters, gender: opt })
                  }
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>BANDO / ROL</Text>
            <View style={styles.chipsContainer}>
              {ROLE_OPTIONS.map((opt) => (
                <RenderChip
                  key={opt}
                  label={opt}
                  value={opt}
                  selectedValue={tempFilters.role}
                  defaultValue="Todos"
                  onPress={() => setTempFilters({ ...tempFilters, role: opt })}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>ESTILO DE LUCHA</Text>
            <View style={styles.chipsContainer}>
              {CLASS_OPTIONS.map((opt) => (
                <RenderChip
                  key={opt}
                  label={opt}
                  value={opt}
                  selectedValue={tempFilters.fighterClass}
                  defaultValue="Todos"
                  onPress={() =>
                    setTempFilters({ ...tempFilters, fighterClass: opt })
                  }
                />
              ))}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() =>
                setTempFilters({
                  sortBy: "Name",
                  status: "All",
                  gender: "Todos",
                  role: "Todos",
                  fighterClass: "Todos",
                })
              }
            >
              <Text style={styles.resetText}>Restablecer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: brandTheme }]}
              onPress={applyFilters}
            >
              <Text style={styles.applyText}>
                Ver {filteredData.length} Resultados
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  // Header
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    marginTop: 0,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  headerSubtitle: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  iconBtn: {
    padding: 8,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // Grid
  gridContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 5 },

  // CARD DESIGN
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 16,
    backgroundColor: "white",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  cardInner: { overflow: "hidden", borderRadius: 20 },

  imageContainer: {
    height: 120,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cardImage: { width: "100%", height: "100%" },
  placeholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: 24, fontWeight: "bold", color: "#94A3B8" },

  ringLevelBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  ringLevelText: { color: "white", fontWeight: "bold", fontSize: 10 },

  genderBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  infoContainer: { padding: 12, paddingTop: 8 },

  champBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    gap: 4,
  },
  champBannerText: {
    color: "white",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    flex: 1,
  },

  cardName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  recordBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recordText: { fontSize: 10, fontWeight: "700" },

  alignBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  alignText: { fontSize: 9, fontWeight: "800" },
  classText: { fontSize: 10, color: "#64748B", fontWeight: "600" },

  contractLabel: { fontSize: 9, color: "#94A3B8", fontWeight: "600" },
  contractValue: { fontSize: 9, fontWeight: "700" },
  contractBarBg: {
    height: 3,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginTop: 2,
  },
  contractBarFill: { height: "100%", borderRadius: 2 },

  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "#94A3B8", marginTop: 10, fontSize: 14 },

  fab: { position: "absolute", bottom: 110, right: 20, zIndex: 50 },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 50,
  },

  // MODAL STYLES
  modalContent: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  // CHIP STYLES
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipText: { fontSize: 12, fontWeight: "600", color: "#64748B" },

  // Active (Selected but NOT default)
  // Nota: Esto se sobreescribe en linea en el componente RenderChip para usar brandTheme

  chipTextActive: { color: "white" },

  // Default Selected (Selected but IS default) - Discrete
  chipDefaultSelected: {
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
  },
  chipTextDefaultSelected: { color: "#334155", fontWeight: "bold" },

  modalFooter: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    gap: 15,
  },
  resetBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  resetText: { fontWeight: "600", color: "#64748B" },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    // Background color dinámico en el render
    justifyContent: "center",
    alignItems: "center",
  },
  applyText: { fontWeight: "bold", color: "white", fontSize: 16 },
});
