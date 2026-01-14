import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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
  getInactiveRivalries,
  getRivalryMatches,
} from "../../src/database/operations";

// Image Helper
import { getWrestlerImage } from "../../src/utils/imageHelper";

// Enable LayoutAnimation
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const TITLES_REPO_URL =
  "https://raw.githubusercontent.com/eldeiivid/wwe-mymg-assets/main/titles/";

const SORT_OPTIONS = [
  { id: "Name", label: "Name (A-Z)" },
  { id: "RatingDesc", label: "Rating (High-Low)" },
  { id: "RatingAsc", label: "Rating (Low-High)" },
  { id: "Wins", label: "Most Wins" },
  { id: "Losses", label: "Most Losses" },
  { id: "ContractAsc", label: "Expiring Soon" },
];

const ROLE_OPTIONS = ["Todos", "Face", "Heel"];
const GENDER_OPTIONS = ["Todos", "Male", "Female"];
const STATUS_OPTIONS = ["All", "Champions", "Draft", "Expiring"];

export default function LockerRoomScreen() {
  const router = useRouter();
  const { saveId, brandTheme } = useGame();

  // Data States
  const [roster, setRoster] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  const [rivalries, setRivalries] = useState<any[]>([]);
  const [pastRivalries, setPastRivalries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [activeTab, setActiveTab] = useState<
    "Talents" | "Championships" | "Rivalries"
  >("Talents");

  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [rivalryModalVisible, setRivalryModalVisible] = useState(false);
  const [rivalryDetailVisible, setRivalryDetailVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // States for Active Rivalry Modal
  const [selectedRivalryData, setSelectedRivalryData] = useState<any>(null);
  const [rivalryHistory, setRivalryHistory] = useState<any[]>([]);

  // States for Archive Accordion (Expanded items)
  const [expandedRivalryId, setExpandedRivalryId] = useState<number | null>(
    null
  );
  const [expandedHistory, setExpandedHistory] = useState<any[]>([]);

  // Rivalry Creation
  const [selectedRival1, setSelectedRival1] = useState<number | null>(null);
  const [selectedRival2, setSelectedRival2] = useState<number | null>(null);

  // Filters
  const INITIAL_FILTERS = {
    sortBy: "Name",
    status: "All",
    gender: "Todos",
    role: "Todos",
    fighterClass: "Todos",
  };
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [tempFilters, setTempFilters] = useState(filters);

  // --- HELPERS ---
  const getTitleImage = (title: any) => {
    if (!title) return null;
    if (title.imageUri && title.imageUri !== "") {
      return `${TITLES_REPO_URL}${title.imageUri}`;
    }
    const gender = title.gender === "Female" ? "female" : "male";
    if (
      title.isMITB === 1 ||
      title.name.includes("MITB") ||
      title.name.includes("Briefcase")
    ) {
      return `${TITLES_REPO_URL}${gender}-moneyinthebank.png`;
    }
    let brand = "raw";
    const nameLower = title.name.toLowerCase();
    if (nameLower.includes("smackdown") || nameLower.includes("universal"))
      brand = "smackdown";
    else if (nameLower.includes("nxt")) brand = "nxt";
    else if (nameLower.includes("aew")) brand = "aew";

    let division = "world";
    const cat = title.category || title.type || "";
    if (cat === "Midcard") division = "midcard";
    else if (cat === "Tag") division = "tagteam";

    if (division === "tagteam" && gender === "female") {
      return `${TITLES_REPO_URL}female-tagteam.webp`;
    }
    return `${TITLES_REPO_URL}${brand}-${gender}-${division}.webp`;
  };

  const loadData = async () => {
    if (!saveId) return;
    setLoading(true);

    const luchadoresData = getAllLuchadores(saveId);
    const titlesData = getAllTitles(saveId);

    // Active
    let rivalriesData = getActiveRivalries(saveId);
    rivalriesData = processRivalries(rivalriesData, saveId);

    // Archived
    let inactiveData = getInactiveRivalries(saveId);
    inactiveData = processRivalries(inactiveData, saveId);

    setRoster(luchadoresData);
    setTitles(titlesData);
    setRivalries(rivalriesData);
    setPastRivalries(inactiveData);
    setLoading(false);
  };

  const processRivalries = (list: any[], sId: number) => {
    return list.map((r: any) => {
      const matches = getRivalryMatches(sId, r.luchador_id1, r.luchador_id2);
      if (matches.length === 0) return { ...r, calculatedHeat: 1 };
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
    setRivalryDetailVisible(false);
    loadData();
  };

  const openRivalryDetail = (rivalryItem: any) => {
    if (!saveId) return;
    const history = getRivalryMatches(
      saveId,
      rivalryItem.luchador_id1,
      rivalryItem.luchador_id2
    );

    const activeR1 = roster.find((r) => r.id === rivalryItem.luchador_id1);
    const activeR2 = roster.find((r) => r.id === rivalryItem.luchador_id2);

    const r1 = activeR1 || {
      name: rivalryItem.name1 || "Unknown",
      imageUri: rivalryItem.image1 || "",
    };
    const r2 = activeR2 || {
      name: rivalryItem.name2 || "Unknown",
      imageUri: rivalryItem.image2 || "",
    };

    setSelectedRivalryData({ ...rivalryItem, r1, r2 });
    setRivalryHistory(history);
    setRivalryDetailVisible(true);
  };

  // --- NUEVA FUNCIÓN: Toggle Expand Archive ---
  const toggleArchiveExpand = (item: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedRivalryId === item.id) {
      setExpandedRivalryId(null);
    } else {
      if (saveId) {
        const history = getRivalryMatches(
          saveId,
          item.luchador_id1,
          item.luchador_id2
        );
        setExpandedHistory(history);
      }
      setExpandedRivalryId(item.id);
    }
  };

  // --- FILTER LOGIC ---
  const getProcessedRoster = () => {
    let data = [...roster];
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      data = data.filter((l) => l.name.toLowerCase().includes(query));
    }
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
  const renderActiveFilters = () => {
    const activeFilters = [];
    if (filters.gender !== "Todos")
      activeFilters.push({
        type: "gender",
        label: filters.gender,
        resetValue: "Todos",
      });
    if (filters.role !== "Todos")
      activeFilters.push({
        type: "role",
        label: filters.role,
        resetValue: "Todos",
      });
    if (filters.status !== "All")
      activeFilters.push({
        type: "status",
        label: filters.status,
        resetValue: "All",
      });

    if (activeFilters.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.activeFiltersContainer}
      >
        <TouchableOpacity
          style={styles.clearAllBadge}
          onPress={() => setFilters(INITIAL_FILTERS)}
        >
          <Text style={styles.clearAllText}>Clear All</Text>
          <Ionicons name="close-circle" size={16} color="#FFF" />
        </TouchableOpacity>
        {activeFilters.map((f, i) => (
          <TouchableOpacity
            key={i}
            style={styles.activeBadge}
            onPress={() => setFilters({ ...filters, [f.type]: f.resetValue })}
          >
            <Text style={styles.activeBadgeText}>{f.label}</Text>
            <Ionicons name="close" size={14} color="#CBD5E1" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderWrestlerCard = ({ item }: { item: any }) => {
    const isExpired = item.isDraft === 0 && item.weeksLeft <= 0;
    const isHeel = item.crowd === "Heel";
    const wrestlerTitle = titles.find(
      (t) => t.holderId1 === item.id || t.holderId2 === item.id
    );
    const gradientColors = isHeel
      ? ["#7f1d1d", "#000000"]
      : ["#1e3a8a", "#000000"];
    const borderColor = wrestlerTitle ? "#F59E0B" : "rgba(255,255,255,0.2)";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`../luchador/${item.id}`)}
        style={[styles.cardContainer, isExpired && { opacity: 0.5 }]}
      >
        <LinearGradient
          colors={gradientColors as any}
          style={[
            styles.cardBackground,
            { borderColor: borderColor, borderWidth: wrestlerTitle ? 2 : 1 },
          ]}
        >
          <View style={styles.cardHeaderOverlay}>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingNumber}>{item.ringLevel}</Text>
              <Text style={styles.ratingLabel}>OVR</Text>
            </View>
            {wrestlerTitle && (
              <Image
                source={{ uri: getTitleImage(wrestlerTitle) ?? "" }}
                style={styles.beltBadge}
                contentFit="contain"
              />
            )}
          </View>
          <Image
            source={{ uri: getWrestlerImage(item.imageUri) }}
            style={styles.wrestlerImage}
            contentFit="cover"
            transition={500}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)", "#000"] as any}
            style={styles.cardFooter}
          >
            <Text
              style={styles.wrestlerName}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {item.name.toUpperCase()}
            </Text>
            <View style={styles.statsRow}>
              <Text
                style={[
                  styles.statText,
                  { color: isHeel ? "#FCA5A5" : "#93C5FD" },
                ]}
              >
                {item.crowd.toUpperCase()}
              </Text>
              <Text style={styles.statDivider}>•</Text>
              <Text style={[styles.statText, { color: "#FFF" }]}>
                {item.mainClass ? item.mainClass.toUpperCase() : "WRESTLER"}
              </Text>
            </View>
            <Text style={styles.recordText}>
              {item.normalWins || 0}W - {item.normalLosses || 0}L
            </Text>
          </LinearGradient>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderTitleCard = ({ item }: { item: any }) => {
    const holder1 = roster.find((l) => l.id === item.holderId1);
    const holder2 = roster.find((l) => l.id === item.holderId2);
    const titleImageUri = getTitleImage(item) ?? "";

    return (
      <TouchableOpacity
        style={styles.titleCardContainer}
        onPress={() => router.push(`/titles/${item.id}`)}
      >
        <BlurView intensity={25} tint="dark" style={styles.titleCardBlur}>
          <View style={styles.titleImageContainer}>
            <Image
              source={{ uri: titleImageUri }}
              style={styles.titleImage}
              contentFit="contain"
              transition={500}
            />
          </View>
          <View style={styles.titleInfo}>
            <Text style={styles.titleName}>{item.name}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {holder1 ? (
                <View style={styles.holderChip}>
                  <Image
                    source={{ uri: getWrestlerImage(holder1.imageUri) }}
                    style={styles.holderAvatar}
                    contentFit="cover"
                  />
                  <Text style={styles.holderName}>{holder1.name}</Text>
                </View>
              ) : (
                <Text style={styles.vacantText}>VACANT</Text>
              )}
              {holder2 && (
                <View style={styles.holderChip}>
                  <Image
                    source={{ uri: getWrestlerImage(holder2.imageUri) }}
                    style={styles.holderAvatar}
                    contentFit="cover"
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

  // --- RENDERIZADOR ESPECÍFICO PARA EL ARCHIVO (ACORDEÓN) ---
  const renderArchivedRivalryCard = ({ item }: { item: any }) => {
    const r1Name =
      roster.find((r) => r.id === item.luchador_id1)?.name || item.name1;
    const r2Name =
      roster.find((r) => r.id === item.luchador_id2)?.name || item.name2;
    const r1Img =
      roster.find((r) => r.id === item.luchador_id1)?.imageUri || item.image1;
    const r2Img =
      roster.find((r) => r.id === item.luchador_id2)?.imageUri || item.image2;

    if (!r1Name || !r2Name) return null;

    const isExpanded = expandedRivalryId === item.id;

    return (
      <View style={styles.rivalryCard}>
        <TouchableOpacity
          style={{ overflow: "hidden", borderRadius: 20 }}
          activeOpacity={0.8}
          onPress={() => toggleArchiveExpand(item)}
        >
          <BlurView intensity={10} tint="dark" style={styles.rivalryBlur}>
            <View style={styles.rivalSide}>
              <Image
                source={{ uri: getWrestlerImage(r1Img) }}
                style={[styles.rivalAvatar, { borderColor: "#3B82F6" }]}
                contentFit="cover"
              />
              <Text style={styles.rivalName} numberOfLines={1}>
                {r1Name}
              </Text>
            </View>
            <View style={styles.rivalCenter}>
              <Text style={styles.vsText}>VS</Text>
              <Text
                style={{
                  color: "#64748B",
                  fontSize: 10,
                  fontWeight: "bold",
                  marginTop: 5,
                }}
              >
                ARCHIVED
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="#64748B"
                style={{ marginTop: 5 }}
              />
            </View>
            <View style={styles.rivalSide}>
              <Image
                source={{ uri: getWrestlerImage(r2Img) }}
                style={[styles.rivalAvatar, { borderColor: "#EF4444" }]}
                contentFit="cover"
              />
              <Text style={styles.rivalName} numberOfLines={1}>
                {r2Name}
              </Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* EXPANDED CONTENT (INLINE LOGBOOK) */}
        {isExpanded && (
          <View style={styles.inlineLogbook}>
            {expandedHistory.length === 0 ? (
              <Text
                style={{
                  color: "#666",
                  textAlign: "center",
                  fontStyle: "italic",
                  fontSize: 12,
                }}
              >
                No matches found.
              </Text>
            ) : (
              expandedHistory.map((match, idx) => (
                <View key={idx} style={styles.inlineLogRow}>
                  <Text style={styles.inlineLogWeek}>W{match.week}</Text>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    {match.winnerName === "N/A" ? (
                      <Text
                        style={{
                          color: "#D946EF",
                          fontWeight: "bold",
                          fontSize: 12,
                        }}
                      >
                        ✨ Segment
                      </Text>
                    ) : (
                      <Text style={{ color: "#FFF", fontSize: 12 }}>
                        Winner:{" "}
                        <Text style={{ fontWeight: "bold" }}>
                          {match.winnerName}
                        </Text>
                      </Text>
                    )}
                    <Text style={{ color: "#64748B", fontSize: 10 }}>
                      {match.matchType}
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Ionicons name="star" size={10} color="#F59E0B" />
                    <Text
                      style={{
                        color: "#F59E0B",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {match.rating}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  // --- RENDERIZADOR PARA LISTA PRINCIPAL (MODAL) ---
  const renderActiveRivalryCard = ({ item }: { item: any }) => {
    const r1Name =
      roster.find((r) => r.id === item.luchador_id1)?.name || item.name1;
    const r2Name =
      roster.find((r) => r.id === item.luchador_id2)?.name || item.name2;
    const r1Img =
      roster.find((r) => r.id === item.luchador_id1)?.imageUri || item.image1;
    const r2Img =
      roster.find((r) => r.id === item.luchador_id2)?.imageUri || item.image2;

    if (!r1Name || !r2Name) return null;

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
              source={{ uri: getWrestlerImage(r1Img) }}
              style={[styles.rivalAvatar, { borderColor: "#3B82F6" }]}
              contentFit="cover"
            />
            <Text style={styles.rivalName} numberOfLines={1}>
              {r1Name}
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
              source={{ uri: getWrestlerImage(r2Img) }}
              style={[styles.rivalAvatar, { borderColor: "#EF4444" }]}
              contentFit="cover"
            />
            <Text style={styles.rivalName} numberOfLines={1}>
              {r2Name}
            </Text>
          </View>
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
          {activeTab === "Rivalries" && (
            <TouchableOpacity
              onPress={() => setHistoryModalVisible(true)}
              style={styles.filterBtn}
            >
              <Ionicons name="time-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {activeTab === "Talents" && (
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color="#94A3B8"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search superstar..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}

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

        {activeTab === "Talents" && renderActiveFilters()}

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
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No talents found.</Text>
              </View>
            }
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
            renderItem={renderActiveRivalryCard}
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
              <Text style={styles.filterLabel}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt}
                    label={opt}
                    selected={tempFilters.gender === opt}
                    onPress={() =>
                      setTempFilters({ ...tempFilters, gender: opt })
                    }
                    theme={brandTheme}
                  />
                ))}
              </View>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.chipRow}>
                {STATUS_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt}
                    label={opt}
                    selected={tempFilters.status === opt}
                    onPress={() =>
                      setTempFilters({ ...tempFilters, status: opt })
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

      {/* RIVALRY HISTORY (ARCHIVE) MODAL */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>RIVALRY ARCHIVE</Text>
            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
              <Ionicons name="close-circle" size={30} color="#64748B" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={pastRivalries}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderArchivedRivalryCard}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 50 }}>
                <Text style={{ color: "#666" }}>No past rivalries found.</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* RIVALRY DETAIL MODAL (LOGBOOK - ACTIVOS) */}
      <Modal
        visible={rivalryDetailVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRivalryDetailVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
          <SafeAreaView style={{ flex: 1 }}>
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
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            >
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
                        {match.winnerName === "N/A" ? (
                          <Text
                            style={[styles.historyWinner, { color: "#D946EF" }]}
                          >
                            ✨ Segment
                          </Text>
                        ) : (
                          <Text style={styles.historyWinner}>
                            Winner:{" "}
                            <Text style={{ color: "#FFF" }}>
                              {match.winnerName}
                            </Text>
                          </Text>
                        )}
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
              {selectedRivalryData?.is_active === 1 && (
                <TouchableOpacity
                  style={styles.endRivalryBtn}
                  onPress={() => {
                    if (selectedRivalryData)
                      handleDeleteRivalry(selectedRivalryData.id);
                  }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={20}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.endRivalryText}>END RIVALRY</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SafeAreaView>
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
    marginLeft: 8,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  searchInput: { flex: 1, color: "white", fontSize: 14, fontWeight: "600" },

  activeFiltersContainer: { paddingHorizontal: 20, marginBottom: 20 },
  clearAllBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    marginRight: 8,
  },
  clearAllText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 4,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  activeBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
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
    height: 250,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  cardBackground: { flex: 1, position: "relative" },
  cardHeaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    zIndex: 10,
  },
  ratingContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingNumber: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ratingLabel: {
    color: "#CBD5E1",
    fontSize: 8,
    fontWeight: "700",
    marginTop: -2,
  },
  beltBadge: {
    width: 45,
    height: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  wrestlerImage: {
    width: "115%",
    height: "115%",
    position: "absolute",
    bottom: -15,
    left: -10,
  },
  cardFooter: {
    position: "absolute",
    bottom: -2,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: 35,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  wrestlerName: {
    color: "white",
    fontWeight: "900",
    fontSize: 15,
    marginBottom: 2,
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textAlign: "center",
  },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  statText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  statDivider: { fontSize: 9, color: "#64748B", marginHorizontal: 5 },
  recordText: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },

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
  titleImageContainer: {
    width: 80,
    height: 60,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  titleImage: { width: "100%", height: "100%" },
  titleInfo: { flex: 1 },
  titleName: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  holderRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  holderChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 4,
    paddingRight: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
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

  // INLINE LOGBOOK STYLES
  inlineLogbook: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  inlineLogRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  inlineLogWeek: {
    color: "#64748B",
    fontWeight: "900",
    fontSize: 10,
    width: 30,
  },

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

  // NEW BUTTON STYLE
  endRivalryBtn: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  endRivalryText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
});
