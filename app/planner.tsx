import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { ManagementHeader } from "../src/components/ManagementHeader";
import { useGame } from "../src/context/GameContext"; // <--- 1. IMPORTAR CONTEXTO
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

// AJUSTE DE MEDIDAS PARA EVITAR DESBORDAMIENTO
const CARD_WIDTH_LARGE = (width - 110) / 2;
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
  { name: "Sumisión", cost: 30000, icon: "lock" },
  { name: "Ambulancia", cost: 36000, icon: "ambulance" },
  { name: "Ataúd", cost: 90000, icon: "coffin" },
];

const PROMO_TYPES = [
  {
    id: "autopromocion",
    name: "Autopromoción",
    cost: 2500,
    icon: "microphone",
    isVs: false,
  },
  {
    id: "provocacion",
    name: "Provocación",
    cost: 3000,
    icon: "fire",
    isVs: true,
  },
  {
    id: "entrenamiento",
    name: "Entrenamiento",
    cost: 5000,
    icon: "dumbbell",
    isVs: false,
  },
  {
    id: "publicidad",
    name: "Publicidad",
    cost: 0,
    icon: "bullhorn",
    isVs: false,
  },
  {
    id: "benefica",
    name: "Obra Benéfica",
    cost: 15000,
    icon: "hand-heart",
    isVs: false,
  },
];

