import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useRouter } from "expo-router";
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
  getMatchesByWeek,
  getWeeklySummaries,
} from "../../src/database/operations";

const { width } = Dimensions.get("window");

export default function HistoryScreen() {
  const router = useRouter();
  const { saveId, brandTheme } = useGame();

  const [history, setHistory] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [weekMatches, setWeekMatches] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Cargar lista de semanas
  useFocusEffect(
    useCallback(() => {
      if (saveId) {
        const data = getWeeklySummaries(saveId);
        setHistory(data);
      }
    }, [saveId])
  );

  // Abrir detalle de una semana
  const openWeekDetail = (weekData: any) => {
    if (saveId) {
      const matches = getMatchesByWeek(saveId, weekData.week);
      setSelectedWeek(weekData);
      setWeekMatches(matches);
      setModalVisible(true);
    }
  };

  // --- RENDERERS ---

  const renderHistoryCard = ({ item }: { item: any }) => {
    const profit = item.total_income - item.total_expenses;
    const isPositive = profit >= 0;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openWeekDetail(item)}
        style={{ marginBottom: 15 }}
      >
        <BlurView intensity={20} tint="dark" style={styles.card}>
          {/* Week Indicator */}
          <View style={styles.weekIndicator}>
            <Text style={styles.weekLabel}>WEEK</Text>
            <Text style={styles.weekNumber}>{item.week}</Text>
          </View>

          {/* Info Center */}
          <View style={styles.infoCenter}>
            <Text style={styles.label}>NET PROFIT</Text>
            <Text
              style={[
                styles.profitText,
                { color: isPositive ? "#10B981" : "#EF4444" },
              ]}
            >
              {isPositive ? "+" : "-"}${Math.abs(profit).toLocaleString()}
            </Text>
          </View>

          {/* Rating Right */}
          <View style={styles.ratingRight}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {(item.total_rating || 0).toFixed(1)}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="rgba(255,255,255,0.2)"
            style={{ marginLeft: 10 }}
          />
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderMatchItem = (match: any) => {
    const isTitle = match.isTitleChange === 1;

    return (
      <View
        style={[
          styles.matchItem,
          isTitle && { borderColor: "#F59E0B", borderWidth: 1 },
        ]}
      >
        <View style={styles.matchHeader}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: "rgba(255,255,255,0.1)" },
            ]}
          >
            <Text style={styles.matchType}>{match.matchType}</Text>
          </View>
          <View style={styles.matchRating}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.matchRatingText}>{match.rating}</Text>
          </View>
        </View>

        <View style={styles.matchResult}>
          <Text style={styles.winnerName}>
            <Text style={{ color: "#94A3B8", fontSize: 10 }}>WINNER: </Text>
            {match.winnerName}
          </Text>
          <Text style={styles.loserName}>def. {match.loserName}</Text>
        </View>

        {isTitle && (
          <View style={styles.titleChangeBadge}>
            <Ionicons name="trophy" size={12} color="#000" />
            <Text style={styles.titleChangeText}>TITLE CHANGE</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      {/* Background */}
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
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>THE ARCHIVE</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderHistoryCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="file-tray-outline"
                size={64}
                color="rgba(255,255,255,0.2)"
              />
              <Text style={styles.emptyText}>Archive Empty</Text>
              <Text style={styles.emptySub}>
                Complete your first week to see records here.
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* --- WEEK DETAIL MODAL (DARK GLASS) --- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {selectedWeek && (
            <>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    Week {selectedWeek.week} Report
                  </Text>
                  <Text style={styles.modalSub}>Event Summary</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Stats Grid */}
                <View style={styles.statsRow}>
                  <BlurView intensity={20} tint="dark" style={styles.statBox}>
                    <Text style={styles.statLabel}>AVG RATING</Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Ionicons name="star" size={18} color="#F59E0B" />
                      <Text style={styles.statValue}>
                        {(selectedWeek.total_rating || 0).toFixed(1)}
                      </Text>
                    </View>
                  </BlurView>

                  <BlurView intensity={20} tint="dark" style={styles.statBox}>
                    <Text style={styles.statLabel}>TOTAL EXPENSES</Text>
                    <Text style={[styles.statValue, { color: "#EF4444" }]}>
                      -${selectedWeek.total_expenses.toLocaleString()}
                    </Text>
                  </BlurView>
                </View>

                <View style={styles.statsRow}>
                  <BlurView
                    intensity={20}
                    tint="dark"
                    style={[styles.statBox, { flex: 2 }]}
                  >
                    <Text style={styles.statLabel}>TOTAL INCOME</Text>
                    <Text style={[styles.statValue, { color: "#10B981" }]}>
                      +${selectedWeek.total_income.toLocaleString()}
                    </Text>
                  </BlurView>
                </View>

                <Text style={styles.sectionTitle}>MATCH CARD</Text>
                {weekMatches.map((m, i) => (
                  <View key={i} style={{ marginBottom: 10 }}>
                    {renderMatchItem(m)}
                  </View>
                ))}
              </ScrollView>
            </>
          )}
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
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },

  listContent: { padding: 20, paddingBottom: 50 },

  // CARD
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  weekIndicator: {
    alignItems: "center",
    marginRight: 15,
    paddingRight: 15,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
  },
  weekLabel: { color: "#94A3B8", fontSize: 10, fontWeight: "bold" },
  weekNumber: { color: "#FFF", fontSize: 24, fontWeight: "900" },

  infoCenter: { flex: 1 },
  label: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  profitText: { fontSize: 16, fontWeight: "bold" },

  ratingRight: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 8,
    borderRadius: 12,
  },
  ratingText: { color: "#FFF", fontWeight: "bold", fontSize: 12, marginTop: 2 },

  // EMPTY STATE
  emptyState: { alignItems: "center", marginTop: 100 },
  emptyText: { fontSize: 18, fontWeight: "bold", color: "#FFF", marginTop: 15 },
  emptySub: { fontSize: 14, color: "#64748B" },

  // MODAL
  modalContainer: { flex: 1, backgroundColor: "#111" },
  modalHeader: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#FFF" },
  modalSub: { fontSize: 13, color: "#94A3B8" },
  closeBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statBox: {
    flex: 1,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 5,
  },
  statValue: { fontSize: 18, fontWeight: "900", color: "#FFF" },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 15,
    marginTop: 20,
    letterSpacing: 1,
  },

  // MATCH ITEM (DETAIL)
  matchItem: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  matchType: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFF",
    textTransform: "uppercase",
  },

  matchRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  matchRatingText: { fontSize: 12, fontWeight: "bold", color: "#F59E0B" },

  matchResult: { marginBottom: 5 },
  winnerName: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  loserName: { fontSize: 12, color: "#64748B" },

  titleChangeBadge: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F59E0B",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  titleChangeText: { fontSize: 10, fontWeight: "900", color: "#000" },
});
