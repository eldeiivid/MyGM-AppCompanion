import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ManagementHeader } from "../../src/components/ManagementHeader";
import { useGame } from "../../src/context/GameContext"; // <--- 1. IMPORTAR CONTEXTO
import {
  assignTitleWithHistory,
  getAllLuchadores,
  getAllMatches,
  getAllTitles,
  getGameState,
  getTitleHistory,
} from "../../src/database/operations";
import { Luchador, Title } from "../../src/types";

const { width } = Dimensions.get("window");

export default function TitleDetailHistoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { saveId } = useGame(); // <--- 2. USAR CONTEXTO

  // Estados de Datos
  const [history, setHistory] = useState<any[]>([]);
  const [currentTitle, setCurrentTitle] = useState<Title | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [roster, setRoster] = useState<Luchador[]>([]);
  const [allMatches, setAllMatches] = useState<any[]>([]);

  // Mapa de imágenes
  const [luchadorImages, setLuchadorImages] = useState<
    Record<number, string | null>
  >({});

  // Estados de Gestión (Asignación)
  const [modalVisible, setModalVisible] = useState(false);
  const [tagSelection, setTagSelection] = useState<number[]>([]);

  // Estados de Visualización (Defensas)
  const [defensesModalVisible, setDefensesModalVisible] = useState(false);
  const [selectedDefenses, setSelectedDefenses] = useState<any[]>([]);
  const [selectedChampName, setSelectedChampName] = useState("");

  const loadData = () => {
    if (!saveId) return;

    // 3. PASAR SAVE_ID A TODAS LAS FUNCIONES DE DB
    const allTitles = getAllTitles(saveId) as Title[];
    const title = allTitles.find((t) => t.id === Number(id)) || null;
    const hist = getTitleHistory(saveId, Number(id)); // <--- saveId aquí también
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

  // --- OBTENER LISTA DE DEFENSAS ---
  const getDefenseMatches = (
    champId: number,
    weekStart: number,
    weekEnd: number
  ) => {
    if (!currentTitle) return [];

    return allMatches.filter((m) => {
      // Nota: titleName en matches se guarda como "Title {id}"
      // Aseguramos que coincida con el ID actual
      const isThisTitle = m.titleName === `Title ${currentTitle.id}`;
      // isTitleChange === 0 significa que NO cambió de manos (Defensa Exitosa)
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
      // 4. PASAR SAVE_ID AL ASIGNAR
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
    if (
      currentTitle.name.includes("World") ||
      currentTitle.name.includes("Universal")
    )
      return ["#B45309", "#78350F"];
    if (currentTitle.category === "Tag") return ["#334155", "#0F172A"];
    return ["#64748B", "#334155"];
  };

  return (
    <View style={styles.mainContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <ManagementHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* HERO CARD */}
        <LinearGradient
          colors={getGradientColors() as any}
          style={styles.heroCard}
        >
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>FICHA DE CAMPEONATO</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.heroContent}>
            <MaterialCommunityIcons
              name={currentTitle?.isMITB ? "briefcase" : "trophy"}
              size={80}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.titleName}>{currentTitle?.name}</Text>
            <Text style={styles.titleCat}>
              {currentTitle?.category} Division
            </Text>
          </View>
        </LinearGradient>

        {/* CAMPEÓN ACTUAL */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>REINADO ACTUAL</Text>
          {currentTitle?.holderName1 && (
            <View style={{ flexDirection: "row", gap: 5 }}>
              <View style={[styles.daysBadge, { backgroundColor: "#3B82F6" }]}>
                <Text style={styles.daysText}>
                  🛡️{" "}
                  {
                    getDefenseMatches(
                      currentTitle.holderId1!,
                      currentTitle.weekWon,
                      currentWeek
                    ).length
                  }{" "}
                  Def.
                </Text>
              </View>
              <View style={styles.daysBadge}>
                <Text style={styles.daysText}>
                  {calculateDays(currentTitle?.weekWon, currentWeek)} Días
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.championCard}>
          {currentTitle?.holderName1 ? (
            // Al hacer click en el campeón actual, también vemos sus defensas
            <TouchableOpacity
              style={styles.champRow}
              onPress={() =>
                handleShowDefenses(
                  currentTitle.holderId1!,
                  currentTitle.holderName1 || "Campeón",
                  currentTitle.weekWon,
                  currentWeek
                )
              }
            >
              <View style={styles.avatarContainer}>
                {luchadorImages[currentTitle.holderId1!] ? (
                  <Image
                    source={{ uri: luchadorImages[currentTitle.holderId1!]! }}
                    style={styles.champAvatar}
                  />
                ) : (
                  <View style={styles.champPlaceholder}>
                    <Text style={styles.initial}>
                      {currentTitle.holderName1.charAt(0)}
                    </Text>
                  </View>
                )}
                {currentTitle.holderId2 && (
                  <View style={styles.secondAvatar}>
                    {luchadorImages[currentTitle.holderId2] ? (
                      <Image
                        source={{
                          uri: luchadorImages[currentTitle.holderId2]!,
                        }}
                        style={styles.champAvatar}
                      />
                    ) : (
                      <View style={styles.champPlaceholder}>
                        <Text style={styles.initial}>
                          {currentTitle.holderName2!.charAt(0)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.champInfo}>
                <Text style={styles.champLabel}>CAMPEÓN</Text>
                <Text style={styles.champName}>
                  {currentTitle.holderName1}
                  {currentTitle.holderName2 && ` & ${currentTitle.holderName2}`}
                </Text>
                <Text style={styles.sinceText}>
                  Toca para ver historial de defensas
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          ) : (
            <View style={styles.vacantBox}>
              <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
              <Text style={styles.vacantTitle}>TÍTULO VACANTE</Text>
              <Text style={styles.vacantSub}>
                Este campeonato no tiene dueño actualmente.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setTagSelection([]);
              setModalVisible(true);
            }}
          >
            <Text style={styles.actionBtnText}>
              {currentTitle?.holderName1
                ? "CAMBIAR CAMPEÓN (FORZADO)"
                : "CORONAR NUEVO CAMPEÓN"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* LINAJE (HISTORIAL) */}
        <Text style={[styles.sectionTitle, { marginLeft: 20, marginTop: 30 }]}>
          LINAJE DEL TÍTULO
        </Text>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No hay historia registrada aún.
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {history.map((item, index) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.timelineLeft}>
                  <View style={styles.dot} />
                  {index !== history.length - 1 && <View style={styles.line} />}
                </View>

                {/* TARJETA DE REINADO CLICKEABLE */}
                <TouchableOpacity
                  style={styles.historyCard}
                  onPress={() =>
                    handleShowDefenses(
                      item.luchadorId1,
                      item.exChamp1 || "Campeón",
                      item.weekWon,
                      item.weekLost
                    )
                  }
                >
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyNames}>
                      {item.exChamp1}{" "}
                      {item.exChamp2 ? `& ${item.exChamp2}` : ""}
                    </Text>
                    <Text style={styles.historyDefenses}>
                      🛡️{" "}
                      {
                        getDefenseMatches(
                          item.luchadorId1,
                          item.weekWon,
                          item.weekLost
                        ).length
                      }
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={styles.historySub}>
                      Sem. {item.weekWon} - {item.weekLost}
                    </Text>
                    <Text style={styles.historyDays}>
                      {calculateDays(item.weekWon, item.weekLost)} días
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.historySub,
                      { marginTop: 4, fontStyle: "italic" },
                    ]}
                  >
                    Perdió vs{" "}
                    <Text style={{ fontWeight: "bold", color: "#1E293B" }}>
                      {item.winner1} {item.winner2 ? `& ${item.winner2}` : ""}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* --- MODAL DE SELECCIÓN DE CAMPEÓN --- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {currentTitle?.category === "Tag"
                ? "Selecciona Nueva Pareja"
                : "Selecciona Nuevo Campeón"}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>Cancelar</Text>
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
                <Text style={styles.confirmText}>CORONAR PAREJA</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* --- NUEVO: MODAL DE LISTA DE DEFENSAS --- */}
      <Modal
        visible={defensesModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDefensesModalVisible(false)}
      >
        <View style={styles.defensesModalOverlay}>
          <View style={styles.defensesModalContent}>
            <View style={styles.defensesHeader}>
              <View>
                <Text style={styles.defensesTitle}>Defensas Exitosas</Text>
                <Text style={styles.defensesSubTitle}>{selectedChampName}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDefensesModalVisible(false)}
                style={styles.closeIconBtn}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedDefenses.length === 0 ? (
              <View style={styles.noDefensesContainer}>
                <Ionicons name="shield-outline" size={48} color="#E2E8F0" />
                <Text style={styles.noDefensesText}>
                  Este reinado no tuvo defensas registradas.
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
                      <Text style={styles.defenseWeek}>Sem {item.week}</Text>
                      <View style={styles.starsContainer}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.starsText}>{item.rating}</Text>
                      </View>
                    </View>
                    <View style={styles.defenseRight}>
                      <Text style={styles.defenseLabel}>Defendió contra:</Text>
                      <Text style={styles.defenseOpponent}>
                        {item.loserName}
                      </Text>
                      <Text style={styles.matchTypeLabel}>
                        {item.matchType}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... ESTILOS ...
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F5F7FA" },
  container: { flex: 1 },

  // HERO CARD
  heroCard: {
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
  },
  heroTitle: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 1,
  },

  heroContent: { alignItems: "center", marginTop: 10 },
  titleName: {
    fontSize: 26,
    fontWeight: "900",
    color: "white",
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  titleCat: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    marginTop: 5,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 12,
  },

  // CHAMPION SECTION
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  daysBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  daysText: { color: "white", fontWeight: "bold", fontSize: 10 },

  championCard: {
    marginHorizontal: 20,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  champRow: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { width: 70, height: 70, marginRight: 15 },
  champAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  champPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  initial: { fontSize: 24, fontWeight: "bold", color: "#94A3B8" },
  secondAvatar: { position: "absolute", bottom: 0, right: 0, zIndex: 2 },

  champInfo: { flex: 1 },
  champLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#F59E0B",
    marginBottom: 2,
  },
  champName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    lineHeight: 22,
  },
  sinceText: { fontSize: 12, color: "#64748B", marginTop: 4 },

  actionBtn: {
    marginTop: 20,
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  actionBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // VACANT STATE
  vacantBox: { alignItems: "center", paddingVertical: 10 },
  vacantTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#EF4444",
    marginTop: 8,
  },
  vacantSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },

  // TIMELINE
  timelineContainer: { paddingHorizontal: 20, marginTop: 10 },
  historyItem: { flexDirection: "row" },
  timelineLeft: { width: 20, alignItems: "center" },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#CBD5E1",
    marginTop: 6,
  },
  line: { width: 2, flex: 1, backgroundColor: "#E2E8F0", marginVertical: 4 },

  historyCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  historyNames: { fontSize: 14, fontWeight: "bold", color: "#334155" },
  historyDays: { fontSize: 12, fontWeight: "600", color: "#10B981" },
  historyDefenses: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  historySub: { fontSize: 12, color: "#94A3B8" },

  emptyState: { alignItems: "center", marginTop: 20 },
  emptyText: { color: "#94A3B8", fontStyle: "italic" },

  // MODAL
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

  // --- ESTILOS DEL NUEVO MODAL DE DEFENSAS ---
  defensesModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  defensesModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    maxHeight: "60%",
    paddingBottom: 20,
  },
  defensesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  defensesTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  defensesSubTitle: { fontSize: 14, color: "#64748B" },
  closeIconBtn: { padding: 5 },

  noDefensesContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noDefensesText: {
    marginTop: 10,
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
  },

  defenseItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  defenseLeft: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9",
    paddingRight: 10,
    marginRight: 10,
  },
  defenseWeek: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 4,
  },
  starsContainer: { flexDirection: "row", alignItems: "center" },
  starsText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F59E0B",
    marginLeft: 2,
  },

  defenseRight: { flex: 1 },
  defenseLabel: {
    fontSize: 10,
    color: "#94A3B8",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  defenseOpponent: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  matchTypeLabel: {
    fontSize: 12,
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
