import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
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
import { useGame } from "../../src/context/GameContext";
import { db } from "../../src/database/db";
import {
  addManualTransaction,
  getGameState,
  getTransactionHistory,
} from "../../src/database/operations";

// Enable LayoutAnimation for accordion effect
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");

const EXPENSE_CATEGORIES = [
  { id: "Arena", label: "Arena Cost", icon: "stadium" },
  { id: "VFX", label: "Pyrotechnics", icon: "fire" },
  { id: "Staff", label: "Staff Salary", icon: "account-hard-hat" },
  { id: "Ads", label: "Marketing", icon: "bullhorn" },
  { id: "Signing", label: "New Signing", icon: "pen" },
  { id: "Other", label: "Misc Expense", icon: "dots-horizontal" },
];

const INCOME_CATEGORIES = [
  { id: "Bonus", label: "Performance Bonus", icon: "star-circle" },
  { id: "Sponsorship", label: "Sponsorship", icon: "handshake" },
  { id: "Merch", label: "Merchandise", icon: "tshirt-crew" },
  { id: "Network", label: "TV Rights", icon: "television-classic" },
  { id: "Other", label: "Misc Income", icon: "dots-horizontal" },
];

export default function FinancesScreen() {
  const { saveId, brandTheme } = useGame();

  const [cash, setCash] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [historyChartData, setHistoryChartData] = useState<any[]>([]);
  const [recentChartData, setRecentChartData] = useState<any[]>([]);

  // Estado para acordeón de historial
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<"IN" | "OUT">("OUT");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const loadData = () => {
    if (!saveId) return;
    const state: any = getGameState(saveId);
    if (state) setCash(state.currentCash);
    setTransactions(getTransactionHistory(saveId));
    loadCharts(state?.currentWeek || 1);
  };

  const loadCharts = (currentWeek: number) => {
    try {
      const allHistory = [];
      for (let w = currentWeek; w >= 1; w--) {
        // Traemos TODO el detalle de esa semana
        const rows: any[] = db.getAllSync(
          `SELECT * FROM finances WHERE save_id = ? AND week = ? ORDER BY id DESC`,
          [saveId, w]
        );

        let income = 0;
        let expense = 0;

        rows.forEach((r) => {
          if (r.type === "IN" || r.type === "INCOME") income += r.amount;
          else expense += r.amount;
        });

        allHistory.push({
          week: w,
          income,
          expense,
          details: rows, // Guardamos las transacciones aquí
        });
      }
      setHistoryChartData(allHistory);
      // Last 4 weeks for dashboard (reversed for visual order)
      setRecentChartData(allHistory.slice(0, 4).reverse());
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [saveId])
  );

  const handleSave = () => {
    if (!saveId || !amount || !selectedCategory) return;
    addManualTransaction(
      saveId,
      selectedCategory,
      description || selectedCategory,
      parseFloat(amount),
      transactionType
    );
    setAddModalVisible(false);
    setAmount("");
    setDescription("");
    setSelectedCategory("");
    loadData();
  };

  const toggleWeekExpand = (week: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedWeek(expandedWeek === week ? null : week);
  };

  // --- RENDER: HISTORY ITEM (Expandable) ---
  const renderHistoryItem = ({ item }: { item: any }) => {
    const maxVal = Math.max(item.income, item.expense, 1);
    const FULL_BAR_WIDTH = width - 80;
    const isExpanded = expandedWeek === item.week;

    return (
      <View style={styles.hContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => toggleWeekExpand(item.week)}
          style={styles.hHeader}
        >
          <View>
            <Text style={styles.hWeekTitle}>WEEK {item.week}</Text>
            <View style={styles.hBarsContainer}>
              <View
                style={[
                  styles.hBar,
                  {
                    width: (item.income / maxVal) * FULL_BAR_WIDTH,
                    backgroundColor: "#10B981",
                  },
                ]}
              />
              <View
                style={[
                  styles.hBar,
                  {
                    width: (item.expense / maxVal) * FULL_BAR_WIDTH,
                    backgroundColor: "#EF4444",
                    marginTop: 4,
                  },
                ]}
              />
            </View>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748B"
          />
        </TouchableOpacity>

        <View style={styles.hNumbersLeft}>
          <Text style={styles.hIncomeNum}>
            +${item.income.toLocaleString()}
          </Text>
          <Text style={styles.hExpenseNum}>
            -${item.expense.toLocaleString()}
          </Text>
        </View>

        {/* DETALLE EXPANDIBLE */}
        {isExpanded && (
          <View style={styles.hDetailsBox}>
            <Text style={styles.detailHeader}>TRANSACTION BREAKDOWN</Text>
            {item.details.length === 0 ? (
              <Text
                style={{ color: "#666", fontSize: 12, fontStyle: "italic" }}
              >
                No records found.
              </Text>
            ) : (
              item.details.map((t: any, idx: number) => (
                <View key={idx} style={styles.detailRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailDesc}>{t.description}</Text>
                    <Text style={styles.detailCat}>{t.category}</Text>
                  </View>
                  <Text
                    style={[
                      styles.detailAmount,
                      {
                        color:
                          t.type === "IN" || t.type === "INCOME"
                            ? "#10B981"
                            : "#EF4444",
                      },
                    ]}
                  >
                    {t.type === "IN" || t.type === "INCOME" ? "+" : "-"}$
                    {Math.abs(t.amount).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
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
        colors={[brandTheme || "#10B981", "transparent"]}
        style={[styles.absoluteFill, { height: "40%", opacity: 0.2 }]}
      />

      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>THE VAULT</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setHistoryModalVisible(true)}
          >
            <Ionicons name="time-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* CREDIT CARD */}
          <LinearGradient
            colors={["#1E293B", "#0F172A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.creditCard, { borderColor: brandTheme + "40" }]}
          >
            <View style={styles.cardTop}>
              <MaterialCommunityIcons name="chip" size={32} color="#CBD5E1" />
              <Text style={styles.cardBrand}>GM BANK</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>TOTAL BALANCE</Text>
              <Text style={styles.cardBalance}>${cash.toLocaleString()}</Text>
            </View>
          </LinearGradient>

          {/* ACTION BUTTONS */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { borderColor: "#10B98130", backgroundColor: "#10B98110" },
              ]}
              onPress={() => {
                setTransactionType("IN");
                setAddModalVisible(true);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#10B981" }]}>
                <Ionicons name="arrow-down" size={20} color="white" />
              </View>
              <Text style={[styles.actionText, { color: "#10B981" }]}>
                Add Income
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { borderColor: "#EF444430", backgroundColor: "#EF444410" },
              ]}
              onPress={() => {
                setTransactionType("OUT");
                setAddModalVisible(true);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#EF4444" }]}>
                <Ionicons name="arrow-up" size={20} color="white" />
              </View>
              <Text style={[styles.actionText, { color: "#EF4444" }]}>
                Add Expense
              </Text>
            </TouchableOpacity>
          </View>

          {/* RECENT CHART (VERTICAL) */}
          <BlurView intensity={20} tint="dark" style={styles.vChartBox}>
            <View style={styles.vChartHeader}>
              <Text style={styles.sectionTitle}>WEEKLY PERFORMANCE</Text>
            </View>

            <View style={styles.vChartRow}>
              {recentChartData.map((d) => {
                const maxWeek = Math.max(d.income, d.expense, 1000);
                return (
                  <View key={d.week} style={styles.vColumn}>
                    <View style={styles.vBarsWrapper}>
                      <View
                        style={[
                          styles.vBar,
                          {
                            height: (d.income / maxWeek) * 80,
                            backgroundColor: "#10B981",
                            opacity: d.income > 0 ? 1 : 0.2,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.vBar,
                          {
                            height: (d.expense / maxWeek) * 80,
                            backgroundColor: "#EF4444",
                            opacity: d.expense > 0 ? 1 : 0.2,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.vWeekLabel}>W{d.week}</Text>
                  </View>
                );
              })}
            </View>
          </BlurView>

          {/* RECENT TRANSACTIONS */}
          <Text style={[styles.sectionTitle, { marginTop: 25, marginLeft: 5 }]}>
            RECENT TRANSACTIONS
          </Text>
          <View style={styles.historyList}>
            {transactions.slice(0, 10).map((t, i) => (
              <BlurView
                key={i}
                intensity={10}
                tint="dark"
                style={styles.transItem}
              >
                <View
                  style={[
                    styles.transIcon,
                    {
                      backgroundColor:
                        t.type === "IN" || t.type === "INCOME"
                          ? "#10B98120"
                          : "#EF444420",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      t.type === "IN" || t.type === "INCOME"
                        ? "arrow-bottom-left"
                        : "arrow-top-right"
                    }
                    size={20}
                    color={
                      t.type === "IN" || t.type === "INCOME"
                        ? "#10B981"
                        : "#EF4444"
                    }
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.transDesc} numberOfLines={1}>
                    {t.description}
                  </Text>
                  <Text style={styles.transCat}>
                    {t.category} • W{t.week}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transAmount,
                    {
                      color:
                        t.type === "IN" || t.type === "INCOME"
                          ? "#10B981"
                          : "#FFF",
                    },
                  ]}
                >
                  {t.type === "IN" || t.type === "INCOME" ? "+" : "-"}$
                  {Math.abs(t.amount).toLocaleString()}
                </Text>
              </BlurView>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* --- ADD TRANSACTION MODAL --- */}
      <Modal visible={addModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <BlurView intensity={95} tint="dark" style={styles.glassModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {transactionType === "IN" ? "Record Income" : "Record Expense"}
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.inputLabel}>AMOUNT ($)</Text>
              <TextInput
                style={[
                  styles.moneyInput,
                  { color: transactionType === "IN" ? "#10B981" : "#EF4444" },
                ]}
                placeholder="0"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />

              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {(transactionType === "IN"
                  ? INCOME_CATEGORIES
                  : EXPENSE_CATEGORIES
                ).map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat.id && {
                        backgroundColor:
                          transactionType === "IN" ? "#10B98120" : "#EF444420",
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
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Details..."
                placeholderTextColor="#64748B"
                value={description}
                onChangeText={setDescription}
              />

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      transactionType === "IN" ? "#10B981" : "#EF4444",
                  },
                ]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>CONFIRM TRANSACTION</Text>
              </TouchableOpacity>
            </ScrollView>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- HISTORY MODAL --- */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={styles.fsHeader}>
            <Text style={styles.fsTitle}>Financial History</Text>
            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
              <Ionicons name="close-circle" size={30} color="#64748B" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={historyChartData}
            keyExtractor={(item) => item.week.toString()}
            contentContainerStyle={{ padding: 20 }}
            renderItem={renderHistoryItem}
          />
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
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#FFF" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  scrollContent: { padding: 20, paddingBottom: 100 },

  // CREDIT CARD
  creditCard: {
    width: "100%",
    height: 180,
    borderRadius: 24,
    padding: 24,
    justifyContent: "space-between",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBrand: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 12,
  },
  cardLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardBalance: { color: "white", fontSize: 36, fontWeight: "bold" },

  // ACTIONS
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 25 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { fontWeight: "bold", fontSize: 14 },

  // CHARTS
  vChartBox: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  vChartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  vChartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 100,
  },
  vColumn: { alignItems: "center", flex: 1 },
  vBarsWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 80,
  },
  vBar: { width: 8, borderRadius: 4 },
  vWeekLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748B",
  },

  // TRANSACTIONS
  historyList: { marginTop: 10, gap: 10 },
  transItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  transIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  transDesc: { fontSize: 14, fontWeight: "bold", color: "#E2E8F0" },
  transCat: { fontSize: 11, color: "#64748B", marginTop: 2 },
  transAmount: { fontSize: 14, fontWeight: "bold" },

  // HORIZONTAL BARS (MODAL)
  hContainer: {
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  hHeader: {
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hWeekTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 10,
  },
  hBarsContainer: { gap: 6, width: width - 120 }, // Limit width to allow flex
  hBar: { height: 10, borderRadius: 5 },
  hNumbersLeft: {
    flexDirection: "row",
    marginTop: 0,
    gap: 15,
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  hIncomeNum: { fontSize: 12, fontWeight: "bold", color: "#10B981" },
  hExpenseNum: { fontSize: 12, fontWeight: "bold", color: "#EF4444" },

  // DETAILS EXPANDED
  hDetailsBox: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    padding: 15,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  detailHeader: {
    fontSize: 10,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 10,
    letterSpacing: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailDesc: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  detailCat: { color: "#64748B", fontSize: 10 },
  detailAmount: { fontSize: 12, fontWeight: "bold" },

  // MODALS
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  glassModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#FFF" },

  inputLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 10,
    marginTop: 10,
    paddingLeft: 5,
  },
  moneyInput: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 16,
    textAlign: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    color: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
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
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  categoryText: { fontSize: 12, fontWeight: "600", color: "#64748B" },

  saveBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 30,
  },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },

  fsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  fsTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
});
