import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { db } from "../../src/database/db";
import {
  addManualTransaction,
  getCurrentWeekFinances,
  getGameState,
  getTransactionHistory,
} from "../../src/database/operations";

const { width } = Dimensions.get("window");

// --- CATEGORÍAS ---
const EXPENSE_CATEGORIES = [
  { id: "Arena", label: "Mejora de Arena", icon: "stadium" },
  { id: "VFX", label: "Efectos / Pyro", icon: "fire" },
  { id: "Staff", label: "Personal / Crew", icon: "account-hard-hat" },
  { id: "Ads", label: "Publicidad", icon: "bullhorn" },
  { id: "PowerCard", label: "Carta de Poder", icon: "cards-playing" },
  { id: "Signing", label: "Fichaje / Renov.", icon: "pen" },
  { id: "Logistics", label: "Logística", icon: "truck" },
  { id: "Other", label: "Otros", icon: "dots-horizontal" },
];

const INCOME_CATEGORIES = [
  { id: "Bonus", label: "Bono Especial", icon: "star-circle" },
  { id: "Sponsorship", label: "Patrocinio", icon: "handshake" },
  { id: "RosterSale", label: "Venta Roster", icon: "account-cash" },
  { id: "Merch", label: "Merchandising", icon: "tshirt-crew" },
  { id: "Network", label: "Network / TV", icon: "television-classic" },
  { id: "Other", label: "Otros", icon: "dots-horizontal" },
];

