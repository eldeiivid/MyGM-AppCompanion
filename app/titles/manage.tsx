import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ManagementHeader } from "../../src/components/ManagementHeader";
import { useGame } from "../../src/context/GameContext"; // <--- 1. IMPORTAR CONTEXTO
import {
  assignTitleWithHistory,
  getAllLuchadores,
  getAllTitles,
} from "../../src/database/operations";
import { Luchador } from "../../src/types";

const { width } = Dimensions.get("window");

export default function TitleManagementScreen() {
  const router = useRouter();
  const { saveId } = useGame(); // <--- 2. USAR CONTEXTO

  const [titles, setTitles] = useState<any[]>([]);
  const [roster, setRoster] = useState<Luchador[]>([]);
  const [activeTab, setActiveTab] = useState<string>("Male");

  // Para el Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<any | null>(null);
  const [tagSelection, setTagSelection] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Cache de imágenes
  const [luchadorImages, setLuchadorImages] = useState<
    Record<number, string | null>
  >({});

  const loadData = () => {
    if (!saveId) return;

    // 3. PASAR SAVE_ID A LAS FUNCIONES DE DB
    const titlesData = getAllTitles(saveId);
    const rosterData = getAllLuchadores(saveId);

    setTitles(titlesData);
    setRoster(rosterData);

    const imgMap: any = {};
    rosterData.forEach((l) => {
      imgMap[l.id] = l.imageUri;
    });
    setLuchadorImages(imgMap);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [saveId])
  );

  const filteredTitles = titles.filter((t) => {
    if (activeTab === "Other") return t.isMITB === 1;
    if (activeTab === "Tag") return t.category === "Tag" && t.isMITB === 0;
    return t.gender === activeTab && t.category !== "Tag" && t.isMITB === 0;
  });

  // Filtro para el modal de asignación
  const getModalRoster = () => {
    return roster.filter((r) => {
      // Filtro por categoría/género
      const matchesType =
        selectedTitle?.category === "Tag" || r.gender === selectedTitle?.gender;

      // Filtro por búsqueda de texto
      const matchesSearch = r.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesType && matchesSearch;
    });
  };

  const handleAssign = (id1: number, id2: number | null = null) => {
    if (selectedTitle && saveId) {
      // 4. PASAR SAVE_ID AL ASIGNAR
      assignTitleWithHistory(saveId, selectedTitle.id, id1, id2);
      closeModal();
      loadData();
    }
  };

  const toggleTagParticipant = (id: number) => {
    if (tagSelection.includes(id)) {
      setTagSelection(tagSelection.filter((item) => item !== id));
    } else if (tagSelection.length < 2) {
      setTagSelection([...tagSelection, id]);
    }
  };

  const openModal = (title: any) => {
    setSelectedTitle(title);
    setTagSelection([]);
    setSearchQuery("");
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSearchQuery("");
    setTagSelection([]);
  };

  // --- RENDER DE TARJETA DE TÍTULO ---
  const renderTitleCard = ({ item }: { item: any }) => {
    const hasHolder = !!item.holderName1;

    let colors: [string, string, ...string[]] = ["#FFFFFF", "#F8FAFC"];
    let iconColor = "#F59E0B";

    if (item.isMITB) {
      colors = ["#4F46E5", "#4338CA"];
      iconColor = "#818CF8";
    } else if (item.name.includes("World") || item.name.includes("Universal")) {
      colors = ["#1E293B", "#0F172A"];
      iconColor = "#F59E0B";
    } else if (item.category === "Tag") {
      colors = ["#334155", "#1E293B"];
      iconColor = "#94A3B8";
    }

    const isDarkBg =
      item.isMITB || item.name.includes("World") || item.category === "Tag";
    const textColor = isDarkBg ? "white" : "#1E293B";
    const subTextColor = isDarkBg ? "#94A3B8" : "#64748B";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.cardContainer, !isDarkBg && styles.cardShadow]}
        onPress={() => router.push(`../titles/${item.id}`)}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* LADO IZQUIERDO: Icono y Nombre */}
          <View style={styles.cardLeft}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isDarkBg
                    ? "rgba(255,255,255,0.1)"
                    : "#FEF3C7",
                },
              ]}
            >
              <MaterialCommunityIcons
                name={item.isMITB ? "briefcase" : "trophy"}
                size={24}
                color={iconColor}
              />
            </View>
            <View>
              <Text style={[styles.titleName, { color: textColor }]}>
                {item.name}
              </Text>
              <Text style={[styles.titleSub, { color: subTextColor }]}>
                {item.category} Division
              </Text>
            </View>
          </View>

          {/* LADO DERECHO: Campeón o Vacante */}
          <View style={styles.holderSection}>
            {hasHolder ? (
              <View style={styles.holderWrapper}>
                <View style={styles.avatarRow}>
                  {/* Avatar 1 */}
                  {luchadorImages[item.holderId1] ? (
                    <Image
                      source={{ uri: luchadorImages[item.holderId1]! }}
                      style={styles.holderAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarPlaceholder,
                        { backgroundColor: iconColor },
                      ]}
                    >
                      <Text style={styles.avatarInitial}>
                        {item.holderName1.charAt(0)}
                      </Text>
                    </View>
                  )}

                  {/* Avatar 2 (Tag) */}
                  {item.holderName2 && (
                    <View style={[styles.avatarOverlay]}>
                      {luchadorImages[item.holderId2] ? (
                        <Image
                          source={{ uri: luchadorImages[item.holderId2]! }}
                          style={styles.holderAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatarPlaceholder,
                            { backgroundColor: iconColor },
                          ]}
                        >
                          <Text style={styles.avatarInitial}>
                            {item.holderName2.charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.holderText, { color: textColor }]}
                  numberOfLines={1}
                >
                  {item.holderName2 ? "Tag Champs" : item.holderName1}
                </Text>
                <Text style={[styles.weekLabel, { color: subTextColor }]}>
                  Sem. {item.weekWon}
                </Text>
              </View>
            ) : (
              // Botón rápido para asignar si está vacante
              <TouchableOpacity
                style={styles.vacantBadge}
                onPress={() => openModal(item)}
              >
                <Text style={styles.vacantText}>VACANTE</Text>
                <Ionicons
                  name="add-circle"
                  size={14}
                  color="#EF4444"
                  style={{ marginLeft: 2 }}
                />
              </TouchableOpacity>
            )}

            <Ionicons
              name="chevron-forward"
              size={20}
              color={subTextColor}
              style={{ marginLeft: 10 }}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <ManagementHeader />

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Sala de Trofeos</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        {["Male", "Female", "Tag", "Other"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === "Other"
                ? "MITB"
                : tab === "Tag"
                ? "Parejas"
                : tab === "Male"
                ? "Hombres"
                : "Mujeres"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTitles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTitleCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              No hay títulos en esta categoría.
            </Text>
          </View>
        }
      />

      {/* --- MODAL DE ASIGNACIÓN --- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedTitle?.category === "Tag"
                ? "Nueva Pareja Campeona"
                : "Nuevo Campeón"}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.modalClose}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {/* BUSCADOR DENTRO DEL MODAL */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar luchador..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <FlatList
            data={getModalRoster()}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => {
              const isSelected = tagSelection.includes(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.rosterItem,
                    isSelected && styles.rosterItemSelected,
                  ]}
                  onPress={() => {
                    if (selectedTitle?.category === "Tag")
                      toggleTagParticipant(item.id);
                    else handleAssign(item.id);
                  }}
                >
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.itemAvatar}
                    />
                  ) : (
                    <View style={styles.itemPlaceholder}>
                      <Text>{item.name.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.itemName}>{item.name}</Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#3B82F6"
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {selectedTitle?.category === "Tag" && (
            <View style={styles.footerBtnContainer}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  tagSelection.length < 2 && { opacity: 0.5 },
                ]}
                disabled={tagSelection.length < 2}
                onPress={() => handleAssign(tagSelection[0], tagSelection[1])}
              >
                <Text style={styles.confirmText}>CORONAR PAREJA</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  // Header Page
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    padding: 8,
    backgroundColor: "white",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  pageTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabBtnActive: { backgroundColor: "#1E293B", borderColor: "#1E293B" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  tabTextActive: { color: "white" },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 50 },

  // Empty State
  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { textAlign: "center", marginTop: 10, color: "#94A3B8" },

  // CARD DESIGN
  cardContainer: { marginBottom: 15, borderRadius: 16, overflow: "hidden" },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardGradient: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  titleName: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  titleSub: { fontSize: 11, fontWeight: "600" },

  holderSection: { flexDirection: "row", alignItems: "center" },
  holderWrapper: { alignItems: "flex-end", marginRight: 5 },
  holderText: { fontSize: 12, fontWeight: "bold", marginTop: 4 },
  weekLabel: { fontSize: 10, fontWeight: "600" },

  avatarRow: { flexDirection: "row" },
  avatarOverlay: { marginLeft: -15 },
  holderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "white",
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  avatarInitial: { fontWeight: "bold", color: "white", fontSize: 14 },

  vacantBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
  },
  vacantText: { color: "#EF4444", fontSize: 10, fontWeight: "bold" },

  // Modal
  modalContent: {
    flex: 1,
    backgroundColor: "white",
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  modalClose: { color: "#3B82F6", fontWeight: "600" },

  // BUSCADOR EN MODAL
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1E293B",
  },

  rosterItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  rosterItemSelected: { backgroundColor: "#EFF6FF" },
  itemAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  itemPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemName: { fontSize: 14, fontWeight: "600", color: "#1E293B", flex: 1 },

  footerBtnContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  confirmBtn: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmText: { color: "white", fontWeight: "bold" },
});
