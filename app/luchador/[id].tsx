import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image"; // USAMOS EXPO IMAGE
import { LinearGradient } from "expo-linear-gradient";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  Alert,
  Dimensions,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../../src/context/GameContext";
import {
  deleteLuchador,
  getAllTitles,
  getLuchadorById,
  renewContract,
} from "../../src/database/operations";

// --- IMPORTAR EL HELPER DE IMÁGENES DE LUCHADORES ---
import { getWrestlerImage } from "../../src/utils/imageHelper";

const { width } = Dimensions.get("window");

// --- URL BASE PARA TÍTULOS ---
const TITLES_REPO_URL =
  "https://raw.githubusercontent.com/eldeiivid/wwe-mymg-assets/main/titles/";

export default function LuchadorDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { saveId, brandTheme } = useGame();

  const [luchador, setLuchador] = useState<any | null>(null);
  const [titles, setTitles] = useState<any[]>([]);

  // ESTADOS MODAL
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewWeeks, setRenewWeeks] = useState("10");
  const [renewCost, setRenewCost] = useState("0");

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- HELPER PARA IMAGEN DE TÍTULO ---
  const getTitleImage = (title: any) => {
    if (!title) return undefined;

    // 1. PRIORIDAD: DB
    if (title.imageUri && title.imageUri !== "") {
      return `${TITLES_REPO_URL}${title.imageUri}`;
    }

    // 2. FALLBACK
    const gender = title.gender === "Female" ? "female" : "male";
    if (
      title.isMITB === 1 ||
      title.name.includes("MITB") ||
      title.name.includes("Briefcase")
    ) {
      return `${TITLES_REPO_URL}${gender}-moneyinthebank.png`;
    }

    let brand = "raw";
    const nameLower = title.name.toLowerCase();
    if (nameLower.includes("smackdown") || nameLower.includes("universal"))
      brand = "smackdown";
    else if (nameLower.includes("nxt")) brand = "nxt";
    else if (nameLower.includes("aew")) brand = "aew";

    let division = "world";
    const cat = title.category || title.type || "";
    if (cat === "Midcard") division = "midcard";
    else if (cat === "Tag") division = "tagteam";

    if (division === "tagteam" && gender === "female") {
      return `${TITLES_REPO_URL}female-tagteam.webp`;
    }

    return `${TITLES_REPO_URL}${brand}-${gender}-${division}.webp`;
  };

  const loadData = () => {
    if (id && saveId) {
      const data = getLuchadorById(Number(id));
      setLuchador(data);

      const allTitles = getAllTitles(saveId);
      const activeTitles = allTitles.filter(
        (t: any) => t.holderId1 === Number(id) || t.holderId2 === Number(id)
      );
      setTitles(activeTitles);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id, saveId])
  );

  const handleDelete = () => {
    Alert.alert(
      "¿Despedir Luchador?",
      "Perderás sus estadísticas y contrato permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Despedir",
          style: "destructive",
          onPress: () => {
            deleteLuchador(Number(id));
            router.back();
          },
        },
      ]
    );
  };

  const handleOpenRenew = () => {
    const suggestedCost = Math.floor((luchador.hiringCost || 10000) * 0.1);
    setRenewCost(suggestedCost.toString());
    setRenewWeeks("10");
    setRenewModalVisible(true);
  };

  const submitRenewal = () => {
    if (!saveId) return;

    const cost = parseInt(renewCost) || 0;
    const weeks = parseInt(renewWeeks) || 0;

    if (weeks <= 0) {
      Alert.alert("Error", "Debes añadir al menos 1 semana.");
      return;
    }

    Alert.alert(
      "Confirmar Trato",
      `Pagar $${cost.toLocaleString()} por ${weeks} semanas adicionales.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Firmar Contrato",
          onPress: () => {
            const success = renewContract(saveId, Number(id), cost, weeks);
            if (success) {
              setRenewModalVisible(false);
              loadData();
              Alert.alert("Éxito", "Renovación completada.");
            } else {
              Alert.alert("Error", "No se pudo procesar la renovación.");
            }
          },
        },
      ]
    );
  };

  if (!luchador) return null;

  const isExpired = luchador.isDraft === 0 && luchador.weeksLeft <= 0;
  const isExpiring = luchador.isDraft === 0 && luchador.weeksLeft <= 5;
  const isHeel = luchador.crowd === "Heel";
  const alignColor = isHeel ? "#EF4444" : "#3B82F6";

  // Formato para clases múltiples
  const classDisplayText =
    luchador.altClass && luchador.altClass !== "None"
      ? `${luchador.mainClass} • ${luchador.altClass}`
      : luchador.mainClass;

  // --- COMPONENTES AUXILIARES ---
  const StatBar = ({ label, value, color, icon, max = 100 }: any) => {
    const percentage = Math.min((value / max) * 100, 100);

    return (
      <View style={styles.statRow}>
        <View style={styles.statHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name={icon} size={14} color="#94A3B8" />
            <Text style={styles.statLabel}>{label}</Text>
          </View>
          <Text style={[styles.statValue, { color }]}>
            {value}
            <Text style={{ fontSize: 10, color: "#64748B" }}>/{max}</Text>
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={[color, color + "80"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${percentage}%` }]}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />

      {/* GLOBAL BACKGROUND */}
      <View style={[styles.absoluteFill, { backgroundColor: "#000" }]} />
      <LinearGradient
        colors={[alignColor, "transparent"]}
        style={[styles.absoluteFill, { height: "60%", opacity: 0.2 }]}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* HEADER NAVEGACION */}
        <View style={styles.navHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>TALENT PROFILE</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "../luchador/edit/[id]",
                params: { id: Number(id) },
              })
            }
            style={styles.iconBtn}
          >
            <Ionicons name="pencil" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {/* BANNER DE ALERTA */}
          {isExpired && (
            <BlurView
              intensity={40}
              tint="dark"
              style={[styles.expiredBanner, { borderColor: "#EF4444" }]}
            >
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={[styles.expiredBannerText, { color: "#EF4444" }]}>
                CONTRATO VENCIDO - ACCIÓN REQUERIDA
              </Text>
            </BlurView>
          )}

          {/* --- HERO SECTION --- */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[alignColor, "transparent"]}
                style={styles.avatarGlow}
              />

              {luchador.imageUri ? (
                // --- 4. IMAGEN PRINCIPAL OPTIMIZADA ---
                <Image
                  source={{ uri: getWrestlerImage(luchador.imageUri) }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={500}
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    {
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderColor: alignColor,
                    },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {luchador.name.charAt(0)}
                  </Text>
                </View>
              )}

              <BlurView intensity={30} tint="dark" style={styles.classBadge}>
                <Text style={styles.classBadgeText}>{luchador.mainClass}</Text>
              </BlurView>
            </View>

            <Text style={styles.name}>{luchador.name}</Text>

            <View style={styles.subInfoRow}>
              <View
                style={[
                  styles.miniBadge,
                  {
                    backgroundColor: alignColor + "20",
                    borderColor: alignColor,
                  },
                ]}
              >
                <Text style={[styles.miniBadgeText, { color: alignColor }]}>
                  {luchador.crowd}
                </Text>
              </View>

              <Text style={styles.divider}>|</Text>

              <Text style={styles.subInfoText}>
                {classDisplayText.toUpperCase()}
                <Text style={{ color: "#64748B" }}>
                  {" "}
                  • {luchador.gender.toUpperCase()}
                </Text>
              </Text>
            </View>

            {/* TÍTULOS ACTIVOS (AHORA CON IMÁGENES) */}
            {titles.length > 0 && (
              <View style={styles.titlesRow}>
                {titles.map((t) => {
                  const tImage = getTitleImage(t);
                  return (
                    <View key={t.id} style={styles.titleItem}>
                      {tImage ? (
                        <Image
                          source={{ uri: tImage }}
                          style={styles.titleImage}
                          contentFit="contain"
                        />
                      ) : (
                        // Fallback a texto si no hay imagen (por seguridad)
                        <LinearGradient
                          colors={
                            t.isMITB
                              ? ["#6366F1", "#4338CA"]
                              : ["#F59E0B", "#B45309"]
                          }
                          style={styles.titlePill}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text style={styles.titlePillIcon}>
                            {t.isMITB ? "💼" : "🏆"}
                          </Text>
                          <Text style={styles.titlePillText}>{t.name}</Text>
                        </LinearGradient>
                      )}
                      {/* Si usamos imagen, mostramos el nombre abajo pequeño */}
                      {tImage && (
                        <Text style={styles.titleLabel} numberOfLines={1}>
                          {t.name}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* --- ESTADÍSTICAS (SIN POPULARIDAD) --- */}
          <BlurView intensity={20} tint="dark" style={styles.glassCard}>
            <Text style={styles.sectionTitle}>PERFORMANCE STATS</Text>
            <StatBar
              label="In-Ring Skill"
              value={luchador.ringLevel}
              max={25}
              color="#10B981"
              icon="fitness"
            />
            <StatBar
              label="Mic Skill"
              value={luchador.mic}
              max={5}
              color="#F59E0B"
              icon="mic"
            />
          </BlurView>

          {/* --- RÉCORD (GRID) --- */}
          <View style={styles.recordRow}>
            <BlurView
              intensity={20}
              tint="dark"
              style={[
                styles.recordBox,
                { borderColor: "rgba(16, 185, 129, 0.3)" },
              ]}
            >
              <Text style={[styles.recordNum, { color: "#10B981" }]}>
                {luchador.normalWins}
              </Text>
              <Text style={styles.recordLabel}>WINS</Text>
            </BlurView>

            <BlurView
              intensity={20}
              tint="dark"
              style={[
                styles.recordBox,
                { borderColor: "rgba(239, 68, 68, 0.3)" },
              ]}
            >
              <Text style={[styles.recordNum, { color: "#EF4444" }]}>
                {luchador.normalLosses}
              </Text>
              <Text style={styles.recordLabel}>LOSSES</Text>
            </BlurView>
          </View>

          {/* --- CONTRATO (GLASS CARD MEJORADO) --- */}
          <BlurView
            intensity={20}
            tint="dark"
            style={[
              styles.glassCard,
              (isExpired || isExpiring) && {
                borderColor: "#EF4444",
                borderWidth: 1,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <Text style={styles.sectionTitle}>CONTRACT STATUS</Text>
              {luchador.isDraft === 0 && (
                <TouchableOpacity
                  onPress={handleOpenRenew}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{ color: "#FFF", fontSize: 10, fontWeight: "bold" }}
                  >
                    NEGOTIATE
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>Time Remaining</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color: isExpired
                        ? "#EF4444"
                        : isExpiring
                        ? "#F59E0B"
                        : "#FFF",
                    },
                  ]}
                >
                  {isExpired
                    ? "EXPIRED"
                    : luchador.isDraft === 1
                    ? "PERMANENT DRAFT"
                    : `${luchador.weeksLeft} Weeks`}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.infoLabel}>Salary Cost</Text>
                <Text style={styles.infoValue}>
                  ${luchador.hiringCost?.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* --- NUEVA BARRA DE CONTRATO VISUAL --- */}
            <View style={{ marginTop: 15 }}>
              {luchador.isDraft === 1 ? (
                // CASO DRAFT PERMANENTE: Barra Dorada Infinita
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 6,
                      backgroundColor: "rgba(251, 191, 36, 0.2)",
                      borderRadius: 3,
                    }}
                  >
                    <LinearGradient
                      colors={["#F59E0B", "#FBBF24"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ width: "100%", height: "100%", borderRadius: 3 }}
                    />
                  </View>
                  <Ionicons name="infinite" size={18} color="#FBBF24" />
                </View>
              ) : (
                // CASO AGENTE LIBRE (TEMPORAL): Barra de "Gasolina"
                <View>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <LinearGradient
                      // Color dinámico según urgencia
                      colors={
                        luchador.weeksLeft <= 5
                          ? ["#EF4444", "#B91C1C"] // Rojo
                          : luchador.weeksLeft <= 12
                          ? ["#F59E0B", "#D97706"] // Amarillo
                          : ["#10B981", "#059669"] // Verde
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        // Calculamos %: Tope visual de 25 semanas. Si tiene más, se ve lleno.
                        width: `${Math.min(
                          (luchador.weeksLeft / 25) * 100,
                          100
                        )}%`,
                        height: "100%",
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      color: "#64748B",
                      fontSize: 10,
                      fontWeight: "600",
                      marginTop: 6,
                      textAlign: "right",
                    }}
                  >
                    {luchador.weeksLeft <= 0
                      ? "Needs Renewal"
                      : luchador.weeksLeft <= 5
                      ? "Expiring Soon"
                      : "Contract Healthy"}
                  </Text>
                </View>
              )}
            </View>
          </BlurView>

          {/* --- BOTÓN PELIGRO --- */}
          <TouchableOpacity style={styles.deleteLink} onPress={handleDelete}>
            <Ionicons
              name="trash-outline"
              size={16}
              color="#EF4444"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.deleteLinkText}>Release Talent</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* ================= MODAL NEGOCIACIÓN (DARK) ================= */}
      <Modal
        visible={renewModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRenewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <BlurView intensity={95} tint="dark" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contract Negotiation</Text>
              <TouchableOpacity
                onPress={() => setRenewModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{ marginBottom: 10 }}>
                {luchador.imageUri ? (
                  // --- 5. IMAGEN EN MODAL OPTIMIZADA ---
                  <Image
                    source={{ uri: getWrestlerImage(luchador.imageUri) }}
                    style={{ width: 50, height: 50, borderRadius: 25 }}
                    contentFit="cover"
                    transition={500}
                  />
                ) : (
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: "#333",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                      {luchador.name.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ color: "#94A3B8", fontSize: 14 }}>
                Offering extension to{" "}
                <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                  {luchador.name}
                </Text>
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Weeks</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={renewWeeks}
                onChangeText={setRenewWeeks}
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Signing Bonus ($)</Text>
              <TextInput
                style={[styles.input, { color: "#10B981" }]}
                keyboardType="numeric"
                value={renewCost}
                onChangeText={setRenewCost}
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                New Expiration: In{" "}
                {(parseInt(renewWeeks) || 0) +
                  (luchador.weeksLeft > 0 ? luchador.weeksLeft : 0)}{" "}
                weeks
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmRenewBtn, { backgroundColor: brandTheme }]}
              onPress={submitRenewal}
            >
              <Text style={styles.confirmRenewText}>SIGN CONTRACT</Text>
            </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// STYLES
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#000" },
  absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1,
  },

  expiredBanner: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  expiredBannerText: { fontWeight: "bold", fontSize: 12 },

  // HERO PROFILE
  profileHeader: { alignItems: "center", paddingTop: 10, paddingBottom: 20 },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.6,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  avatarText: { fontSize: 40, color: "white", fontWeight: "bold" },

  classBadge: {
    position: "absolute",
    bottom: -10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  classBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  name: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFF",
    textAlign: "center",
    marginTop: 10,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  miniBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  subInfoText: {
    fontSize: 11,
    color: "#CBD5E1",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  divider: { color: "#64748B", fontWeight: "100" },

  titlesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 15, // Más espacio entre títulos
    marginTop: 20,
  },
  titleItem: {
    alignItems: "center",
    width: 160,
  },
  titleImage: {
    width: 80,
    height: 60,
    marginBottom: 5,
  },
  titleLabel: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    width: "100%",
  },
  // Fallback pills
  titlePill: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: "center",
    gap: 6,
  },
  titlePillText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  titlePillIcon: { fontSize: 12, color: "white" },

  // SECCIONES (GLASS CARDS)
  glassCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 15,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // STATS
  statRow: { marginBottom: 12 },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statLabel: { fontSize: 12, fontWeight: "600", color: "#CBD5E1" },
  statValue: { fontSize: 12, fontWeight: "bold" },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
  },
  progressBarFill: { height: "100%", borderRadius: 2 },

  // RECORD
  recordRow: {
    flexDirection: "row",
    gap: 15,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  recordBox: {
    flex: 1,
    alignItems: "center",
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  recordNum: { fontSize: 24, fontWeight: "900" },
  recordLabel: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    color: "#94A3B8",
    marginTop: 4,
  },

  // CONTRATO INFO
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "bold",
    marginBottom: 4,
  },
  infoValue: { fontSize: 15, color: "#FFF", fontWeight: "700" },

  // ACTIONS
  deleteLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    marginBottom: 20,
  },
  deleteLinkText: { color: "#EF4444", fontWeight: "700", fontSize: 14 },

  // MODAL DARK
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#FFF" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  inputGroup: { marginBottom: 15 },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    color: "#FFF",
    fontWeight: "600",
  },
  summaryBox: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  summaryText: { color: "#60A5FA", fontWeight: "bold", fontSize: 12 },
  confirmRenewBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmRenewText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },
});
