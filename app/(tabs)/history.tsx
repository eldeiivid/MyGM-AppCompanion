import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
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
import { ManagementHeader } from "../../src/components/ManagementHeader";
import { useGame } from "../../src/context/GameContext"; // <--- 1. IMPORTAR CONTEXTO
import {
  getMatchesByWeek,
  getWeeklySummaries,
} from "../../src/database/operations";

const { width } = Dimensions.get("window");

export default function HistoryScreen() {
  const { saveId } = useGame(); // <--- 2. USAR CONTEXTO

  const [history, setHistory] = useState<any[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [weekMatches, setWeekMatches] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Cargar lista de semanas
  useFocusEffect(
    useCallback(() => {
      if (saveId) {
        // 3. PASAR SAVE_ID
        const data = getWeeklySummaries(saveId);
        setHistory(data);
      }
    }, [saveId])
  );

  // Abrir detalle de una semana
  const openWeekDetail = (weekData: any) => {
    if (saveId) {
      // 4. PASAR SAVE_ID
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
        style={styles.card}
        onPress={() => openWeekDetail(item)}
        activeOpacity={0.8}
      >
        {/* Cabecera de la Tarjeta */}
        <View style={styles.cardHeader}>
          <View style={styles.weekBadge}>
            <Text style={styles.weekText}>SEMANA {item.week}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {(item.total_rating || 0).toFixed(1)}
            </Text>
          </View>
        </View>

        {/* Info Financiera */}
        <View style={styles.cardBody}>
          <View>
            <Text style={styles.label}>INGRESOS</Text>
            <Text style={styles.incomeText}>
              +${item.total_income.toLocaleString()}
            </Text>
          </View>
          <View style={styles.dividerVertical} />
          <View>
            <Text style={styles.label}>BALANCE</Text>
            <Text
              style={[
                styles.profitText,
                { color: isPositive ? "#10B981" : "#EF4444" },
              ]}
            >
              {isPositive ? "+" : "-"}${Math.abs(profit).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Footer Tarjeta */}
        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>Toca para ver resultados</Text>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderMatchItem = (match: any) => {
    const isTitle = match.isTitleChange === 1;

    return (
      <View style={styles.matchItem}>
        <View style={styles.matchHeader}>
          <Text style={styles.matchType}>{match.matchType}</Text>
          <View style={styles.matchRating}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={styles.matchRatingText}>{match.rating}</Text>
          </View>
        </View>

        <View style={styles.matchResult}>
          <Text style={styles.winnerName}>🏅 {match.winnerName}</Text>
          <Text style={styles.loserName}>def. {match.loserName}</Text>
        </View>

        {isTitle && (
          <View style={styles.titleChangeBadge}>
            <Text style={styles.titleChangeText}>🏆 ¡NUEVO CAMPEÓN!</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      <ManagementHeader />

      <Text style={styles.pageTitle}>Historial de Eventos</Text>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderHistoryCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>Sin historial aún</Text>
            <Text style={styles.emptySub}>
              Completa tu primera semana para verla aquí.
            </Text>
          </View>
        }
      />

      {/* --- MODAL DETALLE DE SEMANA --- */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          {selectedWeek && (
            <>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    Resultados Semana {selectedWeek.week}
                  </Text>
                  <Text style={styles.modalSub}>Resumen del evento</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={24} color="#1E293B" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Stats Rápidos */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>RATING</Text>
                    <Text style={styles.statValue}>
                      {(selectedWeek.total_rating || 0).toFixed(1)} ⭐
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>GASTOS</Text>
                    <Text style={[styles.statValue, { color: "#EF4444" }]}>
                      -${selectedWeek.total_expenses.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>CARTELERA</Text>
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
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  listContent: { padding: 20, paddingBottom: 100 },

  // CARD
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  weekBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  weekText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#B45309",
    marginLeft: 4,
  },

  cardBody: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dividerVertical: {
    width: 1,
    height: 30,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 20,
  },
  label: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "bold",
    marginBottom: 2,
  },
  incomeText: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  profitText: { fontSize: 16, fontWeight: "700" },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 11, color: "#94A3B8", fontStyle: "italic" },

  // EMPTY STATE
  emptyState: { alignItems: "center", marginTop: 100, opacity: 0.6 },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginTop: 15,
  },
  emptySub: { fontSize: 14, color: "#64748B" },

  // MODAL
  modalContainer: { flex: 1, backgroundColor: "#F5F7FA" },
  modalHeader: {
    padding: 20,
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  modalSub: { fontSize: 13, color: "#64748B" },
  closeBtn: { padding: 5, backgroundColor: "#F1F5F9", borderRadius: 20 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 25 },
  statBox: {
    flex: 1,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 5,
  },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1E293B" },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 10,
    letterSpacing: 1,
  },

  // MATCH ITEM (DETALLE)
  matchItem: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  matchType: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748B",
    textTransform: "uppercase",
  },
  matchRating: { flexDirection: "row", alignItems: "center" },
  matchRatingText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#F59E0B",
    marginLeft: 2,
  },
  matchResult: { marginBottom: 5 },
  winnerName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  loserName: { fontSize: 12, color: "#64748B" },
  titleChangeBadge: {
    marginTop: 8,
    backgroundColor: "#FEF3C7",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  titleChangeText: { fontSize: 10, fontWeight: "bold", color: "#B45309" },
});