export default function FinancesScreen() {
  const { saveId, brandTheme } = useGame(); // <--- 2. USAR CONTEXTO

  const [cash, setCash] = useState(0);
  const [weekSummary, setWeekSummary] = useState({
    income: 0,
    expense: 0,
    net: 0,
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Modal Agregar Transacción
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<"IN" | "OUT">("OUT");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Modal Detalle de Semana (Drill Down)
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedWeekData, setSelectedWeekData] = useState<any[]>([]);
  const [selectedWeekNum, setSelectedWeekNum] = useState(0);

  const loadData = () => {
    if (!saveId) return;

    // 3. PASAR SAVE_ID A LAS OPERACIONES
    const state: any = getGameState(saveId);
    if (state) setCash(state.currentCash);

    const summary = getCurrentWeekFinances(saveId);
    setWeekSummary(summary);

    const history = getTransactionHistory(saveId);
    setTransactions(history);

    loadChartData(state?.currentWeek || 1);
  };

  const loadChartData = (currentWeek: number) => {
    if (!saveId) return;
    try {
      const data = [];
      for (let i = 4; i >= 0; i--) {
        const week = currentWeek - i;
        if (week < 1) continue;

        // FILTRAR POR SAVE_ID EN LA GRÁFICA TAMBIÉN
        const rows: any[] = db.getAllSync(
          `SELECT type, amount FROM finances WHERE save_id = ? AND week = ?`,
          [saveId, week]
        );
        let income = 0;
        let expense = 0;

        rows.forEach((r) => {
          if (r.type === "IN" || r.type === "INCOME") income += r.amount;
          else expense += r.amount;
        });

        data.push({ week, income, expense });
      }
      setChartData(data);
    } catch (e) {
      console.error("Error chart data", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [saveId])
  );

  // --- LÓGICA AGREGAR ---
  const openAddModal = (type: "IN" | "OUT") => {
    setTransactionType(type);
    setAmount("");
    setDescription("");
    setSelectedCategory("");
    setAddModalVisible(true);
  };

  const handleSave = () => {
    if (!saveId) return;
    if (!amount || !selectedCategory) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return;

    const finalDesc = description || selectedCategory;

    // 4. PASAR SAVE_ID
    addManualTransaction(
      saveId,
      selectedCategory,
      finalDesc,
      value,
      transactionType
    );

    setAddModalVisible(false);
    loadData();
  };

  // --- LÓGICA DETALLE SEMANA ---
  const openWeekDetail = (week: number) => {
    if (!saveId) return;
    try {
      const rows = db.getAllSync(
        `SELECT * FROM finances WHERE save_id = ? AND week = ? ORDER BY id DESC`,
        [saveId, week]
      );
      setSelectedWeekData(rows);
      setSelectedWeekNum(week);
      setDetailModalVisible(true);
    } catch (e) {
      console.error(e);
    }
  };

  // --- RENDERERS ---
  const renderTransaction = ({ item }: { item: any }) => {
    const isIncome = item.type === "IN" || item.type === "INCOME";
    const absAmount = Math.abs(item.amount);

    return (
      <View style={styles.transItem}>
        <View
          style={[
            styles.transIcon,
            { backgroundColor: isIncome ? "#ECFDF5" : "#FEF2F2" },
          ]}
        >
          <MaterialCommunityIcons
            name={isIncome ? "arrow-bottom-left" : "arrow-top-right"}
            size={20}
            color={isIncome ? "#10B981" : "#EF4444"}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.transDesc}>{item.description}</Text>
          <Text style={styles.transCat}>
            {item.category} • Sem {item.week}
          </Text>
        </View>
        <Text
          style={[
            styles.transAmount,
            { color: isIncome ? "#10B981" : "#1E293B" },
          ]}
        >
          {isIncome ? "+" : "-"}${absAmount.toLocaleString()}
        </Text>
      </View>
    );
  };

  const renderChart = () => {
    if (chartData.length === 0) return null;
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.income, d.expense)),
      1000
    );

    return (
      <View style={styles.chartContainer}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 15,
          }}
        >
          <Text style={styles.sectionTitle}>RENDIMIENTO (TOCA PARA VER)</Text>
        </View>
        <View style={styles.chartRow}>
          {chartData.map((d, index) => (
            <TouchableOpacity
              key={index}
              style={styles.chartBarGroup}
              onPress={() => openWeekDetail(d.week)}
              activeOpacity={0.7}
            >
              <View style={styles.barsWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max((d.income / maxVal) * 100, 4),
                      backgroundColor: "#10B981",
                      opacity: 0.8,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max((d.expense / maxVal) * 100, 4),
                      backgroundColor: "#EF4444",
                      marginLeft: 4,
                    },
                  ]}
                />
              </View>
              <View style={styles.weekBadge}>
                <Text style={styles.weekLabel}>S{d.week}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />
      <ManagementHeader />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TARJETA */}
        <LinearGradient
          colors={["#1E293B", "#334155"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.creditCard,
            { borderColor: brandTheme, borderWidth: 1 },
          ]}
        >
          <View style={styles.cardTop}>
            <MaterialCommunityIcons name="chip" size={32} color="#CBD5E1" />
            <Text style={styles.cardBrand}>BANK</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>Saldo Disponible</Text>
            <Text style={styles.cardBalance}>${cash.toLocaleString()}</Text>
          </View>
        </LinearGradient>

        {/* ACCIONES */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
            ]}
            onPress={() => openAddModal("IN")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#10B981" }]}>
              <Ionicons name="add" size={20} color="white" />
            </View>
            <Text style={[styles.actionText, { color: "#065F46" }]}>
              Ingreso
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
            ]}
            onPress={() => openAddModal("OUT")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#EF4444" }]}>
              <Ionicons name="remove" size={20} color="white" />
            </View>
            <Text style={[styles.actionText, { color: "#991B1B" }]}>Gasto</Text>
          </TouchableOpacity>
        </View>

        {/* GRÁFICA */}
        {renderChart()}

        {/* HISTORIAL GENERAL */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          ÚLTIMOS MOVIMIENTOS
        </Text>
        <View style={styles.historyList}>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ color: "#94A3B8" }}>
                No hay movimientos registrados.
              </Text>
            </View>
          ) : (
            transactions.map((t, index) => (
              <View key={index}>
                {renderTransaction({ item: t })}
                {index < transactions.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* --- MODAL 1: AGREGAR TRANSACCIÓN --- */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {transactionType === "IN"
                  ? "Registrar Ingreso"
                  : "Registrar Gasto"}
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalClose}>Cancelar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.inputLabel}>MONTO ($)</Text>
              <TextInput
                style={styles.moneyInput}
                placeholder="0"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />

              <Text style={styles.inputLabel}>CATEGORÍA</Text>
              <View style={styles.categoryGrid}>
                {(transactionType === "IN"
                  ? INCOME_CATEGORIES
                  : EXPENSE_CATEGORIES
                ).map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat.id && styles.categoryChipActive,
                      selectedCategory === cat.id && {
                        backgroundColor:
                          transactionType === "IN" ? "#ECFDF5" : "#FEF2F2",
                        borderColor:
                          transactionType === "IN" ? "#10B981" : "#EF4444",
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={20}
                      color={
                        selectedCategory === cat.id
                          ? transactionType === "IN"
                            ? "#10B981"
                            : "#EF4444"
                          : "#64748B"
                      }
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === cat.id && {
                          color:
                            transactionType === "IN" ? "#10B981" : "#EF4444",
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>DESCRIPCIÓN (OPCIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Bono por combate 5 estrellas..."
                value={description}
                onChangeText={setDescription}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      transactionType === "IN" ? "#10B981" : "#1E293B",
                  },
                ]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>CONFIRMAR TRANSACCIÓN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- MODAL 2: DETALLE DE SEMANA (DRILL DOWN) --- */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Semana {selectedWeekNum}</Text>
              <Text style={{ fontSize: 12, color: "#64748B" }}>
                Desglose de movimientos
              </Text>
            </View>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Text style={styles.modalClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={selectedWeekData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTransaction}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="documents-outline" size={48} color="#CBD5E1" />
                <Text style={{ color: "#94A3B8", marginTop: 10 }}>
                  Sin registros esta semana.
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.divider} />}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  scrollContent: { padding: 20, paddingBottom: 100 },

  creditCard: {
    width: "100%",
    height: 160,
    borderRadius: 20,
    padding: 24,
    justifyContent: "space-between",
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBrand: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "900",
    letterSpacing: 1,
  },
  cardLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 },
  cardBalance: { color: "white", fontSize: 32, fontWeight: "bold" },

  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 25 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  actionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { fontWeight: "bold", fontSize: 13 },

  // GRÁFICA
  chartContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
    paddingTop: 10,
  },
  chartBarGroup: { alignItems: "center", flex: 1 },
  barsWrapper: { flexDirection: "row", alignItems: "flex-end", height: "100%" },
  bar: { width: 12, borderRadius: 4 },
  weekBadge: {
    marginTop: 8,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weekLabel: { fontSize: 10, color: "#64748B", fontWeight: "700" },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 0,
    letterSpacing: 0.5,
  },

  historyList: { backgroundColor: "white", borderRadius: 16, padding: 5 },
  transItem: { flexDirection: "row", alignItems: "center", padding: 15 },
  transIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  transDesc: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  transCat: { fontSize: 11, color: "#64748B", marginTop: 2 },
  transAmount: { fontSize: 14, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 65 },
  emptyState: { padding: 40, alignItems: "center" },

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
  inputLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 8,
    marginTop: 10,
  },
  moneyInput: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E293B",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 16,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  categoryChip: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryChipActive: { borderWidth: 1 },
  categoryText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  modalFooter: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  saveBtn: { padding: 16, borderRadius: 16, alignItems: "center" },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