export default function PlannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { saveId } = useGame(); // <--- 2. USAR CONTEXTO

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

    // 3. PASAR SAVE_ID
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

  // --- 3. LÓGICA DE FILTRADO DE TÍTULOS ---
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
      Alert.alert(
        "Contrato Vencido",
        `El contrato de ${luchador.name} ha terminado.`
      );
      return;
    }
    for (let i = 0; i < 4; i++) {
      if (participants[i]?.find((p) => p.id === luchador.id)) {
        Alert.alert("Error", "Ya está seleccionado.");
        return;
      }
    }

    const currentTeam = participants[activeTeamIndex] || [];
    let limit = 100;

    if (segmentTab === "MATCH") {
      limit = selectedFormat.membersPerTeam;
    } else {
      limit = 1;
    }

    if (currentTeam.length >= limit) return;

    const newTeam = [...currentTeam, luchador];
    setParticipants({ ...participants, [activeTeamIndex]: newTeam });

    // Auto-selección de título
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
          Alert.alert(
            "Incompleto",
            `Faltan participantes en el espacio #${i + 1}`
          );
          return;
        }
      }

      if (isTitleMatch && !titleInvolved) {
        Alert.alert("Error", "Selecciona un título para la pelea.");
        return;
      }
    } else if (selectedPromoType.isVs) {
      if (
        (participants[0] || []).length === 0 ||
        (participants[1] || []).length === 0
      ) {
        Alert.alert("Incompleto", "Se necesita Protagonista y Objetivo");
        return;
      }
    } else {
      if ((participants[0] || []).length === 0) {
        Alert.alert("Vacío", "Selecciona al protagonista.");
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

    // 4. PASAR SAVE_ID A UPDATE/ADD
    if (editId) {
      success = updatePlannedMatch(
        editId, // Update ya sabe cual ID editar, pero... espera, updatePlannedMatch no necesita saveId porque el ID es unico en la tabla planned_matches.
        // Un momento... updatePlannedMatch en operations.ts no recibe saveId porque filtra por ID único del match.
        // REVISANDO operations.ts: updatePlannedMatch(id, matchType...)
        // CORRECTO. No hace falta saveId para update.
        typeName,
        participants,
        stipulationName,
        currentCost,
        isTitleMatch,
        titleInvolved ? titleInvolved.id : null
      );
    } else {
      success = addPlannedMatch(
        saveId, // <--- AQUÍ SÍ HACE FALTA
        typeName,
        participants,
        stipulationName,
        currentCost,
        isTitleMatch,
        titleInvolved ? titleInvolved.id : null
      );
    }

    if (success) router.back();
    else Alert.alert("Error", "No se pudo guardar.");
  };

  const getLabelForSlot = (teamIndex: number) => {
    if (segmentTab === "PROMO") {
      if (selectedPromoType.id === "provocacion") {
        return teamIndex === 0 ? "🎙️ PROVOCADOR" : "🎯 OBJETIVO";
      }
      return "PROTAGONISTA";
    }
    if (selectedFormat.id === "1v1")
      return teamIndex === 0 ? "Luchador 1" : "Luchador 2";
    if (selectedFormat.id === "2v2")
      return teamIndex === 0 ? "Equipo 1" : "Equipo 2";
    if (selectedFormat.id === "3way") return `Luchador ${teamIndex + 1}`;
    if (selectedFormat.id === "4way") return `Luchador ${teamIndex + 1}`;

    return `Esquina #${teamIndex + 1}`;
  };

  // --- COMPONENTE TARJETA DE LUCHADOR ---
  const FighterCard = ({ index, fighter, onPress, widthStyle }: any) => (
    <TouchableOpacity
      style={[styles.slotCard, widthStyle && { width: widthStyle }]}
      onPress={onPress}
    >
      {fighter ? (
        <>
          {fighter.imageUri ? (
            <Image
              source={{ uri: fighter.imageUri }}
              style={styles.slotImageLarge}
            />
          ) : (
            <View style={styles.slotPlaceholderLarge}>
              <Text style={styles.slotInitialsLarge}>
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
            <Ionicons name="close" size={14} color="white" />
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptySlotContent}>
          <Ionicons name="add" size={32} color="#CBD5E1" />
          <Text style={styles.addText}>Añadir</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // --- RENDERIZADO DINÁMICO ---
  const renderParticipantsSection = () => {
    // 1 vs 1 (Cartas Grandes, Flexibles)
    if (selectedFormat.id === "1v1") {
      return (
        <View style={styles.vsContainer}>
          <View style={styles.fighterWrapper}>
            <Text style={styles.columnTitle}>{getLabelForSlot(0)}</Text>
            <FighterCard
              index={0}
              fighter={participants[0]?.[0]}
              onPress={() => openSelectionModal(0)}
              widthStyle={CARD_WIDTH_LARGE}
            />
          </View>
          <View style={styles.vsBadgeLarge}>
            <Text style={styles.vsTextLarge}>VS</Text>
          </View>
          <View style={styles.fighterWrapper}>
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

    // Triple Threat
    if (selectedFormat.id === "3way") {
      return (
        <View style={styles.rowContainer}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: CARD_WIDTH_SMALL }}>
              <Text style={[styles.columnTitle, { textAlign: "center" }]}>
                {getLabelForSlot(i)}
              </Text>
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

    // Fatal 4-Way
    if (selectedFormat.id === "4way") {
      return (
        <View style={styles.gridContainer}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.gridItem}>
              <Text style={[styles.columnTitle, { textAlign: "center" }]}>
                {getLabelForSlot(i)}
              </Text>
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

    // Tag Team (2 Columnas)
    if (selectedFormat.id === "2v2") {
      return (
        <View style={styles.vsContainer}>
          <View style={styles.teamColumn}>
            <Text style={styles.columnTitle}>{getLabelForSlot(0)}</Text>
            <View style={{ gap: 10, alignItems: "center" }}>
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

          <View style={[styles.vsBadgeLarge, { marginTop: 40 }]}>
            <Text style={styles.vsTextLarge}>VS</Text>
          </View>

          <View style={styles.teamColumn}>
            <Text style={styles.columnTitle}>{getLabelForSlot(1)}</Text>
            <View style={{ gap: 10, alignItems: "center" }}>
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
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <ManagementHeader />

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>
          {isEditing ? "Editar Segmento" : "Planear Segmento"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TABS */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              segmentTab === "MATCH" && styles.toggleBtnActive,
            ]}
            onPress={() => handleTabChange("MATCH")}
          >
            <Text
              style={[
                styles.toggleText,
                segmentTab === "MATCH" && styles.toggleTextActive,
              ]}
            >
              Combate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              segmentTab === "PROMO" && { backgroundColor: "#F3E8FF" },
            ]}
            onPress={() => handleTabChange("PROMO")}
          >
            <View
              style={[
                StyleSheet.absoluteFill,
                segmentTab === "PROMO" && {
                  backgroundColor: "#9C27B0",
                  borderRadius: 20,
                },
              ]}
            />
            <Text
              style={[
                styles.toggleText,
                segmentTab === "PROMO" && styles.toggleTextActive,
              ]}
            >
              Promo
            </Text>
          </TouchableOpacity>
        </View>

        {/* PROMO UI */}
        {segmentTab === "PROMO" && (
          <>
            <Text style={styles.sectionHeader}>Tipo de Segmento</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {PROMO_TYPES.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.optionCard,
                    selectedPromoType.id === p.id && {
                      borderColor: "#9C27B0",
                      backgroundColor: "#F3E8FF",
                    },
                  ]}
                  onPress={() => handlePromoTypeChange(p)}
                >
                  <MaterialCommunityIcons
                    name={p.icon as any}
                    size={28}
                    color={
                      selectedPromoType.id === p.id ? "#9C27B0" : "#64748B"
                    }
                  />
                  <Text
                    style={[
                      styles.optionText,
                      selectedPromoType.id === p.id && {
                        color: "#9C27B0",
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {p.name}
                  </Text>
                  <Text style={styles.optionCost}>
                    {p.cost === 0 ? "Gratis" : `-$${p.cost}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionHeader}>Talentos</Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: selectedPromoType.isVs
                  ? "space-between"
                  : "center",
                alignItems: "center",
              }}
            >
              <View>
                <Text style={[styles.columnTitle, { textAlign: "center" }]}>
                  {getLabelForSlot(0)}
                </Text>
                <FighterCard
                  index={0}
                  fighter={participants[0]?.[0]}
                  onPress={() => openSelectionModal(0)}
                  widthStyle={CARD_WIDTH_LARGE}
                />
              </View>

              {selectedPromoType.isVs && (
                <>
                  <View style={styles.vsBadgeLarge}>
                    <Text style={styles.vsTextLarge}>VS</Text>
                  </View>
                  <View>
                    <Text style={[styles.columnTitle, { textAlign: "center" }]}>
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

        {/* MATCH UI */}
        {segmentTab === "MATCH" && (
          <>
            <Text style={styles.sectionHeader}>Formato de Lucha</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
            >
              {MATCH_FORMATS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.optionCard,
                    selectedFormat.id === f.id && {
                      borderColor: "#3B82F6",
                      backgroundColor: "#EFF6FF",
                    },
                  ]}
                  onPress={() => handleFormatChange(f)}
                >
                  <MaterialCommunityIcons
                    name={f.icon as any}
                    size={28}
                    color={selectedFormat.id === f.id ? "#3B82F6" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      selectedFormat.id === f.id && {
                        color: "#3B82F6",
                        fontWeight: "bold",
                      },
                    ]}
                  >
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionHeader}>Participantes</Text>
            {renderParticipantsSection()}

            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>
              Reglas y Estipulación
            </Text>
            <TouchableOpacity
              style={styles.stipulationSelector}
              onPress={() => setStipulationModalVisible(true)}
            >
              <View style={styles.stipulationLeft}>
                <View
                  style={[
                    styles.stipulationIconBg,
                    {
                      backgroundColor:
                        selectedStipulation.cost > 0 ? "#FEF2F2" : "#F0F9FF",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={selectedStipulation.icon as any}
                    size={24}
                    color={selectedStipulation.cost > 0 ? "#EF4444" : "#0EA5E9"}
                  />
                </View>
                <View>
                  <Text style={styles.stipulationLabel}>
                    Estipulación Actual
                  </Text>
                  <Text style={styles.stipulationValue}>
                    {selectedStipulation.name}
                  </Text>
                </View>
              </View>
              <View style={styles.stipulationRight}>
                <Text
                  style={[
                    styles.stipulationCost,
                    {
                      color:
                        selectedStipulation.cost > 0 ? "#EF4444" : "#10B981",
                    },
                  ]}
                >
                  {selectedStipulation.cost > 0
                    ? `-$${selectedStipulation.cost / 1000}k`
                    : "GRATIS"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#CBD5E1" />
              </View>
            </TouchableOpacity>

            <View style={styles.extrasContainer}>
              <View style={styles.extraRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.extraLabel, { color: "#B45309" }]}>
                    🏆 Pelea Titular
                  </Text>
                  {isTitleMatch && (
                    <TouchableOpacity
                      onPress={() => setTitleModalVisible(true)}
                    >
                      <Text
                        style={[
                          styles.extraSub,
                          {
                            color: "#3B82F6",
                            fontWeight: "bold",
                            marginTop: 2,
                          },
                        ]}
                      >
                        {titleInvolved
                          ? titleInvolved.name
                          : "Seleccionar Título Vacante..."}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {!isTitleMatch && <Text style={styles.extraSub}>No</Text>}
                </View>
                <Switch
                  value={isTitleMatch}
                  onValueChange={(val) => {
                    setIsTitleMatch(val);
                    if (val && !titleInvolved) {
                      setTitleModalVisible(true);
                    }
                  }}
                  trackColor={{ true: "#F59E0B", false: "#eee" }}
                />
              </View>

              <View style={styles.extraRow}>
                <View>
                  <Text style={styles.extraLabel}>⚡ Interferencia</Text>
                  <Text style={styles.extraSub}>
                    Aumenta el drama (+${INTERFERENCE_COST})
                  </Text>
                </View>
                <Switch
                  value={hasInterference}
                  onValueChange={setHasInterference}
                  trackColor={{ true: "#EF4444", false: "#eee" }}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.costContainer}>
          <Text style={styles.totalLabel}>COSTO TOTAL</Text>
          <Text
            style={[
              styles.totalValue,
              { color: currentCost > 0 ? "#EF4444" : "#10B981" },
            ]}
          >
            {currentCost > 0 ? `-$${currentCost.toLocaleString()}` : "GRATIS"}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtnWrapper}>
          <LinearGradient
            colors={
              segmentTab === "MATCH"
                ? ["#1E293B", "#334155"]
                : ["#7E22CE", "#A855F7"]
            }
            style={styles.saveGradient}
          >
            <Text style={styles.saveText}>
              {isEditing ? "Guardar" : "Confirmar"}
            </Text>
            <Ionicons name="checkmark" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* MODAL SELECCIÓN LUCHADORES */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Luchador</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={roster}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => {
              // @ts-ignore
              const isExpired = item.isDraft === 0 && item.weeksLeft <= 0;
              return (
                <TouchableOpacity
                  style={[styles.rosterItem, isExpired && { opacity: 0.5 }]}
                  onPress={() => handleSelectLuchador(item)}
                  disabled={isExpired}
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
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.rosterName}>{item.name}</Text>
                    <Text style={styles.rosterClass}>
                      {item.mainClass} • {item.gender}
                    </Text>
                  </View>
                  {isExpired && (
                    <Text style={styles.expiredBadge}>VENCIDO</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* MODAL SELECCIÓN TÍTULOS */}
      <Modal
        visible={titleModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Título Vacante</Text>
            <TouchableOpacity onPress={() => setTitleModalVisible(false)}>
              <Text style={styles.modalClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={getAvailableTitles()}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 20 }}
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text
                  style={{
                    textAlign: "center",
                    color: "#64748B",
                    marginBottom: 10,
                  }}
                >
                  No hay títulos vacantes disponibles para este formato.
                </Text>
                <Text
                  style={{
                    textAlign: "center",
                    color: "#94A3B8",
                    fontSize: 12,
                  }}
                >
                  (Si quieres defender un título con campeón, solo añade al
                  campeón a la lucha).
                </Text>
              </View>
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
                <View
                  style={[
                    styles.rosterPlaceholder,
                    { backgroundColor: "#FEF3C7" },
                  ]}
                >
                  <Text>🏆</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rosterName}>{item.name}</Text>
                  <Text style={styles.rosterClass}>VACANTE</Text>
                </View>
                {item.id === titleInvolved?.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* MODAL SELECCIÓN ESTIPULACIÓN */}
      <Modal
        visible={stipulationModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tipo de Combate</Text>
            <TouchableOpacity onPress={() => setStipulationModalVisible(false)}>
              <Text style={styles.modalClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={STIPULATIONS}
            keyExtractor={(item) => item.name}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.rosterItem,
                  selectedStipulation.name === item.name && {
                    backgroundColor: "#F0F9FF",
                    borderColor: "#BAE6FD",
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  setSelectedStipulation(item);
                  setStipulationModalVisible(false);
                }}
              >
                <View
                  style={[
                    styles.rosterPlaceholder,
                    { backgroundColor: item.cost > 0 ? "#FEF2F2" : "#F0F9FF" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={item.cost > 0 ? "#EF4444" : "#0EA5E9"}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rosterName}>{item.name}</Text>
                  <Text style={styles.rosterClass}>
                    {item.cost > 0
                      ? `Costo: $${item.cost}`
                      : "Sin Costo Adicional"}
                  </Text>
                </View>
                {selectedStipulation.name === item.name && (
                  <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

// ... ESTILOS ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  // Header Page
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
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

  scrollContent: { padding: 20, paddingBottom: 100 },

  // Tabs
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 25,
    padding: 4,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },
  toggleBtnActive: { backgroundColor: "#3B82F6" },
  toggleText: { fontWeight: "700", color: "#64748B" },
  toggleTextActive: { color: "white" },

  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  horizontalScroll: { marginBottom: 25, maxHeight: 100 },

  // Option Cards (Format/Promo)
  optionCard: {
    width: 100,
    height: 90,
    backgroundColor: "white",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  optionText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  optionCost: { fontSize: 10, color: "#94A3B8", marginTop: 2 },

  // Layout Styles
  vsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  gridItem: {
    width: "48%",
    marginBottom: 15,
    alignItems: "center",
  },
  fighterWrapper: { alignItems: "center", flex: 1 }, // Flex 1 es clave
  teamColumn: { alignItems: "center", flex: 1 },

  columnTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 8,
    textTransform: "uppercase",
  },

  // CARDS
  slotCard: {
    backgroundColor: "white",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    paddingVertical: 15,
  },
  slotImageLarge: { width: 70, height: 70, borderRadius: 35, marginBottom: 8 },
  slotPlaceholderLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  slotInitialsLarge: { fontSize: 28, fontWeight: "bold", color: "#94A3B8" },

  slotName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#334155",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  nameTag: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  emptySlotContent: { alignItems: "center", opacity: 0.5 },
  addText: { fontSize: 12, fontWeight: "600", color: "#64748B", marginTop: 4 },
  removeBtn: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 4,
  },

  vsBadgeLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  vsTextLarge: { fontSize: 14, fontWeight: "900", color: "#94A3B8" },
  vsBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  vsText: { fontSize: 10, fontWeight: "900", color: "#94A3B8" },

  // STIPULATION SELECTOR BUTTON
  stipulationSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  stipulationLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  stipulationIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  stipulationLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  stipulationValue: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  stipulationRight: { alignItems: "flex-end" },
  stipulationCost: { fontSize: 12, fontWeight: "700", marginBottom: 4 },

  // Extras (Toggle Rows)
  extrasContainer: { backgroundColor: "white", borderRadius: 16, padding: 5 },
  extraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  extraLabel: { fontSize: 14, fontWeight: "bold", color: "#1E293B" },
  extraSub: { fontSize: 11, color: "#64748B" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  costContainer: { flexDirection: "column" },
  totalLabel: { fontSize: 10, fontWeight: "bold", color: "#94A3B8" },
  totalValue: { fontSize: 20, fontWeight: "900" },
  saveBtnWrapper: { flex: 1, marginLeft: 20 },
  saveGradient: {
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  saveText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Modal
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
  modalClose: { color: "#3B82F6", fontWeight: "600" },
  rosterItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rosterAvatar: { width: 44, height: 44, borderRadius: 22 },
  rosterPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  rosterName: { fontSize: 14, fontWeight: "bold", color: "#1E293B" },
  rosterClass: { fontSize: 12, color: "#64748B" },
  expiredBadge: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#EF4444",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
