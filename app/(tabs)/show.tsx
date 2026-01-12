import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
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
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist"; // <--- LIBRERÍA DRAG & DROP
import { SafeAreaView } from "react-native-safe-area-context";

import { useGame } from "../../src/context/GameContext";
import {
  deletePlannedMatch,
  finalizeWeekWithManualFinances,
  getAllTitles,
  getCurrentShowCost,
  getGameState,
  getPlannedMatchesForCurrentWeek,
  reorderMatches,
  resolveMatch,
} from "../../src/database/operations";
import { Luchador } from "../../src/types";

export default function ShowScreen() {
  const router = useRouter();
  const { saveId, brandTheme } = useGame();

  // --- DATA ---
  const [matches, setMatches] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  const [totalShowCost, setTotalShowCost] = useState(0);
  const [currentCash, setCurrentCash] = useState(0);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // --- MODALS & STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [rating, setRating] = useState(3);

  const [financeModalVisible, setFinanceModalVisible] = useState(false);
  const [costDetailsModalVisible, setCostDetailsModalVisible] = useState(false);

  const [incomeData, setIncomeData] = useState({
    network: "",
    tickets: "",
    ads: "",
    promos: "",
    others: "",
  });

  const loadData = useCallback(() => {
    if (!saveId) return;
    // IMPORTANTE: getPlannedMatchesForCurrentWeek YA DEBE VENIR ORDENADO POR sort_order
    const loadedMatches = getPlannedMatchesForCurrentWeek(saveId);
    setMatches(loadedMatches);
    setTotalShowCost(getCurrentShowCost(saveId));
    setTitles(getAllTitles(saveId));
    const state: any = getGameState(saveId);
    if (state) {
      setCurrentCash(state.currentCash);
      setCurrentWeek(state.currentWeek);
    }
  }, [saveId]);

  useFocusEffect(loadData);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadData]);

  // --- DRAG END HANDLER ---
  const onDragEnd = ({ data }: { data: any[] }) => {
    setMatches(data); // Actualizamos la UI inmediatamente
    if (saveId) {
      reorderMatches(saveId, data); // Guardamos el nuevo orden en DB
    }
  };

  const allMatchesCompleted =
    matches.length > 0 && matches.every((m) => !!m.isCompleted);

  // --- BUSINESS LOGIC ---
  const handleDelete = (id: number) => {
    Alert.alert("Delete Segment", "Remove this segment from the card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
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
    if (!winnerId) return Alert.alert("Error", "Please select a winner.");

    const result = resolveMatch(
      saveId,
      selectedMatch.id,
      winnerId,
      rating,
      selectedMatch
    );

    if (result.success) {
      setModalVisible(false);
      loadData();
      let msg = `${rating} Stars recorded.`;
      if (result.isTitleChange) msg += "\n\n🏆 NEW CHAMPION CROWNED!";
      setTimeout(() => {
        Alert.alert("Match Finalized", msg);
      }, 300);
    } else {
      Alert.alert("Error", "Could not save match result.");
    }
  };

  const handleFinishShow = () => {
    if (!allMatchesCompleted) {
      Alert.alert("Show Incomplete", "You still have pending matches.");
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
      "Close Week",
      `Total Revenue: $${total.toLocaleString()}\nProceed to next week?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Advance",
          onPress: () => {
            const success = finalizeWeekWithManualFinances(saveId, incomeData);
            if (success) {
              setFinanceModalVisible(false);
              loadData();
              Alert.alert(
                "Week Complete!",
                "Finances recorded. Calendar advanced."
              );
            } else {
              Alert.alert("Error", "Could not close the week.");
            }
          },
        },
      ]
    );
  };

  // --- HELPERS ---
  const getParticipantsList = () => {
    if (!selectedMatch) return [];
    const list: Luchador[] = [];
    try {
      const participants =
        typeof selectedMatch.participants === "string"
          ? JSON.parse(selectedMatch.participants)
          : selectedMatch.participants;
      if (participants) {
        Object.values(participants).forEach((team: any) => {
          if (Array.isArray(team)) list.push(...team);
        });
      }
    } catch (e) {}
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
          styles.participantBox,
          align === "right" && { alignItems: "flex-end" },
          align === "center" && { alignItems: "center" },
        ]}
      >
        <View style={styles.multiAvatarContainer}>
          {team.slice(0, 2).map((p, idx) => (
            <View
              key={p.id}
              style={[styles.miniAvatar, { marginLeft: idx > 0 ? -15 : 0 }]}
            >
              {p.imageUri ? (
                <Image
                  source={{ uri: p.imageUri }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View style={{ backgroundColor: "#333", flex: 1 }} />
              )}
            </View>
          ))}
        </View>
        <Text style={styles.participantName} numberOfLines={1}>
          {team.map((p) => p.name).join(" & ")}
        </Text>
      </View>
    );
  };

  const getTitleName = (titleId: number) => {
    const t = titles.find((t) => t.id === titleId);
    return t ? t.name : "Championship";
  };

  // --- RENDER ITEM (DRAGGABLE) ---
  const renderItem = ({
    item: match,
    drag,
    isActive,
  }: RenderItemParams<any>) => {
    const isCompleted = !!match.isCompleted;
    const isPromo = match.matchType.startsWith("Promo:");
    const isTitle = !!match.isTitleMatch;

    let teamA = [];
    let teamB = [];
    try {
      const pData =
        typeof match.participants === "string"
          ? JSON.parse(match.participants)
          : match.participants;
      teamA = pData?.["0"] || [];
      teamB = pData?.["1"] || [];
    } catch (e) {}

    let accentColor = isPromo ? "#D946EF" : isTitle ? "#F59E0B" : "#3B82F6";

    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive || isCompleted}
          activeOpacity={1}
          style={[
            styles.timelineItem,
            isActive && { opacity: 0.8, transform: [{ scale: 1.02 }] },
          ]}
        >
          {/* Timeline Left (With Grip) */}
          <View style={styles.timelineLeft}>
            {!isCompleted && (
              <View style={styles.gripContainer}>
                <MaterialCommunityIcons
                  name="drag-horizontal"
                  size={20}
                  color="#64748B"
                />
              </View>
            )}
            <View
              style={[
                styles.line,
                { backgroundColor: isActive ? accentColor : "#334155" },
              ]}
            />
          </View>

          {/* Card Content */}
          <BlurView
            intensity={20}
            tint="dark"
            style={[
              styles.matchCard,
              isCompleted && { borderColor: "rgba(255,255,255,0.05)" },
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: accentColor + "30" },
                  ]}
                >
                  <Text style={[styles.typeText, { color: accentColor }]}>
                    {isPromo ? "SEGMENT" : match.matchType.toUpperCase()}
                  </Text>
                </View>
                {isTitle && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="trophy" size={12} color="#F59E0B" />
                    <Text
                      style={{
                        color: "#F59E0B",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {getTitleName(match.titleId)}
                    </Text>
                  </View>
                )}
              </View>
              {isCompleted && (
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              )}
            </View>

            <View style={styles.facesRow}>
              {getTeamComponent(teamA, teamB.length > 0 ? "left" : "center")}
              {teamB.length > 0 && <Text style={styles.vsText}>VS</Text>}
              {teamB.length > 0 && getTeamComponent(teamB, "right")}
            </View>

            {isCompleted ? (
              <View style={styles.resultBox}>
                <View>
                  <Text style={styles.resultLabel}>WINNER</Text>
                  <Text style={styles.resultValue}>
                    {match.resultText
                      ? match.resultText.replace("Ganador: ", "").split(" (")[0]
                      : "N/A"}
                  </Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{match.rating || 0}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => handleEdit(match)}
                >
                  <Ionicons name="pencil" size={16} color="#94A3B8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.playBtn, { backgroundColor: accentColor }]}
                  onPress={() => openResultModal(match)}
                >
                  <Ionicons name="play" size={14} color="#FFF" />
                  <Text style={styles.playBtnText}>PLAY</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => handleDelete(match.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </BlurView>
        </TouchableOpacity>
      </ScaleDecorator>
    );
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

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>TONIGHT'S SHOW</Text>
            <Text style={styles.headerSub}>Week {currentWeek}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setCostDetailsModalVisible(true)}
            style={styles.costBadge}
          >
            <Text style={styles.costLabel}>COST</Text>
            <Text style={styles.costValue}>
              ${totalShowCost.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </View>

        {matches.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFF"
              />
            }
          >
            <View style={styles.emptyState}>
              <Ionicons
                name="calendar-outline"
                size={60}
                color="rgba(255,255,255,0.2)"
              />
              <Text style={styles.emptyText}>Empty Card</Text>
              <Text style={styles.emptySub}>
                Head to the Planner (+) to book matches.
              </Text>
            </View>
          </ScrollView>
        ) : (
          <DraggableFlatList
            data={matches}
            onDragEnd={onDragEnd}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFF"
              />
            }
          />
        )}

        {/* Footer Actions */}
        {matches.length > 0 && allMatchesCompleted ? (
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={handleFinishShow}
            >
              <LinearGradient
                colors={[brandTheme || "#10B981", "#065F46"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.finishGradient}
              >
                <Text style={styles.finishText}>FINISH SHOW</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push("/planner")}
          >
            <LinearGradient
              colors={[brandTheme || "#3B82F6", "#1E293B"]}
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={30} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* --- RESULT MODAL --- */}
      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <BlurView intensity={95} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Match Result</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>SELECT WINNER</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            >
              {getParticipantsList().map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.winnerCard,
                    winnerId === p.id && {
                      borderColor: brandTheme,
                      backgroundColor: brandTheme + "20",
                    },
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
                      <Text style={{ color: "#FFF" }}>{p.name.charAt(0)}</Text>
                    </View>
                  )}
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.winnerName,
                      winnerId === p.id && { color: brandTheme },
                    ]}
                  >
                    {p.name}
                  </Text>
                  {winnerId === p.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={brandTheme}
                      style={{ position: "absolute", top: 5, right: 5 }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>MATCH RATING</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={rating >= star ? "star" : "star-outline"}
                    size={32}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: brandTheme },
                !winnerId && { opacity: 0.5 },
              ]}
              disabled={!winnerId}
              onPress={handleFinalizeMatch}
            >
              <Text style={styles.confirmText}>CONFIRM RESULT</Text>
            </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- FINANCE MODAL (FULL) --- */}
      <Modal visible={financeModalVisible} animationType="slide">
        <View style={styles.fullScreenModal}>
          <View style={styles.fsHeader}>
            <Text style={styles.fsTitle}>Post-Show Finances</Text>
            <TouchableOpacity onPress={() => setFinanceModalVisible(false)}>
              <Text style={{ color: "#EF4444", fontWeight: "bold" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.fsSub}>Enter revenue generated.</Text>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>📡 Network / TV Rights</Text>
                <TextInput
                  style={styles.fsInput}
                  keyboardType="numeric"
                  placeholder="$0"
                  placeholderTextColor="#64748B"
                  value={incomeData.network}
                  onChangeText={(t) =>
                    setIncomeData({ ...incomeData, network: t })
                  }
                />
              </View>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>🎟️ Ticket Sales</Text>
                <TextInput
                  style={styles.fsInput}
                  keyboardType="numeric"
                  placeholder="$0"
                  placeholderTextColor="#64748B"
                  value={incomeData.tickets}
                  onChangeText={(t) =>
                    setIncomeData({ ...incomeData, tickets: t })
                  }
                />
              </View>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>📢 Advertising</Text>
                <TextInput
                  style={styles.fsInput}
                  keyboardType="numeric"
                  placeholder="$0"
                  placeholderTextColor="#64748B"
                  value={incomeData.ads}
                  onChangeText={(t) => setIncomeData({ ...incomeData, ads: t })}
                />
              </View>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>👕 Merchandise / Promos</Text>
                <TextInput
                  style={styles.fsInput}
                  keyboardType="numeric"
                  placeholder="$0"
                  placeholderTextColor="#64748B"
                  value={incomeData.promos}
                  onChangeText={(t) =>
                    setIncomeData({ ...incomeData, promos: t })
                  }
                />
              </View>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>📦 Other Revenue</Text>
                <TextInput
                  style={styles.fsInput}
                  keyboardType="numeric"
                  placeholder="$0"
                  placeholderTextColor="#64748B"
                  value={incomeData.others}
                  onChangeText={(t) =>
                    setIncomeData({ ...incomeData, others: t })
                  }
                />
              </View>
              <View style={styles.totalBox}>
                <Text style={{ color: "#94A3B8", fontWeight: "bold" }}>
                  TOTAL REVENUE
                </Text>
                <Text
                  style={{ color: "#10B981", fontSize: 24, fontWeight: "900" }}
                >
                  ${calculateTotalIncome().toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: "#10B981",
                    marginTop: 20,
                    marginBottom: 40,
                  },
                ]}
                onPress={submitWeekClose}
              >
                <Text style={styles.confirmText}>FINALIZE WEEK</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* --- COST DETAILS MODAL (NUEVO Y ARREGLADO) --- */}
      <Modal
        visible={costDetailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCostDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={95} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Production Costs</Text>
              <TouchableOpacity
                onPress={() => setCostDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {matches.map((m, idx) => {
                const isPromo = m.matchType.startsWith("Promo");
                // Costos simulados simples basados en tus datos
                // Stipulation cost suele venir en m.cost (en DB)
                if (m.cost > 0) {
                  return (
                    <View key={idx} style={styles.costItem}>
                      <View>
                        <Text style={styles.costMatchName}>
                          {isPromo ? "Segment" : m.matchType}
                        </Text>
                        <Text style={styles.costDetail}>{m.stipulation}</Text>
                      </View>
                      <Text style={styles.costAmount}>
                        -${m.cost.toLocaleString()}
                      </Text>
                    </View>
                  );
                }
                return null;
              })}
              {matches.filter((m) => m.cost > 0).length === 0 && (
                <Text
                  style={{
                    color: "#64748B",
                    textAlign: "center",
                    marginVertical: 20,
                  }}
                >
                  No extra production costs for this show.
                </Text>
              )}
            </ScrollView>

            <View style={styles.costTotalRow}>
              <Text style={styles.costTotalLabel}>TOTAL SHOW COST</Text>
              <Text style={styles.costTotalValue}>
                -${totalShowCost.toLocaleString()}
              </Text>
            </View>
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
    marginBottom: 10,
  },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  headerSub: { color: "#94A3B8", fontWeight: "600" },
  costBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  costLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "bold" },
  costValue: { fontSize: 14, color: "#EF4444", fontWeight: "bold" },

  scrollContent: { padding: 20, paddingBottom: 150 },

  // TIMELINE (UPDATED FOR DRAG)
  timelineItem: { flexDirection: "row", marginBottom: 5 },
  timelineLeft: { width: 30, alignItems: "center", justifyContent: "center" },
  gripContainer: { padding: 5 },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: "#334155",
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: -1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 20,
    marginBottom: 5,
  },

  matchCard: {
    flex: 1,
    marginBottom: 15,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: "900" },

  facesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  participantBox: { alignItems: "center", maxWidth: 100 },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  participantAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  avatarInitial: { color: "#FFF", fontWeight: "bold" },
  participantName: { color: "#E2E8F0", fontSize: 11, fontWeight: "700" },
  textUnknown: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    fontWeight: "bold",
    fontStyle: "italic",
    textAlign: "center",
  },
  multiAvatarContainer: { flexDirection: "row", marginBottom: 5 },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#000",
  },
  vsText: {
    color: "#64748B",
    fontWeight: "900",
    fontStyle: "italic",
    fontSize: 12,
  },

  // ACTIONS / RESULT
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 10,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  playBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },

  resultBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingTop: 10,
  },
  resultLabel: { color: "#64748B", fontSize: 10, fontWeight: "bold" },
  resultValue: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: { color: "#F59E0B", fontWeight: "bold" },

  // FOOTER
  footerContainer: {
    position: "absolute",
    bottom: 110,
    width: "100%",
    alignItems: "center",
    zIndex: 10,
  },
  finishBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  finishGradient: {
    flexDirection: "row",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    gap: 10,
    alignItems: "center",
  },
  finishText: { color: "#FFF", fontWeight: "900", fontSize: 16 },

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

  // EMPTY
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#FFF", fontWeight: "bold", fontSize: 18, marginTop: 10 },
  emptySub: { color: "#94A3B8" },

  // MODALS
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  inputLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 10,
  },
  winnerCard: {
    width: 80,
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  winnerImg: { width: 50, height: 50, borderRadius: 25, marginBottom: 5 },
  winnerPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  winnerName: { color: "#CBD5E1", fontSize: 10, fontWeight: "bold" },
  starsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },
  confirmBtn: { padding: 16, borderRadius: 16, alignItems: "center" },
  confirmText: { color: "#FFF", fontWeight: "bold" },

  // FULL SCREEN MODAL
  fullScreenModal: { flex: 1, backgroundColor: "#0F172A", paddingTop: 50 },
  fsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  fsTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  fsSub: { color: "#94A3B8", marginBottom: 20 },
  inputBox: { marginBottom: 15 },
  fsInput: {
    backgroundColor: "#1E293B",
    color: "#FFF",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    fontWeight: "bold",
  },
  totalBox: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#10B981",
  },

  // COST DETAILS MODAL STYLES
  costItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  costMatchName: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  costDetail: { color: "#94A3B8", fontSize: 11 },
  costAmount: { color: "#EF4444", fontWeight: "bold", fontSize: 13 },
  costTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  costTotalLabel: { color: "#94A3B8", fontWeight: "900" },
  costTotalValue: { color: "#EF4444", fontWeight: "900", fontSize: 20 },
});
