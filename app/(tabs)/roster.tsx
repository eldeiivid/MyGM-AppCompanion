import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image"; // <--- AÑADIDO: Componente optimizado
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  // Image, <--- ELIMINADO DE AQUÍ
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Context & Operations
import { useGame } from "../../src/context/GameContext";
import {
  createRivalry,
  deleteRivalry,
  getActiveRivalries,
  getAllLuchadores,
  getAllTitles,
  getRivalryMatches,
} from "../../src/database/operations";

// --- IMPORTAR EL HELPER DE IMÁGENES ---
import { getWrestlerImage } from "../../src/utils/imageHelper";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// --- FILTER OPTIONS ---
const SORT_OPTIONS = [
  { id: "Name", label: "Name (A-Z)" },
  { id: "RatingDesc", label: "Rating (High-Low)" },
  { id: "RatingAsc", label: "Rating (Low-High)" },
  { id: "Wins", label: "Most Wins" },
  { id: "Losses", label: "Most Losses" },
  { id: "ContractAsc", label: "Expiring Soon" },
];

const ROLE_OPTIONS = ["Todos", "Face", "Heel"];

export default function LockerRoomScreen() {
  const router = useRouter();
  const { saveId, brandTheme } = useGame();

  // Data States
  const [roster, setRoster] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  const [rivalries, setRivalries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [activeTab, setActiveTab] = useState<
    "Talents" | "Championships" | "Rivalries"
  >("Talents");

  // Modals
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [rivalryModalVisible, setRivalryModalVisible] = useState(false);
  const [rivalryDetailVisible, setRivalryDetailVisible] = useState(false);
  const [selectedRivalryData, setSelectedRivalryData] = useState<any>(null);
  const [rivalryHistory, setRivalryHistory] = useState<any[]>([]);

  // Rivalry Creation State
  const [selectedRival1, setSelectedRival1] = useState<number | null>(null);
  const [selectedRival2, setSelectedRival2] = useState<number | null>(null);

  // Filter States
  const [filters, setFilters] = useState({
    sortBy: "Name",
    status: "All",
    gender: "Todos",
    role: "Todos",
    fighterClass: "Todos",
  });
  const [tempFilters, setTempFilters] = useState(filters);

  // Load Data
  const loadData = async () => {
    if (!saveId) return;
    setLoading(true);

    const luchadoresData = getAllLuchadores(saveId);
    const titlesData = getAllTitles(saveId);
    let rivalriesData = getActiveRivalries(saveId);

    // --- NUEVO: Calcular el Heat Real basado en promedio de estrellas ---
    rivalriesData = rivalriesData.map((r: any) => {
      const matches = getRivalryMatches(saveId, r.luchador_id1, r.luchador_id2);
      if (matches.length === 0) return { ...r, calculatedHeat: 1 }; // Base level

      const totalStars = matches.reduce(
        (sum: number, m: any) => sum + (m.rating || 0),
        0
      );
      const avg = totalStars / matches.length;

      let heat = 1;
      if (avg >= 4.5) heat = 5;
      else if (avg >= 3.5) heat = 4;
      else if (avg >= 2.5) heat = 3;
      else if (avg >= 1.5) heat = 2;

      return { ...r, calculatedHeat: heat };
    });

    setRoster(luchadoresData);
    setTitles(titlesData);
    setRivalries(rivalriesData);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [saveId])
  );

  const handleCreateRivalry = () => {
    if (selectedRival1 && selectedRival2 && saveId) {
      createRivalry(saveId, selectedRival1, selectedRival2, 1);
      setRivalryModalVisible(false);
      setSelectedRival1(null);
      setSelectedRival2(null);
      loadData();
    }
  };

  const handleDeleteRivalry = (id: number) => {
    deleteRivalry(id);
    loadData();
  };

  const openRivalryDetail = (rivalryItem: any) => {
    if (!saveId) return;
    const history = getRivalryMatches(
      saveId,
      rivalryItem.luchador_id1,
      rivalryItem.luchador_id2
    );

    const r1 = roster.find((r) => r.id === rivalryItem.luchador_id1);
    const r2 = roster.find((r) => r.id === rivalryItem.luchador_id2);

    setSelectedRivalryData({
      ...rivalryItem,
      r1,
      r2,
    });
    setRivalryHistory(history);
    setRivalryDetailVisible(true);
  };

  // --- FILTER LOGIC ---
  const getProcessedRoster = () => {
    let data = [...roster];
    if (filters.gender !== "Todos")
      data = data.filter((l) => l.gender === filters.gender);
    if (filters.role !== "Todos")
      data = data.filter((l) => l.crowd === filters.role);

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
    }

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
        default:
          return 0;
      }
    });
    return data;
  };

  const filteredData = getProcessedRoster();

  // --- RENDERERS ---
  const renderWrestlerCard = ({ item }: { item: any }) => {
    const isExpired = item.isDraft === 0 && item.weeksLeft <= 0;
    const isHeel = item.crowd === "Heel";
    const alignmentColor = isHeel ? "#EF4444" : "#3B82F6";
    const hasTitle = titles.some(
      (t) => t.holderId1 === item.id || t.holderId2 === item.id
    );

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`../luchador/${item.id}`)}
        style={[styles.cardContainer, isExpired && { opacity: 0.5 }]}
      >
        <BlurView
          intensity={20}
          tint="dark"
          style={[styles.cardBlur, { borderColor: `${alignmentColor}40` }]}
        >
          <View style={styles.cardHeader}>
            {hasTitle && <Ionicons name="trophy" size={14} color="#FFD700" />}
          </View>
          <View style={styles.imageWrapper}>
            {/* --- EXPO IMAGE --- */}
            <Image
              source={{ uri: getWrestlerImage(item.imageUri) }}
              style={styles.wrestlerImage}
              contentFit="cover"
              transition={500}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.wrestlerName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.statsRow}>
              <Text style={[styles.statText, { color: alignmentColor }]}>
                {item.crowd}
              </Text>
              <Text style={styles.statDivider}>•</Text>
              <Text style={styles.statText}>Lvl {item.ringLevel}</Text>
            </View>
          </View>
          <View
            style={[styles.alignmentBar, { backgroundColor: alignmentColor }]}
          />
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderTitleCard = ({ item }: { item: any }) => {
    const holder1 = roster.find((l) => l.id === item.holderId1);
    const holder2 = roster.find((l) => l.id === item.holderId2);
    return (
      <TouchableOpacity
        style={styles.titleCardContainer}
        onPress={() => router.push(`/titles/${item.id}`)}
      >
        <BlurView intensity={25} tint="dark" style={styles.titleCardBlur}>
          <View style={styles.titleInfo}>
            <Text style={styles.titleCategory}>
              {item.category.toUpperCase()}
            </Text>
            <Text style={styles.titleName}>{item.name}</Text>
            <View style={styles.holderRow}>
              {holder1 ? (
                <View style={styles.holderChip}>
                  <Image
                    source={{ uri: getWrestlerImage(holder1.imageUri) }}
                    style={styles.holderAvatar}
                    contentFit="cover"
                    transition={500}
                  />
                  <Text style={styles.holderName}>{holder1.name}</Text>
                </View>
              ) : (
                <Text style={styles.vacantText}>VACANT</Text>
              )}
              {holder2 && (
                <View
                  style={[styles.holderChip, { marginLeft: -10, zIndex: -1 }]}
                >
                  <Image
                    source={{ uri: getWrestlerImage(holder2.imageUri) }}
                    style={styles.holderAvatar}
                    contentFit="cover"
                    transition={500}
                  />
                  <Text style={styles.holderName}>{holder2.name}</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderRivalryCard = ({ item }: { item: any }) => {
    const r1 = roster.find((r) => r.id === item.luchador_id1);
    const r2 = roster.find((r) => r.id === item.luchador_id2);
    if (!r1 || !r2) return null;

    const heatLevel = item.calculatedHeat || item.level || 1;

    let heatColor = "#3B82F6";
    let heatLabel = "DULL";

    if (heatLevel >= 5) {
      heatColor = "#EF4444";
      heatLabel = "LEGENDARY";
    } else if (heatLevel === 4) {
      heatColor = "#F97316";
      heatLabel = "GREAT";
    } else if (heatLevel === 3) {
      heatColor = "#F59E0B";
      heatLabel = "SOLID";
    } else if (heatLevel === 2) {
      heatColor = "#94A3B8";
      heatLabel = "WEAK";
    }

    return (
      <TouchableOpacity
        style={styles.rivalryCard}
        activeOpacity={0.9}
        onPress={() => openRivalryDetail(item)}
      >
        <BlurView intensity={20} tint="dark" style={styles.rivalryBlur}>
          <View style={styles.rivalSide}>
            <Image
              source={{ uri: getWrestlerImage(r1.imageUri) }}
              style={[
                styles.rivalAvatar,
                { borderColor: r1.crowd === "Face" ? "#3B82F6" : "#EF4444" },
              ]}
              contentFit="cover"
              transition={500}
            />
            <Text style={styles.rivalName} numberOfLines={1}>
              {r1.name}
            </Text>
          </View>

          <View style={styles.rivalCenter}>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.heatMeterContainer}>
              <View
                style={[
                  styles.heatMeterFill,
                  {
                    width: `${(heatLevel / 5) * 100}%`,
                    backgroundColor: heatColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.heatText, { color: heatColor }]}>
              {heatLabel}
            </Text>
          </View>

          <View style={styles.rivalSide}>
            <Image
              source={{ uri: getWrestlerImage(r2.imageUri) }}
              style={[
                styles.rivalAvatar,
                { borderColor: r2.crowd === "Face" ? "#3B82F6" : "#EF4444" },
              ]}
              contentFit="cover"
              transition={500}
            />
            <Text style={styles.rivalName} numberOfLines={1}>
              {r2.name}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteRivalryBtn}
            onPress={() => handleDeleteRivalry(item.id)}
          >
            <Ionicons name="archive-outline" size={16} color="#64748B" />
          </TouchableOpacity>
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.absoluteFill, { backgroundColor: "#000" }]} />
      <LinearGradient
        colors={[brandTheme || "#EF4444", "transparent"]}
        style={[styles.absoluteFill, { height: "35%", opacity: 0.25 }]}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Locker Room</Text>
          {activeTab === "Talents" && (
            <TouchableOpacity
              onPress={() => setFilterModalVisible(true)}
              style={styles.filterBtn}
            >
              <Ionicons name="options" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.segmentContainer}>
          <BlurView intensity={30} tint="light" style={styles.segmentBlur}>
            {["Talents", "Championships", "Rivalries"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.segmentBtn,
                  activeTab === tab && styles.segmentBtnActive,
                ]}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut
                  );
                  setActiveTab(tab as any);
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeTab === tab && styles.segmentTextActive,
                  ]}
                >
                  {tab === "Championships" ? "Titles" : tab}
                </Text>
              </TouchableOpacity>
            ))}
          </BlurView>
        </View>

        {activeTab === "Talents" ? (
          <FlatList
            key="talents-grid"
            data={filteredData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderWrestlerCard}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : activeTab === "Championships" ? (
          <FlatList
            key="titles-list"
            data={titles}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTitleCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            key="rivalries-list"
            data={rivalries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRivalryCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="flame-outline"
                  size={40}
                  color="rgba(255,255,255,0.2)"
                />
                <Text style={styles.emptyText}>No active rivalries.</Text>
              </View>
            }
          />
        )}

        {/* FABs */}
        {activeTab === "Talents" && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push("../luchador/new")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[brandTheme || "#EF4444", "#1E293B"]}
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={30} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {activeTab === "Rivalries" && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setRivalryModalVisible(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#F59E0B", "#B45309"]}
              style={styles.fabGradient}
            >
              <Ionicons name="flame" size={28} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* FILTER MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <BlurView intensity={90} tint="dark" style={styles.modalContainer}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={{ color: brandTheme, fontWeight: "700" }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.chipRow}>
                {SORT_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.id}
                    label={opt.label}
                    selected={tempFilters.sortBy === opt.id}
                    onPress={() =>
                      setTempFilters({ ...tempFilters, sortBy: opt.id })
                    }
                    theme={brandTheme}
                  />
                ))}
              </View>
              <Text style={styles.filterLabel}>Role</Text>
              <View style={styles.chipRow}>
                {ROLE_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt}
                    label={opt}
                    selected={tempFilters.role === opt}
                    onPress={() =>
                      setTempFilters({ ...tempFilters, role: opt })
                    }
                    theme={brandTheme}
                  />
                ))}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: brandTheme }]}
                onPress={() => {
                  setFilters(tempFilters);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </BlurView>
      </Modal>

      {/* NEW RIVALRY MODAL */}
      <Modal
        visible={rivalryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRivalryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint="dark" style={styles.glassModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ignite Rivalry</Text>
              <TouchableOpacity onPress={() => setRivalryModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={styles.pickerLabel}>SELECT FIRST RIVAL</Text>
              <FlatList
                horizontal
                data={roster}
                style={{ marginBottom: 20 }}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedRival1(item.id)}
                    style={[
                      styles.avatarPick,
                      selectedRival1 === item.id && {
                        borderColor: brandTheme,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: getWrestlerImage(item.imageUri) }}
                      style={styles.avatarImg}
                      contentFit="cover"
                      transition={500}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.avatarName,
                        selectedRival1 === item.id && { color: brandTheme },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <Text style={styles.pickerLabel}>SELECT SECOND RIVAL</Text>
              <FlatList
                horizontal
                data={roster.filter((r) => r.id !== selectedRival1)}
                style={{ marginBottom: 20 }}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setSelectedRival2(item.id)}
                    style={[
                      styles.avatarPick,
                      selectedRival2 === item.id && {
                        borderColor: "#EF4444",
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: getWrestlerImage(item.imageUri) }}
                      style={styles.avatarImg}
                      contentFit="cover"
                      transition={500}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.avatarName,
                        selectedRival2 === item.id && { color: "#EF4444" },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={[
                  styles.applyBtn,
                  { backgroundColor: "#F59E0B", marginTop: 10 },
                  (!selectedRival1 || !selectedRival2) && { opacity: 0.5 },
                ]}
                disabled={!selectedRival1 || !selectedRival2}
                onPress={handleCreateRivalry}
              >
                <Text style={styles.applyBtnText}>CREATE RIVALRY 🔥</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* RIVALRY HISTORY MODAL */}
      <Modal
        visible={rivalryDetailVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRivalryDetailVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>RIVALRY LOGBOOK</Text>
            <TouchableOpacity onPress={() => setRivalryDetailVisible(false)}>
              <Ionicons name="close-circle" size={30} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.detailVsHeader}>
            <View style={{ alignItems: "center" }}>
              <Image
                source={{
                  uri: getWrestlerImage(selectedRivalryData?.r1?.imageUri),
                }}
                style={styles.detailAvatar}
                contentFit="cover"
                transition={500}
              />
              <Text style={styles.detailName}>
                {selectedRivalryData?.r1?.name}
              </Text>
            </View>
            <Text style={styles.detailVsText}>VS</Text>
            <View style={{ alignItems: "center" }}>
              <Image
                source={{
                  uri: getWrestlerImage(selectedRivalryData?.r2?.imageUri),
                }}
                style={styles.detailAvatar}
                contentFit="cover"
                transition={500}
              />
              <Text style={styles.detailName}>
                {selectedRivalryData?.r2?.name}
              </Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.sectionHeader}>MATCH HISTORY</Text>
            {rivalryHistory.length === 0 ? (
              <Text
                style={{
                  color: "#64748B",
                  textAlign: "center",
                  marginTop: 20,
                  fontStyle: "italic",
                }}
              >
                No matches recorded yet.
              </Text>
            ) : (
              rivalryHistory.map((match, idx) => (
                <View key={match.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyWeek}>WK {match.week}</Text>
                  </View>
                  <BlurView
                    intensity={10}
                    tint="dark"
                    style={styles.historyCard}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={styles.historyWinner}>
                        Winner:{" "}
                        <Text style={{ color: "#FFF" }}>
                          {match.winnerName}
                        </Text>
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text
                          style={{
                            color: "#F59E0B",
                            fontWeight: "bold",
                            fontSize: 12,
                          }}
                        >
                          {match.rating}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyType}>
                      {match.matchType} •{" "}
                      {match.titleName ? "Title Match" : "Normal"}
                    </Text>
                  </BlurView>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const FilterChip = ({ label, selected, onPress, theme }: any) => (
  <TouchableOpacity
    style={[
      styles.chip,
      selected && { backgroundColor: theme || "#EF4444", borderColor: theme },
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.chipText,
        selected && { color: "white", fontWeight: "bold" },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
  },
  screenTitle: { fontSize: 34, fontWeight: "900", color: "white" },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  segmentContainer: { paddingHorizontal: 20, marginBottom: 20 },
  segmentBlur: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    overflow: "hidden",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  segmentBtnActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  segmentText: { color: "#94A3B8", fontWeight: "600", fontSize: 13 },
  segmentTextActive: { color: "white", fontWeight: "bold" },

  listContent: { paddingHorizontal: 20, paddingBottom: 150 },

  cardContainer: {
    width: CARD_WIDTH,
    height: 200,
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  cardBlur: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 8,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  imageWrapper: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  wrestlerImage: { width: "100%", height: "100%" },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: "900",
    color: "rgba(255,255,255,0.1)",
  },
  cardInfo: { padding: 10, backgroundColor: "rgba(0,0,0,0.3)" },
  wrestlerName: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 4,
  },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  statText: { fontSize: 10, color: "#CBD5E1", fontWeight: "600" },
  statDivider: { fontSize: 10, color: "#64748B", marginHorizontal: 4 },
  alignmentBar: { height: 3, width: "100%" },

  titleCardContainer: {
    marginBottom: 15,
    borderRadius: 20,
    overflow: "hidden",
  },
  titleCardBlur: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  titleInfo: { flex: 1 },
  titleCategory: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  titleName: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  holderRow: { flexDirection: "row", alignItems: "center" },
  holderChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 4,
    paddingRight: 12,
    borderRadius: 20,
  },
  holderAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  holderName: { color: "white", fontSize: 12, fontWeight: "700" },
  vacantText: { color: "#64748B", fontSize: 12, fontStyle: "italic" },

  rivalryCard: { marginBottom: 15, borderRadius: 20, overflow: "hidden" },
  rivalryBlur: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  rivalSide: { alignItems: "center", width: 80 },
  rivalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    marginBottom: 5,
  },
  rivalPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#333",
    marginBottom: 5,
  },
  rivalName: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  rivalCenter: { flex: 1, alignItems: "center", paddingHorizontal: 10 },
  vsText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
    marginBottom: 5,
  },
  heatMeterContainer: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 5,
  },
  heatMeterFill: { height: "100%", borderRadius: 3 },
  heatText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  deleteRivalryBtn: { position: "absolute", top: 10, right: 10, padding: 5 },

  emptyState: { alignItems: "center", marginTop: 50 },
  emptyText: { color: "rgba(255,255,255,0.3)", marginTop: 10, fontSize: 14 },

  fab: { position: "absolute", bottom: 120, right: 20 },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },

  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginTop: 60,
  },
  modalTitle: { color: "white", fontSize: 20, fontWeight: "800" },
  modalScroll: { padding: 20 },
  filterLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 10,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  chipText: { color: "#CBD5E1", fontSize: 12, fontWeight: "600" },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  applyBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  applyBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  glassModalContent: {
    backgroundColor: "rgba(0,0,0,0.9)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 12,
    marginTop: 10,
    letterSpacing: 1,
  },
  avatarPick: {
    marginRight: 15,
    alignItems: "center",
    width: 70,
    opacity: 0.6,
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#333",
  },
  avatarName: {
    fontSize: 10,
    color: "#CBD5E1",
    marginTop: 5,
    textAlign: "center",
    fontWeight: "600",
  },

  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  detailVsHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 30,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  detailName: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  detailVsText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#64748B",
    fontStyle: "italic",
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 15,
    letterSpacing: 1,
  },
  historyItem: { flexDirection: "row", marginBottom: 15 },
  historyLeft: { width: 50, alignItems: "center", paddingTop: 10 },
  historyWeek: { color: "#64748B", fontWeight: "bold", fontSize: 12 },
  historyCard: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  historyWinner: { color: "#94A3B8", fontSize: 12, fontWeight: "bold" },
  historyType: { color: "#64748B", fontSize: 10, marginTop: 5 },
});
