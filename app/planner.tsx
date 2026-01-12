import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../src/context/GameContext";
import {
  addPlannedMatch,
  getAllLuchadores,
  getAllTitles,
  updatePlannedMatch,
} from "../src/database/operations";
import { Luchador } from "../src/types";

// --- CONSTANTES ---
const INTERFERENCE_COST = 2000;
const { width } = Dimensions.get("window");

// AJUSTE DE MEDIDAS
const CARD_WIDTH_LARGE = (width - 80) / 2;
const CARD_WIDTH_SMALL = (width - 60) / 3;

const MATCH_FORMATS = [
  { id: "1v1", name: "1 vs 1", icon: "account", teams: 2, membersPerTeam: 1 },
  {
    id: "2v2",
    name: "Tag Team",
    icon: "account-group",
    teams: 2,
    membersPerTeam: 2,
  },
  {
    id: "3way",
    name: "Triple Threat",
    icon: "account-multiple",
    teams: 3,
    membersPerTeam: 1,
  },
  {
    id: "4way",
    name: "Fatal 4-Way",
    icon: "grid",
    teams: 4,
    membersPerTeam: 1,
  },
];

const STIPULATIONS = [
  { name: "Normal", cost: 0, icon: "gavel" },
  { name: "Extreme Rules", cost: 18000, icon: "fire" },
  { name: "Tables", cost: 6000, icon: "table-furniture" },
  { name: "TLC", cost: 24000, icon: "ladder" },
  { name: "Steel Cage", cost: 42000, icon: "grid" },
  { name: "Hell in a Cell", cost: 48000, icon: "grid-large" },
  { name: "Iron Man", cost: 24000, icon: "timer-sand" },
  { name: "Last Man Standing", cost: 18000, icon: "human-handsup" },
  { name: "Submission", cost: 30000, icon: "lock" },
  { name: "Ambulance", cost: 36000, icon: "ambulance" },
  { name: "Casket", cost: 90000, icon: "coffin" },
];

const PROMO_TYPES = [
  {
    id: "autopromocion",
    name: "Self Promo",
    cost: 2500,
    icon: "microphone",
    isVs: false,
  },
  { id: "provocacion", name: "Call Out", cost: 3000, icon: "fire", isVs: true },
  {
    id: "entrenamiento",
    name: "Training",
    cost: 5000,
    icon: "dumbbell",
    isVs: false,
  },
  {
    id: "publicidad",
    name: "Ad Break",
    cost: 0,
    icon: "bullhorn",
    isVs: false,
  },
  {
    id: "benefica",
    name: "Charity",
    cost: 15000,
    icon: "hand-heart",
    isVs: false,
  },
];

