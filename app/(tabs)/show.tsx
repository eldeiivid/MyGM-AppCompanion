import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
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
  deletePlannedMatch,
  finalizeWeekWithManualFinances,
  getAllTitles,
  getCurrentShowCost,
  getGameState,
  getPlannedMatchesForCurrentWeek,
  resolveMatch,
} from "../../src/database/operations";
import { Luchador } from "../../src/types";

export default function ShowScreen() {
  const router = useRouter();
  const { saveId } = useGame(); // <--- 2. USAR CONTEXTO

  // --- DATOS ---
  const [matches, setMatches] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  const [totalShowCost, setTotalShowCost] = useState(0);
  const [currentCash, setCurrentCash] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // --- MODALES Y ESTADOS ---
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [rating, setRating] = useState(3);

  // Modal de Finanzas
  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [costDetailsModalVisible, setCostDetailsModalVisible] = useState(false);

  // ESTADO LIMPIO: Solo ingresos operativos del Show
  const [incomeData, setIncomeData] = useState({
    network: "",
    tickets: "",
    ads: "",
    promos: "",
    others: "",
  });

  const loadData = useCallback(() => {
    if (!saveId) return;

    // 3. PASAR SAVE_ID A LAS FUNCIONES DE LECTURA
    setMatches(getPlannedMatchesForCurrentWeek(saveId));
    setTotalShowCost(getCurrentShowCost(saveId));
    setTitles(getAllTitles(saveId));
    const state: any = getGameState(saveId);
    if (state) setCurrentCash(state.currentCash);
  }, [saveId]);

  useFocusEffect(loadData);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadData]);

  // Usamos !!m.isCompleted para que funcione con 1 o true.
  const allMatchesCompleted =
    matches.length > 0 && matches.every((m) => !!m.isCompleted);

  // --- LÓGICA DE NEGOCIO ---
  const handleDelete = (id: number) => {
    Alert.alert("Eliminar", "¿Borrar evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Borrar",
        style: "destructive",
        onPress: () => {
          deletePlannedMatch(id);
          loadData();
        },
      },
    ]);
  };

  const handleEdit = (match: any) => {
    if (match.isCompleted) return;
    router.push({
      pathname: "/planner",
      params: { editMode: "true", matchData: JSON.stringify(match) },
    });
  };

  const openResultModal = (match: any) => {
    setSelectedMatch(match);
    setWinnerId(null);
    setRating(3);
    setModalVisible(true);
  };

  const handleFinalizeMatch = () => {
    if (!saveId) return;
    if (!winnerId) return Alert.alert("Error", "Selecciona un ganador.");

    // 4. PASAR SAVE_ID A RESOLVE MATCH
    const result = resolveMatch(
      saveId,
      selectedMatch.id,
      winnerId,
      rating,
      selectedMatch
    );

    if (result.success) {
      setModalVisible(false);

      // RECARGAMOS DATOS INMEDIATAMENTE
      loadData();

      let msg = `${rating} Estrellas registradas.`;
      if (result.isTitleChange) msg += "\n\n🏆 ¡TENEMOS NUEVO CAMPEÓN!";
      else if (selectedMatch.isTitleMatch) msg += "\n\n🔰 ¡Defensa Exitosa!";

      setTimeout(() => {
        Alert.alert("Combate Finalizado", msg);
      }, 300);
    } else {
      Alert.alert(
        "Error",
        "No se pudo guardar el resultado. Revisa la consola."
      );
    }
  };

  const handleFinishShow = () => {
    if (!allMatchesCompleted) {
      Alert.alert("Show Incompleto", "Aún tienes combates sin simular.");
      return;
    }
    setIncomeData({
      network: "",
      tickets: "",
      ads: "",
      promos: "",
      others: "",
    });
    setFinanceModalVisible(true);
  };

  const calculateTotalIncome = () => {
    return Object.values(incomeData).reduce(
      (acc, val) => acc + (Number(val) || 0),
      0
    );
  };

  const submitWeekClose = () => {
    if (!saveId) return;

    const total = calculateTotalIncome();
    Alert.alert(
      "Cerrar Caja",
      `Ingresos del Show: $${total.toLocaleString()}\n¿Avanzar a la siguiente semana?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar y Avanzar",
          onPress: () => {
            // 5. PASAR SAVE_ID AL CIERRE DE SEMANA
            const success = finalizeWeekWithManualFinances(saveId, incomeData);
            if (success) {
              setFinanceModalVisible(false);
              loadData();
              Alert.alert(
                "¡Semana Completada!",
                "Tus finanzas y contratos han sido actualizados."
              );
            } else {
              Alert.alert("Error", "No se pudo cerrar la semana.");
            }
          },
        },
      ]
    );
  };

  // --- HELPERS VISUALES ---
  const getParticipantsList = () => {
    if (!selectedMatch) return [];
    const list: Luchador[] = [];
    if (selectedMatch.participants) {
      Object.values(selectedMatch.participants).forEach((team: any) =>
        list.push(...team)
      );
    }
    return list;
  };

  const getTeamComponent = (
    team: Luchador[],
    align: "left" | "right" | "center"
  ) => {
    if (!team || team.length === 0)
      return <Text style={styles.textUnknown}>???</Text>;
    if (team.length === 1) {
      const p = team[0];
      return (
        <View
          style={[
            styles.participantBox,
            align === "right" && { alignItems: "flex-end" },
            align === "center" && { alignItems: "center" },
          ]}
        >
          {p.imageUri ? (
            <Image
              source={{ uri: p.imageUri }}
              style={styles.participantAvatar}
            />
          ) : (
            <View style={styles.participantAvatarPlaceholder}>
              <Text style={styles.avatarInitial}>{p.name.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.participantName} numberOfLines={1}>
            {p.name}
          </Text>
        </View>
      );
    }
    return (
      <View
        style={[
          align === "right" && { alignItems: "flex-end" },
          align === "center" && { alignItems: "center" },
        ]}
      >
        <Text style={styles.participantNameSmall}>
          {team.map((p) => p.name).join(" & ")}
        </Text>
      </View>
    );
  };

  const getTitleName = (titleId: number) => {
    const t = titles.find((t) => t.id === titleId);
    return t ? t.name : "Campeonato";
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <ManagementHeader />

      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.headerTitle}>Cartelera</Text>
          <Text style={styles.headerSubtitle}>
            {matches.length} segmentos programados
          </Text>
        </View>

        <TouchableOpacity
          style={styles.costBadge}
          onPress={() => setCostDetailsModalVisible(true)}
        >
          <Text style={styles.costLabel}>COSTO SHOW</Text>
          <Text style={styles.costValue}>
            -${totalShowCost.toLocaleString()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#333"
          />
        }
      >
        {matches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>Cartelera Vacía</Text>
            <Text style={styles.emptySubText}>
              Ve al Planner (+) para armar tu show.
            </Text>
          </View>
        ) : (
          matches.map((match, index) => {
            const isCompleted = !!match.isCompleted;
            const isPromo = match.matchType.startsWith("Promo:");
            const isTitle = !!match.isTitleMatch;

            const teamA = match.participants ? match.participants["0"] : [];
            const teamB = match.participants ? match.participants["1"] : [];

            let accentColor = isPromo
              ? "#9C27B0"
              : isTitle
              ? "#FFB300"
              : "#3B82F6";

            return (
              <View
                key={index}
                style={[
                  styles.matchCard,
                  isCompleted && styles.matchCardCompleted,
                ]}
              >
                <View
                  style={[styles.colorStrip, { backgroundColor: accentColor }]}
                />
                <View style={styles.matchContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.matchTypeWrapper}>
                      <Text
                        style={[styles.matchTypeText, { color: accentColor }]}
                      >
                        {isPromo ? "SEGMENTO" : match.matchType.toUpperCase()}
                      </Text>
                      {isTitle && (
                        <Text style={styles.titleText}>
                          🏆 {getTitleName(match.titleId)}
                        </Text>
                      )}
                    </View>
                    {isCompleted && (
                      <View style={styles.completedTag}>
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#10B981"
                        />
                        <Text style={styles.completedTagText}>FINALIZADO</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.facesRow}>
                    {getTeamComponent(
                      teamA,
                      teamB && teamB.length > 0 ? "left" : "center"
                    )}
                    {teamB && teamB.length > 0 && (
                      <View style={styles.vsCircle}>
                        <Text style={styles.vsText}>VS</Text>
                      </View>
                    )}
                    {teamB &&
                      teamB.length > 0 &&
                      getTeamComponent(teamB, "right")}
                  </View>

                  {/* RESULTADO */}
                  {isCompleted ? (
                    <View style={styles.resultBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultLabel}>GANADOR:</Text>
                        <Text style={styles.resultWinner}>
                          {match.resultText
                            ? match.resultText.includes("Ganador: ")
                              ? match.resultText
                                  .replace("Ganador: ", "")
                                  .split(" (")[0]
                              : match.resultText
                            : "N/A"}
                        </Text>
                      </View>
                      <View style={styles.starsBadge}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.starsText}>
                          {match.rating || 0}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.iconAction}
                        onPress={() => handleEdit(match)}
                      >
                        <Ionicons name="pencil" size={18} color="#64748B" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.playAction,
                          { backgroundColor: accentColor },
                        ]}
                        onPress={() => openResultModal(match)}
                      >
                        <Ionicons name="play" size={16} color="white" />
                        <Text style={styles.playText}>SIMULAR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconAction}
                        onPress={() => handleDelete(match.id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB / FOOTER */}
      {matches.length > 0 && allMatchesCompleted ? (
        <View style={styles.floatingFooter}>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinishShow}>
            <LinearGradient
              colors={["#1E293B", "#334155"]}
              style={styles.finishGradient}
            >
              <Text style={styles.finishText}>CERRAR SEMANA</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/planner")}
        >
          <LinearGradient
            colors={["#3B82F6", "#2563EB"]}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={32} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* --- MODALES (RESULTADOS, FINANZAS, COSTOS) --- */}

      {/* 1. RESULTADOS */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Resultados</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionLabel}>GANADOR</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.winnerScroll}
            >
              {getParticipantsList().map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.winnerCard,
                    winnerId === p.id && styles.winnerCardActive,
                  ]}
                  onPress={() => setWinnerId(p.id)}
                >
                  {p.imageUri ? (
                    <Image
                      source={{ uri: p.imageUri }}
                      style={styles.winnerImg}
                    />
                  ) : (
                    <View style={styles.winnerPlaceholder}>
                      <Text style={{ fontWeight: "bold", color: "#94A3B8" }}>
                        {p.name.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.winnerName,
                      winnerId === p.id && {
                        color: "#3B82F6",
                        fontWeight: "bold",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  {winnerId === p.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#3B82F6"
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.sectionLabel}>CALIFICACIÓN</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={rating >= star ? "star" : "star-outline"}
                    size={36}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.confirmBtn, !winnerId && { opacity: 0.5 }]}
              disabled={!winnerId}
              onPress={handleFinalizeMatch}
            >
              <Text style={styles.confirmText}>CONFIRMAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. FINANZAS (CIERRE) - VERSIÓN LIMPIA */}
      <Modal
        visible={financeModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.fullScreenModal}>
            <View style={styles.fsHeader}>
              <Text style={styles.fsTitle}>Cierre de Caja</Text>
              <TouchableOpacity onPress={() => setFinanceModalVisible(false)}>
                <Text
                  style={{ color: "#3B82F6", fontSize: 16, fontWeight: "600" }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20 }}
            >
              <Text style={styles.fsSubtitle}>
                Ingresa los resultados económicos del show.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>📡 Network / TV Rights</Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  placeholder="$0"
                  value={incomeData.network}
                  onChangeText={(t) =>
                    setIncomeData({ ...incomeData, network: t })
                  }
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  🎟️ Entradas (Ticket Sales)
                </Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  placeholder="$0"
                  value={incomeData.tickets}
                  onChangeText={(t) =>
                    setIncomeData({ ...incomeData, tickets: t })
                  }
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>📢 Publicidad (Ads)</Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  placeholder="$0"
                  value={incomeData.ads}
                  onChangeText={(t) => setIncomeData({ ...incomeData, ads: t })}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  👕 Merchandising (In-Venue)
                </Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  placeholder="$0"
                  value={incomeData.promos}
                  onChangeText={(t) =>
                    setIncomeData({ ...incomeData, promos: t })
                  }
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>💎 Otros Ingresos</Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  placeholder="$0"
                  value={incomeData.others}
                  onChangeText={(t) =>
                    setIncomeData({ ...incomeData, others: t })
                  }
                />
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>TOTAL RECAUDADO</Text>
                <Text style={styles.summaryValue}>
                  ${calculateTotalIncome().toLocaleString()}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.fsFooter}>
              <TouchableOpacity
                style={styles.fsConfirmBtn}
                onPress={submitWeekClose}
              >
                <Text style={styles.fsConfirmText}>
                  FINALIZAR Y AVANZAR SEMANA
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. DETALLES DE COSTO */}
      <Modal
        visible={costDetailsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCostDetailsModalVisible(false)}
      >
        <View style={styles.costModalOverlay}>
          <View style={styles.costModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Desglose de Gastos</Text>
              <TouchableOpacity
                onPress={() => setCostDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {matches.length === 0 ? (
                <Text
                  style={{
                    textAlign: "center",
                    color: "#94A3B8",
                    marginTop: 20,
                  }}
                >
                  No hay gastos registrados.
                </Text>
              ) : (
                matches.map((m, i) => (
                  <View key={i} style={styles.costItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.costItemTitle}>{m.matchType}</Text>
                      <Text style={styles.costItemSub}>{m.stipulation}</Text>
                    </View>
                    <Text style={styles.costItemValue}>
                      -${m.cost.toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.costTotalRow}>
              <Text style={styles.costTotalLabel}>TOTAL SHOW</Text>
              <Text style={styles.costTotalValue}>
                -${totalShowCost.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... LOS ESTILOS SE MANTIENEN IGUAL ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },

  // HEADER
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#F5F7FA",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  headerSubtitle: { fontSize: 13, color: "#64748B", fontWeight: "600" },

  costBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  costLabel: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 2,
  },
  costValue: { fontSize: 13, color: "#EF4444", fontWeight: "bold" },

  scrollContent: { padding: 20, paddingBottom: 100 },

  emptyState: { alignItems: "center", marginTop: 80 },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 15,
  },
  emptySubText: { fontSize: 14, color: "#94A3B8", marginTop: 5 },

  // MATCH CARD
  matchCard: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  matchCardCompleted: { opacity: 0.7 },
  colorStrip: { width: 5, height: "100%" },
  matchContent: { flex: 1, padding: 14 },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  matchTypeWrapper: { flexDirection: "column" },
  matchTypeText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  titleText: {
    fontSize: 10,
    color: "#B45309",
    fontWeight: "700",
    marginTop: 2,
  },
  completedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  completedTagText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#10B981",
    marginLeft: 4,
  },

  facesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  participantBox: { width: 75 },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },
  participantAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  avatarInitial: { fontSize: 18, fontWeight: "bold", color: "#94A3B8" },
  participantName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },
  participantNameSmall: { fontSize: 11, fontWeight: "700", color: "#334155" },
  textUnknown: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "bold",
    fontStyle: "italic",
  },

  vsCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  vsText: { fontSize: 9, fontWeight: "900", color: "#94A3B8" },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    paddingTop: 10,
  },
  playAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  playText: { color: "white", fontWeight: "bold", fontSize: 11, marginLeft: 4 },
  iconAction: { padding: 7, backgroundColor: "#F1F5F9", borderRadius: 20 },

  resultBox: {
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "bold",
    marginRight: 5,
  },
  resultWinner: { fontSize: 11, color: "#1E293B", fontWeight: "bold" },

  starsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  starsText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#B45309",
    marginLeft: 4,
  },

  // FOOTER & FAB
  floatingFooter: {
    position: "absolute",
    bottom: 140,
    alignSelf: "center",
    zIndex: 50,
  },
  finishBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  finishGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
  },
  finishText: { color: "white", fontWeight: "bold", fontSize: 14 },

  fab: { position: "absolute", right: 20, bottom: 110, zIndex: 50 },
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
  },

  // MODAL RESULTADOS
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 10,
    marginTop: 10,
  },
  winnerScroll: { gap: 10, paddingBottom: 10 },
  winnerCard: {
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#F1F5F9",
    width: 75,
  },
  winnerCardActive: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  winnerImg: { width: 44, height: 44, borderRadius: 22, marginBottom: 5 },
  winnerPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  winnerName: { fontSize: 10, color: "#64748B", textAlign: "center" },
  checkIcon: { position: "absolute", top: 5, right: 5 },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  confirmBtn: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmText: { color: "white", fontWeight: "bold", fontSize: 14 },

  // MODAL FINANZAS
  fullScreenModal: { flex: 1, backgroundColor: "#F5F7FA", paddingTop: 50 },
  fsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "white",
  },
  fsTitle: { fontSize: 18, fontWeight: "800" },
  fsSubtitle: { fontSize: 13, color: "#64748B", marginBottom: 20 },
  inputContainer: {
    marginBottom: 15,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 5,
  },
  inputField: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  summaryBox: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  summaryLabel: { color: "#94A3B8", fontWeight: "bold", fontSize: 13 },
  summaryValue: { color: "#10B981", fontWeight: "900", fontSize: 20 },
  fsFooter: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  fsConfirmBtn: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  fsConfirmText: { color: "white", fontWeight: "bold", fontSize: 14 },

  // MODAL COSTOS
  costModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  costModalContent: { backgroundColor: "white", borderRadius: 20, padding: 20 },
  costItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  costItemTitle: { fontWeight: "bold", color: "#334155" },
  costItemSub: { fontSize: 12, color: "#94A3B8" },
  costItemValue: { fontWeight: "bold", color: "#EF4444" },
  costTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  costTotalLabel: { fontSize: 12, fontWeight: "bold", color: "#94A3B8" },
  costTotalValue: { fontSize: 20, fontWeight: "900", color: "#EF4444" },
});
