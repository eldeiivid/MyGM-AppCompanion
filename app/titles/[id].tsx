import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image"; // <--- 1. USAMOS EXPO IMAGE
import { LinearGradient } from "expo-linear-gradient";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../../src/context/GameContext";
import {
  assignTitleWithHistory,
  getAllLuchadores,
  getAllMatches,
  getAllTitles,
  getGameState,
  getTitleHistory,
} from "../../src/database/operations";
import { Luchador } from "../../src/types";
import { getWrestlerImage } from "../../src/utils/imageHelper";

const { width } = Dimensions.get("window");

// --- GITHUB TITLES URL ---
const TITLES_REPO_URL =
  "https://raw.githubusercontent.com/eldeiivid/wwe-mymg-assets/main/titles/";

export default function TitleDetailHistoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { saveId, brandTheme } = useGame();

  // Data States
  const [history, setHistory] = useState<any[]>([]);
  const [currentTitle, setCurrentTitle] = useState<any | null>(null); // Changed type to any to accept DB extra fields
  const [currentWeek, setCurrentWeek] = useState(1);
  const [roster, setRoster] = useState<Luchador[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [luchadorImages, setLuchadorImages] = useState<
    Record<number, string | null>
  >({});

  // Management States
  const [modalVisible, setModalVisible] = useState(false);
  const [tagSelection, setTagSelection] = useState<number[]>([]);

  // Defense Visualization States
  const [defensesModalVisible, setDefensesModalVisible] = useState(false);
  const [selectedDefenses, setSelectedDefenses] = useState<any[]>([]);
  const [selectedChampName, setSelectedChampName] = useState("");

  // --- HELPER: CONSTRUIR URL DEL TÍTULO (LÓGICA UNIFICADA) ---
  const getTitleImage = (title: any) => {
    if (!title) return null;

    // 1. PRIORIDAD: Si la BD ya tiene el nombre del archivo exacto, úsalo.
    if (title.imageUri && title.imageUri !== "") {
      return `${TITLES_REPO_URL}${title.imageUri}`;
    }

    // 2. DETECTAR GÉNERO
    const gender = title.gender === "Female" ? "female" : "male";

    // 3. CASO ESPECIAL: MONEY IN THE BANK
    if (
      title.isMITB === 1 ||
      title.name.includes("MITB") ||
      title.name.includes("Briefcase")
    ) {
      return `${TITLES_REPO_URL}${gender}-moneyinthebank.png`;
    }

    // 4. LÓGICA ESTÁNDAR (FALLBACK)
    let brand = "raw";
    const nameLower = title.name.toLowerCase();

    if (nameLower.includes("smackdown") || nameLower.includes("universal"))
      brand = "smackdown";
    else if (nameLower.includes("nxt")) brand = "nxt";
    else if (nameLower.includes("aew")) brand = "aew";

    let division = "world";
    // Check both potential property names just in case
    const cat = title.category || title.type || "";
    if (cat === "Midcard") division = "midcard";
    else if (cat === "Tag") division = "tagteam";

    if (division === "tagteam" && gender === "female") {
      return `${TITLES_REPO_URL}female-tagteam.webp`;
    }

    return `${TITLES_REPO_URL}${brand}-${gender}-${division}.webp`;
  };

  const loadData = () => {
    if (!saveId) return;

    const allTitles = getAllTitles(saveId);
    const title = allTitles.find((t: any) => t.id === Number(id)) || null;
    const hist = getTitleHistory(saveId, Number(id));
    const state = getGameState(saveId) as { currentWeek: number };
    const allLuchadores = getAllLuchadores(saveId) as Luchador[];
    const matches = getAllMatches(saveId);

    setCurrentTitle(title);
    setHistory(hist);
    setRoster(allLuchadores);
    setAllMatches(matches);
    if (state) setCurrentWeek(state.currentWeek);

    const imgMap: any = {};
    allLuchadores.forEach((l) => {
      imgMap[l.id] = l.imageUri;
    });
    setLuchadorImages(imgMap);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id, saveId])
  );

  const calculateDays = (start: number | undefined, end: number) => {
    if (!start) return 0;
    return (end - start + 1) * 7;
  };

  // --- DEFENSE LOGIC ---
  const getDefenseMatches = (
    champId: number,
    weekStart: number,
    weekEnd: number
  ) => {
    if (!currentTitle) return [];

    return allMatches.filter((m) => {
      const isThisTitle = m.titleName === `Title ${currentTitle.id}`;
      const isSuccessfulDefense = m.isTitleChange === 0;
      const inTimeRange = m.week >= weekStart && m.week <= weekEnd;

      let isWinner = false;
      if (m.participants) {
        try {
          const p = JSON.parse(m.participants);
          if (p.winner && p.winner.includes(champId)) isWinner = true;
        } catch (e) {
          if (m.winnerId === champId) isWinner = true;
        }
      } else {
        if (m.winnerId === champId) isWinner = true;
      }

      return isThisTitle && isSuccessfulDefense && inTimeRange && isWinner;
    });
  };

  const handleShowDefenses = (
    champId: number,
    champName: string,
    start: number,
    end: number
  ) => {
    const defenses = getDefenseMatches(champId, start, end);
    setSelectedDefenses(defenses);
    setSelectedChampName(champName);
    setDefensesModalVisible(true);
  };

  const handleAssign = (id1: number, id2: number | null = null) => {
    if (currentTitle && saveId) {
      assignTitleWithHistory(saveId, currentTitle.id, id1, id2);
      setModalVisible(false);
      setTagSelection([]);
      loadData();
    }
  };

  const toggleTagParticipant = (luchadorId: number) => {
    if (tagSelection.includes(luchadorId)) {
      setTagSelection(tagSelection.filter((id) => id !== luchadorId));
    } else if (tagSelection.length < 2) {
      setTagSelection([...tagSelection, luchadorId]);
    }
  };

  const getGradientColors = () => {
    if (!currentTitle) return ["#333", "#000"];
    if (currentTitle.isMITB) return ["#4F46E5", "#312E81"];

    // Color logic based on division/category
    const cat = currentTitle.category || currentTitle.type;
    if (
      currentTitle.name.includes("World") ||
      currentTitle.name.includes("Universal")
    )
      return ["#B45309", "#78350F"]; // Gold
    if (cat === "Tag") return ["#334155", "#0F172A"]; // Slate

    return ["#BE185D", "#831843"]; // Pink/Red for others
  };

  const titleColor = getGradientColors()[0];
  const titleImageUri = getTitleImage(currentTitle);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      {/* Global Background */}
      <View style={[styles.absoluteFill, { backgroundColor: "#000" }]} />
      <LinearGradient
        colors={[titleColor, "transparent"]}
        style={[styles.absoluteFill, { height: "50%", opacity: 0.3 }]}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>TITLE LINEAGE</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HERO SECTION (UPDATED) */}
          <View style={styles.heroContainer}>
            {/* Reemplazamos el círculo con ícono por la imagen real */}
            <View style={styles.titleImageContainer}>
              {titleImageUri ? (
                <Image
                  source={{ uri: titleImageUri }}
                  style={styles.titleHeroImage}
                  contentFit="contain"
                  transition={500}
                />
              ) : (
                <View
                  style={[
                    styles.iconCircle,
                    {
                      borderColor: titleColor,
                      backgroundColor: titleColor + "20",
                    },
                  ]}
                >
                  <Text style={{ fontSize: 40 }}>
                    {currentTitle?.isMITB ? "💼" : "🏆"}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.titleName}>{currentTitle?.name}</Text>
            <Text style={[styles.titleCategory, { color: titleColor }]}>
              {currentTitle?.category?.toUpperCase() || "CHAMPIONSHIP"} DIVISION
            </Text>
          </View>

          {/* CURRENT CHAMPION CARD */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>CURRENT REIGN</Text>

            {currentTitle?.holderName1 ? (
              <BlurView
                intensity={20}
                tint="dark"
                style={[styles.championCard, { borderColor: titleColor }]}
              >
                <TouchableOpacity
                  style={styles.champRow}
                  onPress={() =>
                    handleShowDefenses(
                      currentTitle.holderId1!,
                      currentTitle.holderName1 || "Champion",
                      currentTitle.weekWon,
                      currentWeek
                    )
                  }
                >
                  <View style={styles.avatarContainer}>
                    {luchadorImages[currentTitle.holderId1!] ? (
                      // --- IMAGEN CAMPEÓN 1 ---
                      <Image
                        source={{
                          uri: getWrestlerImage(
                            luchadorImages[currentTitle.holderId1!]
                          ),
                        }}
                        style={styles.champAvatar}
                        contentFit="cover"
                        transition={500}
                      />
                    ) : (
                      <View
                        style={[
                          styles.champPlaceholder,
                          { borderColor: titleColor },
                        ]}
                      >
                        <Text style={styles.initial}>
                          {currentTitle.holderName1.charAt(0)}
                        </Text>
                      </View>
                    )}
                    {/* Secondary Holder for Tag Teams */}
                    {currentTitle.holderId2 && (
                      <View style={styles.secondAvatar}>
                        {luchadorImages[currentTitle.holderId2] ? (
                          // --- IMAGEN CAMPEÓN 2 (TAG) ---
                          <Image
                            source={{
                              uri: getWrestlerImage(
                                luchadorImages[currentTitle.holderId2]
                              ),
                            }}
                            style={styles.champAvatar}
                            contentFit="cover"
                            transition={500}
                          />
                        ) : (
                          <View
                            style={[
                              styles.champPlaceholder,
                              { borderColor: titleColor },
                            ]}
                          >
                            <Text style={styles.initial}>
                              {currentTitle.holderName2!.charAt(0)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.champInfo}>
                    <Text style={[styles.champLabel, { color: titleColor }]}>
                      CURRENT CHAMPION
                    </Text>
                    <Text style={styles.champName}>
                      {currentTitle.holderName1}
                      {currentTitle.holderName2 &&
                        ` & ${currentTitle.holderName2}`}
                    </Text>

                    <View style={styles.statsBadgeRow}>
                      <View style={styles.statBadge}>
                        <Ionicons name="time-outline" size={10} color="#FFF" />
                        <Text style={styles.statText}>
                          {calculateDays(currentTitle.weekWon, currentWeek)}{" "}
                          Days
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statBadge,
                          { backgroundColor: titleColor + "40" },
                        ]}
                      >
                        <Ionicons
                          name="shield-checkmark"
                          size={10}
                          color={titleColor}
                        />
                        <Text style={[styles.statText, { color: titleColor }]}>
                          {
                            getDefenseMatches(
                              currentTitle.holderId1!,
                              currentTitle.weekWon,
                              currentWeek
                            ).length
                          }{" "}
                          Defenses
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="rgba(255,255,255,0.3)"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setTagSelection([]);
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.actionBtnText}>FORCE TITLE CHANGE</Text>
                </TouchableOpacity>
              </BlurView>
            ) : (
              <BlurView
                intensity={20}
                tint="dark"
                style={[styles.championCard, { borderColor: "#EF4444" }]}
              >
                <View style={styles.vacantBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={40}
                    color="#EF4444"
                  />
                  <Text style={styles.vacantTitle}>VACANT TITLE</Text>
                  <Text style={styles.vacantSub}>
                    This championship has no holder.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: "#EF4444", marginTop: 15 },
                    ]}
                    onPress={() => {
                      setTagSelection([]);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.actionBtnText}>CROWN NEW CHAMPION</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            )}
          </View>

          {/* HISTORY LOG */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>TITLE HISTORY</Text>

            {history.length === 0 ? (
              <View style={styles.emptyLog}>
                <Text style={styles.emptyText}>No history records yet.</Text>
              </View>
            ) : (
              <View style={styles.timelineContainer}>
                {history.map((item, index) => (
                  <View key={item.id} style={styles.historyRow}>
                    {/* Timeline */}
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              index === 0 ? titleColor : "#475569",
                          },
                        ]}
                      />
                      {index !== history.length - 1 && (
                        <View style={styles.line} />
                      )}
                    </View>

                    {/* Card */}
                    <TouchableOpacity
                      style={styles.historyCardContainer}
                      onPress={() =>
                        handleShowDefenses(
                          item.luchadorId1,
                          item.exChamp1 || "Champ",
                          item.weekWon,
                          item.weekLost
                        )
                      }
                    >
                      <BlurView
                        intensity={10}
                        tint="dark"
                        style={styles.historyCard}
                      >
                        <View style={styles.historyHeader}>
                          <Text style={styles.historyName}>
                            {item.exChamp1}{" "}
                            {item.exChamp2 ? `& ${item.exChamp2}` : ""}
                          </Text>
                          <View
                            style={[
                              styles.miniStatBadge,
                              { backgroundColor: "#10B98120" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.miniStatText,
                                { color: "#10B981" },
                              ]}
                            >
                              {calculateDays(item.weekWon, item.weekLost)} Days
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.historySub}>
                          Defeated{" "}
                          <Text style={{ color: "#FFF" }}>{item.winner1}</Text>{" "}
                          • Week {item.weekWon}
                        </Text>

                        <View
                          style={[
                            styles.miniStatBadge,
                            {
                              marginTop: 8,
                              alignSelf: "flex-start",
                              backgroundColor: titleColor + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[styles.miniStatText, { color: titleColor }]}
                          >
                            {
                              getDefenseMatches(
                                item.luchadorId1,
                                item.weekWon,
                                item.weekLost
                              ).length
                            }{" "}
                            Successful Defenses
                          </Text>
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* --- SELECTION MODAL (DARK) --- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentTitle?.category === "Tag"
                ? "Select New Tag Team"
                : "Select New Champion"}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={roster.filter(
              (r) =>
                currentTitle?.category === "Tag" ||
                r.gender === currentTitle?.gender
            )}
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
                    if (currentTitle?.category === "Tag")
                      toggleTagParticipant(item.id);
                    else handleAssign(item.id);
                  }}
                >
                  {item.imageUri ? (
                    // --- IMAGEN LISTA MODAL ---
                    <Image
                      source={{ uri: getWrestlerImage(item.imageUri) }}
                      style={styles.itemAvatar}
                      contentFit="cover"
                      transition={500}
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

          {currentTitle?.category === "Tag" && (
            <View style={styles.footerBtnContainer}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  tagSelection.length < 2 && { opacity: 0.5 },
                ]}
                disabled={tagSelection.length < 2}
                onPress={() => handleAssign(tagSelection[0], tagSelection[1])}
              >
                <Text style={styles.confirmText}>CROWN CHAMPIONS</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* --- DEFENSES MODAL (DARK GLASS) --- */}
      <Modal
        visible={defensesModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDefensesModalVisible(false)}
      >
        <View style={styles.defensesModalOverlay}>
          <BlurView
            intensity={95}
            tint="dark"
            style={styles.defensesModalContent}
          >
            <View style={styles.defensesHeader}>
              <View>
                <Text style={styles.defensesTitle}>Successful Defenses</Text>
                <Text style={styles.defensesSubTitle}>{selectedChampName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDefensesModalVisible(false)}
                style={styles.closeIconBtn}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {selectedDefenses.length === 0 ? (
              <View style={styles.noDefensesContainer}>
                <Ionicons
                  name="shield-outline"
                  size={48}
                  color="rgba(255,255,255,0.2)"
                />
                <Text style={styles.noDefensesText}>
                  No successful defenses recorded.
                </Text>
              </View>
            ) : (
              <FlatList
                data={selectedDefenses}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                  <View style={styles.defenseItem}>
                    <View style={styles.defenseLeft}>
                      <Text style={styles.defenseWeek}>Wk {item.week}</Text>
                      <View style={styles.starsContainer}>
                        <Ionicons name="star" size={10} color="#F59E0B" />
                        <Text style={styles.starsText}>{item.rating}</Text>
                      </View>
                    </View>
                    <View style={styles.defenseRight}>
                      <Text style={styles.defenseLabel}>DEFENDED AGAINST</Text>
                      <Text style={styles.defenseOpponent}>
                        {item.loserName}
                      </Text>
                      <View style={styles.matchTypeBadge}>
                        <Text style={styles.matchTypeText}>
                          {item.matchType}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1,
    marginTop: 10,
  },

  // HERO (UPDATED FOR IMAGE)
  heroContainer: { alignItems: "center", marginBottom: 30, marginTop: 10 },
  titleImageContainer: {
    width: 200,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  titleHeroImage: {
    width: "100%",
    height: "100%",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  titleName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    textAlign: "center",
    maxWidth: "80%",
  },
  titleCategory: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 5,
  },

  sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
  sectionLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 1,
  },

  // CHAMPION CARD
  championCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  champRow: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { width: 75, height: 75, marginRight: 15 },
  champAvatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  champPlaceholder: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  initial: { fontSize: 24, fontWeight: "bold", color: "#FFF" },
  secondAvatar: { position: "absolute", bottom: 0, right: 0, zIndex: 2 },

  champInfo: { flex: 1 },
  champLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  champName: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },

  statsBadgeRow: { flexDirection: "row", gap: 6 },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  statText: { color: "#E2E8F0", fontSize: 10, fontWeight: "600" },

  actionBtn: {
    marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // VACANT
  vacantBox: { alignItems: "center", paddingVertical: 10 },
  vacantTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#EF4444",
    marginTop: 10,
  },
  vacantSub: { fontSize: 12, color: "#94A3B8", marginTop: 4 },

  // HISTORY
  emptyLog: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },
  emptyText: { color: "#64748B", fontStyle: "italic" },

  timelineContainer: { marginTop: 10 },
  historyRow: { flexDirection: "row" },
  timelineLeft: { width: 20, alignItems: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, flex: 1, backgroundColor: "#334155", marginVertical: 4 },

  historyCardContainer: { flex: 1, marginBottom: 15, marginLeft: 10 },
  historyCard: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  historyName: { fontSize: 14, fontWeight: "bold", color: "#E2E8F0" },
  historySub: { fontSize: 11, color: "#94A3B8" },

  miniStatBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniStatText: { fontSize: 10, fontWeight: "bold" },

  // SELECTION MODAL (Light for contrast or custom dark)
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    marginTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  modalClose: { color: "#3B82F6", fontWeight: "600" },
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

  // DEFENSES MODAL (Dark)
  defensesModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 20,
  },
  defensesModalContent: {
    borderRadius: 20,
    maxHeight: "60%",
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  defensesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  defensesTitle: { fontSize: 18, fontWeight: "bold", color: "#FFF" },
  defensesSubTitle: { fontSize: 12, color: "#94A3B8" },
  closeIconBtn: { padding: 5 },

  noDefensesContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noDefensesText: {
    marginTop: 10,
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
  },

  defenseItem: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  defenseLeft: {
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
    marginRight: 15,
  },
  defenseWeek: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 4,
  },
  starsContainer: { flexDirection: "row", alignItems: "center" },
  starsText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F59E0B",
    marginLeft: 2,
  },
  defenseRight: { flex: 1 },
  defenseLabel: {
    fontSize: 9,
    color: "#64748B",
    textTransform: "uppercase",
    fontWeight: "bold",
    marginBottom: 2,
  },
  defenseOpponent: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 4,
  },
  matchTypeBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchTypeText: { fontSize: 10, color: "#CBD5E1" },
});