export default function PlannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { saveId, brandTheme } = useGame();

  // --- 1. PRE-PROCESAMIENTO ---
  const initialData = params.matchData
    ? JSON.parse(params.matchData as string)
    : null;
  const isEditing = !!initialData;
  const initialIsPromo = initialData
    ? initialData.matchType.startsWith("Promo:")
    : false;

  const getInitialFormat = () => {
    if (!initialData || initialIsPromo) return MATCH_FORMATS[0];
    return (
      MATCH_FORMATS.find((f) => f.name === initialData.matchType) ||
      MATCH_FORMATS[0]
    );
  };

  const getInitialStipulation = () => {
    if (!initialData || initialIsPromo) return STIPULATIONS[0];
    return (
      STIPULATIONS.find((s) => s.name === initialData.stipulation) ||
      STIPULATIONS[0]
    );
  };

  const getInitialPromoType = () => {
    if (!initialData || !initialIsPromo) return PROMO_TYPES[0];
    const promoName = initialData.matchType.replace("Promo: ", "");
    return PROMO_TYPES.find((p) => p.name === promoName) || PROMO_TYPES[0];
  };

  // --- 2. ESTADOS ---
  const [roster, setRoster] = useState<Luchador[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  const [editId] = useState<number | null>(initialData?.id || null);
  const [segmentTab, setSegmentTab] = useState<"MATCH" | "PROMO">(() =>
    initialIsPromo ? "PROMO" : "MATCH"
  );

  const [selectedFormat, setSelectedFormat] = useState(getInitialFormat);
  const [selectedStipulation, setSelectedStipulation] = useState(
    getInitialStipulation
  );
  const [selectedPromoType, setSelectedPromoType] =
    useState(getInitialPromoType);

  const [participants, setParticipants] = useState<Record<number, Luchador[]>>(
    () =>
      initialData ? initialData.participants : { 0: [], 1: [], 2: [], 3: [] }
  );

  const [hasInterference, setHasInterference] = useState(false);
  const [titleInvolved, setTitleInvolved] = useState<any | null>(null);
  const [isTitleMatch, setIsTitleMatch] = useState(
    () => initialData?.isTitleMatch === 1 || false
  );

  // Modales
  const [modalVisible, setModalVisible] = useState(false);
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [stipulationModalVisible, setStipulationModalVisible] = useState(false);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);

  useEffect(() => {
    if (!saveId) return;
    const rawRoster: any[] = getAllLuchadores(saveId);
    const sortedRoster = rawRoster.sort((a, b) => {
      const aExpired = a.isDraft === 0 && a.weeksLeft <= 0;
      const bExpired = b.isDraft === 0 && b.weeksLeft <= 0;
      if (aExpired === bExpired) return a.name.localeCompare(b.name);
      return aExpired ? 1 : -1;
    });
    setRoster(sortedRoster);
    setTitles(getAllTitles(saveId));
  }, [saveId]);

  const currentCost =
    segmentTab === "MATCH"
      ? selectedStipulation.cost + (hasInterference ? INTERFERENCE_COST : 0)
      : selectedPromoType.cost;

  // --- LOGICA ---
  const getAvailableTitles = () => {
    const isTagMatch = selectedFormat.id === "2v2";
    return titles.filter((t) => {
      if (isTagMatch && t.category !== "Tag") return false;
      if (!isTagMatch && t.category === "Tag") return false;
      if (t.isMITB) return false;
      if (t.holderId1 !== null) return false;
      return true;
    });
  };

  const handleTabChange = (tab: "MATCH" | "PROMO") => {
    if (segmentTab !== tab) {
      setSegmentTab(tab);
      setParticipants({ 0: [], 1: [], 2: [], 3: [] });
    }
  };

  const handleFormatChange = (format: any) => {
    if (selectedFormat.id !== format.id) {
      setSelectedFormat(format);
      setParticipants({ 0: [], 1: [], 2: [], 3: [] });
      setTitleInvolved(null);
      setIsTitleMatch(false);
    }
  };

  const handlePromoTypeChange = (pType: any) => {
    if (selectedPromoType.id !== pType.id) {
      setSelectedPromoType(pType);
      setParticipants({ 0: [], 1: [], 2: [], 3: [] });
    }
  };

  const openSelectionModal = (teamIndex: number) => {
    setActiveTeamIndex(teamIndex);
    setModalVisible(true);
  };

  const handleSelectLuchador = (luchador: Luchador) => {
    // @ts-ignore
    if (luchador.isDraft === 0 && luchador.weeksLeft <= 0) {
      Alert.alert("Contract Expired", `${luchador.name} cannot compete.`);
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (participants[i]?.find((p) => p.id === luchador.id)) {
        Alert.alert("Error", "Already selected.");
        return;
      }
    }

    const currentTeam = participants[activeTeamIndex] || [];
    let limit = segmentTab === "MATCH" ? selectedFormat.membersPerTeam : 1;

    if (currentTeam.length >= limit) return;

    const newTeam = [...currentTeam, luchador];
    setParticipants({ ...participants, [activeTeamIndex]: newTeam });

    if (segmentTab === "MATCH") {
      const isTagMatch = selectedFormat.id === "2v2";
      const t = titles.find(
        (t) =>
          (t.holderId1 === luchador.id || t.holderId2 === luchador.id) &&
          (isTagMatch ? t.category === "Tag" : t.category !== "Tag") &&
          !t.isMITB
      );
      if (t && !titleInvolved) {
        setTitleInvolved(t);
        setIsTitleMatch(true);
      }
    }
    setModalVisible(false);
  };

  const removeLuchador = (teamIndex: number, luchadorId: number) => {
    const newTeam = participants[teamIndex].filter((p) => p.id !== luchadorId);
    setParticipants({ ...participants, [teamIndex]: newTeam });
    if (
      titleInvolved &&
      (titleInvolved.holderId1 === luchadorId ||
        titleInvolved.holderId2 === luchadorId)
    ) {
      setTitleInvolved(null);
      setIsTitleMatch(false);
    }
  };

  const handleSave = () => {
    if (!saveId) return;

    if (segmentTab === "MATCH") {
      for (let i = 0; i < selectedFormat.teams; i++) {
        if ((participants[i] || []).length < selectedFormat.membersPerTeam) {
          Alert.alert("Incomplete", `Missing participants in slot #${i + 1}`);
          return;
        }
      }
      if (isTitleMatch && !titleInvolved) {
        Alert.alert("Error", "Select a title for the match.");
        return;
      }
    } else if (selectedPromoType.isVs) {
      if (
        (participants[0] || []).length === 0 ||
        (participants[1] || []).length === 0
      ) {
        Alert.alert("Incomplete", "Need both Speaker and Target.");
        return;
      }
    } else {
      if ((participants[0] || []).length === 0) {
        Alert.alert("Empty", "Select a talent.");
        return;
      }
    }

    const typeName =
      segmentTab === "MATCH"
        ? selectedFormat.name
        : `Promo: ${selectedPromoType.name}`;
    const stipulationName =
      segmentTab === "MATCH" ? selectedStipulation.name : "N/A";

    let success;
    if (editId) {
      success = updatePlannedMatch(
        editId,
        typeName,
        participants,
        stipulationName,
        currentCost,
        isTitleMatch,
        titleInvolved ? titleInvolved.id : null
      );
    } else {
      success = addPlannedMatch(
        saveId,
        typeName,
        participants,
        stipulationName,
        currentCost,
        isTitleMatch,
        titleInvolved ? titleInvolved.id : null
      );
    }

    if (success) router.back();
    else Alert.alert("Error", "Could not save.");
  };

  const getLabelForSlot = (teamIndex: number) => {
    if (segmentTab === "PROMO") {
      if (selectedPromoType.id === "provocacion")
        return teamIndex === 0 ? "SPEAKER" : "TARGET";
      return "TALENT";
    }
    if (selectedFormat.id === "1v1")
      return teamIndex === 0 ? "CORNER 1" : "CORNER 2";
    if (selectedFormat.id === "2v2")
      return teamIndex === 0 ? "TEAM 1" : "TEAM 2";
    return `CORNER #${teamIndex + 1}`;
  };

  // --- RENDERERS ---
  const FighterCard = ({ index, fighter, onPress, widthStyle }: any) => (
    <TouchableOpacity
      style={[styles.slotCard, widthStyle && { width: widthStyle }]}
      onPress={onPress}
    >
      <BlurView intensity={20} tint="dark" style={styles.slotBlur}>
        {fighter ? (
          <>
            {fighter.imageUri ? (
              <Image
                source={{ uri: fighter.imageUri }}
                style={styles.slotImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.slotPlaceholder}>
                <Text style={styles.slotInitials}>
                  {fighter.name.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.nameTag}>
              <Text style={styles.slotName} numberOfLines={1}>
                {fighter.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeLuchador(index, fighter.id)}
            >
              <Ionicons name="close" size={12} color="white" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptySlotContent}>
            <Ionicons name="add" size={24} color="#64748B" />
            <Text style={styles.addText}>Select</Text>
          </View>
        )}
      </BlurView>
    </TouchableOpacity>
  );

  const renderParticipantsSection = () => {
    if (selectedFormat.id === "1v1") {
      return (
        <View style={styles.vsContainer}>
          <View style={styles.fighterColumn}>
            <Text style={styles.columnTitle}>{getLabelForSlot(0)}</Text>
            <FighterCard
              index={0}
              fighter={participants[0]?.[0]}
              onPress={() => openSelectionModal(0)}
              widthStyle={CARD_WIDTH_LARGE}
            />
          </View>
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={styles.fighterColumn}>
            <Text style={styles.columnTitle}>{getLabelForSlot(1)}</Text>
            <FighterCard
              index={1}
              fighter={participants[1]?.[0]}
              onPress={() => openSelectionModal(1)}
              widthStyle={CARD_WIDTH_LARGE}
            />
          </View>
        </View>
      );
    }
    // ... (Logica similar para 3way/4way/Tag, simplificada para brevedad, sigue el mismo patrón de FighterCard)
    if (selectedFormat.id === "2v2") {
      return (
        <View style={styles.vsContainer}>
          <View style={styles.fighterColumn}>
            <Text style={styles.columnTitle}>{getLabelForSlot(0)}</Text>
            <View style={{ gap: 10 }}>
              <FighterCard
                index={0}
                fighter={participants[0]?.[0]}
                onPress={() => openSelectionModal(0)}
                widthStyle={CARD_WIDTH_LARGE}
              />
              <FighterCard
                index={0}
                fighter={participants[0]?.[1]}
                onPress={() => openSelectionModal(0)}
                widthStyle={CARD_WIDTH_LARGE}
              />
            </View>
          </View>
          <View style={[styles.vsBadge, { marginTop: 60 }]}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={styles.fighterColumn}>
            <Text style={styles.columnTitle}>{getLabelForSlot(1)}</Text>
            <View style={{ gap: 10 }}>
              <FighterCard
                index={1}
                fighter={participants[1]?.[0]}
                onPress={() => openSelectionModal(1)}
                widthStyle={CARD_WIDTH_LARGE}
              />
              <FighterCard
                index={1}
                fighter={participants[1]?.[1]}
                onPress={() => openSelectionModal(1)}
                widthStyle={CARD_WIDTH_LARGE}
              />
            </View>
          </View>
        </View>
      );
    }
    if (selectedFormat.id === "3way" || selectedFormat.id === "4way") {
      return (
        <View style={styles.gridContainer}>
          {Array.from({ length: selectedFormat.teams }).map((_, i) => (
            <View
              key={i}
              style={{ width: "48%", marginBottom: 15, alignItems: "center" }}
            >
              <Text style={styles.columnTitle}>{getLabelForSlot(i)}</Text>
              <FighterCard
                index={i}
                fighter={participants[i]?.[0]}
                onPress={() => openSelectionModal(i)}
                widthStyle={"100%"}
              />
            </View>
          ))}
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <View style={[styles.absoluteFill, { backgroundColor: "#000" }]} />
      <LinearGradient
        colors={[brandTheme || "#EF4444", "transparent"]}
        style={[styles.absoluteFill, { height: "40%", opacity: 0.3 }]}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? "EDIT SEGMENT" : "NEW SEGMENT"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* TABS */}
          <BlurView intensity={20} tint="dark" style={styles.tabContainer}>
            {["MATCH", "PROMO"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabBtn,
                  segmentTab === tab && {
                    backgroundColor: "rgba(255,255,255,0.2)",
                  },
                ]}
                onPress={() => handleTabChange(tab as any)}
              >
                <Text
                  style={[
                    styles.tabText,
                    segmentTab === tab && { color: "#FFF" },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </BlurView>

          {/* MATCH CONFIG */}
          {segmentTab === "MATCH" && (
            <>
              <Text style={styles.sectionTitle}>MATCH TYPE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                {MATCH_FORMATS.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.optionCard,
                      selectedFormat.id === f.id && {
                        borderColor: brandTheme,
                        backgroundColor: brandTheme + "20",
                      },
                    ]}
                    onPress={() => handleFormatChange(f)}
                  >
                    <MaterialCommunityIcons
                      name={f.icon as any}
                      size={24}
                      color={
                        selectedFormat.id === f.id ? brandTheme : "#64748B"
                      }
                    />
                    <Text
                      style={[
                        styles.optionText,
                        selectedFormat.id === f.id && { color: brandTheme },
                      ]}
                    >
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>PARTICIPANTS</Text>
              {renderParticipantsSection()}

              <Text style={styles.sectionTitle}>STIPULATION</Text>
              <TouchableOpacity
                style={styles.stipBtn}
                onPress={() => setStipulationModalVisible(true)}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={[
                      styles.iconBox,
                      selectedStipulation.cost > 0 && {
                        backgroundColor: "#EF444420",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={selectedStipulation.icon as any}
                      size={20}
                      color={selectedStipulation.cost > 0 ? "#EF4444" : "#FFF"}
                    />
                  </View>
                  <View>
                    <Text style={styles.stipLabel}>CURRENT RULES</Text>
                    <Text style={styles.stipValue}>
                      {selectedStipulation.name}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: selectedStipulation.cost > 0 ? "#EF4444" : "#10B981",
                    fontWeight: "bold",
                  }}
                >
                  {selectedStipulation.cost > 0
                    ? `-$${selectedStipulation.cost / 1000}k`
                    : "FREE"}
                </Text>
              </TouchableOpacity>

              {/* EXTRAS */}
              <BlurView intensity={10} tint="dark" style={styles.extrasBox}>
                <View style={styles.extraRow}>
                  <View>
                    <Text style={[styles.extraTitle, { color: "#F59E0B" }]}>
                      TITLE MATCH
                    </Text>
                    <TouchableOpacity
                      onPress={() => isTitleMatch && setTitleModalVisible(true)}
                    >
                      <Text style={styles.extraSub}>
                        {titleInvolved
                          ? titleInvolved.name
                          : isTitleMatch
                          ? "Select Title..."
                          : "No"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Switch
                    value={isTitleMatch}
                    onValueChange={(val) => {
                      setIsTitleMatch(val);
                      if (val && !titleInvolved) setTitleModalVisible(true);
                    }}
                    trackColor={{ true: "#F59E0B", false: "#333" }}
                  />
                </View>
                <View
                  style={[
                    styles.extraRow,
                    {
                      borderTopWidth: 1,
                      borderTopColor: "rgba(255,255,255,0.1)",
                    },
                  ]}
                >
                  <View>
                    <Text style={[styles.extraTitle, { color: "#EF4444" }]}>
                      INTERFERENCE
                    </Text>
                    <Text style={styles.extraSub}>
                      Add drama (-${INTERFERENCE_COST})
                    </Text>
                  </View>
                  <Switch
                    value={hasInterference}
                    onValueChange={setHasInterference}
                    trackColor={{ true: "#EF4444", false: "#333" }}
                  />
                </View>
              </BlurView>
            </>
          )}

          {/* PROMO UI */}
          {segmentTab === "PROMO" && (
            <>
              <Text style={styles.sectionTitle}>SEGMENT TYPE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                {PROMO_TYPES.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.optionCard,
                      selectedPromoType.id === p.id && {
                        borderColor: "#D946EF",
                        backgroundColor: "#D946EF20",
                      },
                    ]}
                    onPress={() => handlePromoTypeChange(p)}
                  >
                    <MaterialCommunityIcons
                      name={p.icon as any}
                      size={24}
                      color={
                        selectedPromoType.id === p.id ? "#D946EF" : "#64748B"
                      }
                    />
                    <Text
                      style={[
                        styles.optionText,
                        selectedPromoType.id === p.id && { color: "#D946EF" },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.sectionTitle}>TALENT</Text>
              <View style={styles.vsContainer}>
                <View style={styles.fighterColumn}>
                  <Text style={styles.columnTitle}>{getLabelForSlot(0)}</Text>
                  <FighterCard
                    index={0}
                    fighter={participants[0]?.[0]}
                    onPress={() => openSelectionModal(0)}
                    widthStyle={CARD_WIDTH_LARGE}
                  />
                </View>
                {selectedPromoType.isVs && (
                  <>
                    <View style={styles.vsBadge}>
                      <Text style={styles.vsText}>VS</Text>
                    </View>
                    <View style={styles.fighterColumn}>
                      <Text style={styles.columnTitle}>
                        {getLabelForSlot(1)}
                      </Text>
                      <FighterCard
                        index={1}
                        fighter={participants[1]?.[0]}
                        onPress={() => openSelectionModal(1)}
                        widthStyle={CARD_WIDTH_LARGE}
                      />
                    </View>
                  </>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.costLabel}>TOTAL COST</Text>
            <Text
              style={[
                styles.costValue,
                currentCost > 0 ? { color: "#EF4444" } : { color: "#10B981" },
              ]}
            >
              {currentCost > 0 ? `-$${currentCost.toLocaleString()}` : "FREE"}
            </Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.confirmBtn}>
            <LinearGradient
              colors={[brandTheme || "#3B82F6", "#1E293B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              <Text style={styles.confirmText}>CONFIRM</Text>
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* --- MODALS (Dark Glass) --- */}
      {/* SELECTION MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Talent</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: "#EF4444" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={roster}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.rosterItem}
                  onPress={() => handleSelectLuchador(item)}
                >
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.rosterAvatar}
                    />
                  ) : (
                    <View style={styles.rosterPlaceholder}>
                      <Text>{item.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.rosterName}>{item.name}</Text>
                    <Text style={styles.rosterSub}>
                      {item.mainClass} • {item.crowd}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </BlurView>
        </View>
      </Modal>

      {/* STIPULATION MODAL */}
      <Modal
        visible={stipulationModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Match Rules</Text>
              <TouchableOpacity
                onPress={() => setStipulationModalVisible(false)}
              >
                <Text style={{ color: "#EF4444" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={STIPULATIONS}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.rosterItem,
                    selectedStipulation.name === item.name && {
                      backgroundColor: "rgba(255,255,255,0.1)",
                    },
                  ]}
                  onPress={() => {
                    setSelectedStipulation(item);
                    setStipulationModalVisible(false);
                  }}
                >
                  <View
                    style={[
                      styles.iconBox,
                      item.cost > 0 && { backgroundColor: "#EF444420" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={20}
                      color={item.cost > 0 ? "#EF4444" : "#FFF"}
                    />
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.rosterName}>{item.name}</Text>
                    <Text
                      style={{
                        color: item.cost > 0 ? "#EF4444" : "#10B981",
                        fontSize: 12,
                      }}
                    >
                      {item.cost > 0 ? `-$${item.cost}` : "No Extra Cost"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </BlurView>
        </View>
      </Modal>

      {/* TITLE MODAL */}
      <Modal
        visible={titleModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Title</Text>
              <TouchableOpacity onPress={() => setTitleModalVisible(false)}>
                <Text style={{ color: "#EF4444" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={getAvailableTitles()}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <Text
                  style={{
                    color: "#64748B",
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  No eligible vacant titles found.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.rosterItem}
                  onPress={() => {
                    setTitleInvolved(item);
                    setIsTitleMatch(true);
                    setTitleModalVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 20 }}>🏆</Text>
                  <Text style={[styles.rosterName, { marginLeft: 10 }]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
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
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  tabContainer: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  tabText: { color: "#94A3B8", fontWeight: "bold", fontSize: 12 },

  sectionTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 1,
  },

  optionCard: {
    width: 90,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  optionText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 5,
    textAlign: "center",
  },

  vsContainer: { flexDirection: "row", justifyContent: "space-between" },
  fighterColumn: { flex: 1, alignItems: "center" },
  columnTitle: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  slotCard: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
  },
  slotBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  slotImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  slotPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  slotInitials: { color: "#FFF", fontSize: 24, fontWeight: "bold" },
  slotName: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  nameTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
  },
  emptySlotContent: { alignItems: "center" },
  addText: { color: "#64748B", fontSize: 12, fontWeight: "bold", marginTop: 5 },
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    padding: 5,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    borderRadius: 10,
  },

  vsBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
  },
  vsText: { color: "#FFF", fontWeight: "900", fontSize: 10 },

  stipBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  stipLabel: { color: "#94A3B8", fontSize: 10, fontWeight: "bold" },
  stipValue: { color: "#FFF", fontSize: 14, fontWeight: "bold" },

  extrasBox: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  extraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  extraTitle: { fontSize: 12, fontWeight: "bold" },
  extraSub: { color: "#94A3B8", fontSize: 11 },

  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  costLabel: { color: "#94A3B8", fontSize: 10, fontWeight: "bold" },
  costValue: { fontSize: 18, fontWeight: "900" },
  confirmBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  confirmGradient: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    alignItems: "center",
  },
  confirmText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },

  // MODALS
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)" },
  modalContent: {
    flex: 1,
    backgroundColor: "#111",
    marginTop: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  rosterItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  rosterAvatar: { width: 40, height: 40, borderRadius: 20 },
  rosterPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  rosterName: { color: "#FFF", fontSize: 14, fontWeight: "bold" },
  rosterSub: { color: "#94A3B8", fontSize: 12 },
});
