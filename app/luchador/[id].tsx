import { Ionicons } from "@expo/vector-icons";
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
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ManagementHeader } from "../../src/components/ManagementHeader";
import { useGame } from "../../src/context/GameContext"; // <--- 1. IMPORTAR CONTEXTO
import {
  deleteLuchador,
  getAllTitles,
  getLuchadorById,
  renewContract,
} from "../../src/database/operations";

const { width } = Dimensions.get("window");

export default function LuchadorDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { saveId, brandTheme } = useGame(); // <--- 2. USAR CONTEXTO

  const [luchador, setLuchador] = useState<any | null>(null);
  const [titles, setTitles] = useState<any[]>([]);

  // ESTADOS MODAL
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewWeeks, setRenewWeeks] = useState("10");
  const [renewCost, setRenewCost] = useState("0");

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadData = () => {
    if (id && saveId) {
      const data = getLuchadorById(Number(id));
      setLuchador(data);

      // 3. PASAR SAVE_ID A GET TITLES
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
            // 4. PASAR SAVE_ID A RENEW CONTRACT
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

  // --- COMPONENTES AUXILIARES ---
  const StatBar = ({ label, value, color }: any) => (
    <View style={styles.statRow}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${value}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <ManagementHeader />

      {/* HEADER NAVEGACION */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Perfil de Talento</Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "../luchador/edit/[id]",
              params: { id: Number(id) },
            })
          }
          style={styles.editIconBtn}
        >
          {/* TEMA: Color del icono de editar */}
          <Ionicons name="pencil" size={20} color={brandTheme} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {/* BANNER DE ALERTA */}
        {isExpired && (
          <View style={styles.expiredBanner}>
            <Ionicons name="warning" size={20} color="white" />
            <Text style={styles.expiredBannerText}>
              CONTRATO VENCIDO - RENOVAR O DESPEDIR
            </Text>
          </View>
        )}

        {/* --- PERFIL PRINCIPAL --- */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {luchador.imageUri ? (
              <Image
                source={{ uri: luchador.imageUri }}
                style={styles.avatarImage}
              />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: getClassColor(luchador.mainClass) },
                ]}
              >
                <Text style={styles.avatarText}>{luchador.name.charAt(0)}</Text>
              </View>
            )}

            {/* Badges Flotantes */}
            <View
              style={[
                styles.floatBadge,
                {
                  right: 0,
                  backgroundColor:
                    luchador.crowd === "Face" ? "#3B82F6" : "#EF4444",
                },
              ]}
            >
              <Text style={styles.floatBadgeText}>{luchador.crowd}</Text>
            </View>
          </View>

          <Text style={styles.name}>{luchador.name}</Text>
          <Text style={styles.classText}>
            {luchador.mainClass} • {luchador.gender}
          </Text>

          {/* TÍTULOS ACTIVOS */}
          {titles.length > 0 && (
            <View style={styles.titlesRow}>
              {titles.map((t) => (
                <LinearGradient
                  key={t.id}
                  colors={
                    t.isMITB ? ["#6366F1", "#4338CA"] : ["#F59E0B", "#B45309"]
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
              ))}
            </View>
          )}
        </View>

        {/* --- ESTADÍSTICAS (BARRAS) --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>ATRIBUTOS</Text>
          <View style={styles.card}>
            <StatBar
              label="Habilidad In-Ring"
              value={luchador.ringLevel}
              color="#10B981"
            />
            <StatBar label="Micrófono" value={luchador.mic} color="#F59E0B" />
            <StatBar
              label="Popularidad"
              value={luchador.popularity || 50}
              color="#8B5CF6"
            />
          </View>
        </View>

        {/* --- RÉCORD --- */}
        <View style={styles.sectionContainer}>
          <View style={styles.recordRow}>
            <View
              style={[
                styles.recordBox,
                { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
              ]}
            >
              <Text style={[styles.recordNum, { color: "#059669" }]}>
                {luchador.normalWins}
              </Text>
              <Text style={[styles.recordLabel, { color: "#059669" }]}>
                VICTORIAS
              </Text>
            </View>
            <View
              style={[
                styles.recordBox,
                { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
              ]}
            >
              <Text style={[styles.recordNum, { color: "#DC2626" }]}>
                {luchador.normalLosses}
              </Text>
              <Text style={[styles.recordLabel, { color: "#DC2626" }]}>
                DERROTAS
              </Text>
            </View>
          </View>
        </View>

        {/* --- CONTRATO --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>CONTRATO</Text>
          <View
            style={[
              styles.card,
              (isExpired || isExpiring) && {
                borderColor: "#EF4444",
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>Estado</Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color: isExpired
                        ? "#EF4444"
                        : isExpiring
                        ? "#F59E0B"
                        : "#1E293B",
                    },
                  ]}
                >
                  {isExpired
                    ? "VENCIDO"
                    : luchador.isDraft === 1
                    ? "DRAFT PERMANENTE"
                    : `${luchador.weeksLeft} Semanas Restantes`}
                </Text>
              </View>
              {luchador.isDraft === 0 && (
                <TouchableOpacity
                  style={[
                    styles.renewSmallBtn,
                    { backgroundColor: brandTheme },
                  ]} // TEMA
                  onPress={handleOpenRenew}
                >
                  <Text style={styles.renewSmallText}>RENOVAR</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>Valor de Fichaje</Text>
                <Text style={styles.infoValue}>
                  ${luchador.hiringCost?.toLocaleString()}
                </Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Cláusula</Text>
                <Text style={styles.infoValue}>Estándar</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- BOTÓN PELIGRO --- */}
        <TouchableOpacity style={styles.deleteLink} onPress={handleDelete}>
          <Text style={styles.deleteLinkText}>Despedir a {luchador.name}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ================= MODAL NEGOCIACIÓN ================= */}
      <Modal
        visible={renewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRenewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Renovación de Contrato</Text>
              <TouchableOpacity onPress={() => setRenewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center", marginBottom: 20 }}>
              {luchador.imageUri ? (
                <Image
                  source={{ uri: luchador.imageUri }}
                  style={{ width: 60, height: 60, borderRadius: 30 }}
                />
              ) : (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: "#E2E8F0",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      color: "#64748B",
                    }}
                  >
                    {luchador.name.charAt(0)}
                  </Text>
                </View>
              )}
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 16,
                  fontWeight: "bold",
                  color: "#1E293B",
                }}
              >
                Oferta para {luchador.name}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Semanas Adicionales</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={renewWeeks}
                onChangeText={setRenewWeeks}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bono por Firma ($)</Text>
              <TextInput
                style={[styles.input, { color: "#10B981", fontWeight: "bold" }]}
                keyboardType="numeric"
                value={renewCost}
                onChangeText={setRenewCost}
              />
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                Nuevo vencimiento: En{" "}
                {(parseInt(renewWeeks) || 0) +
                  (luchador.weeksLeft > 0 ? luchador.weeksLeft : 0)}{" "}
                semanas
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmRenewBtn, { backgroundColor: brandTheme }]} // TEMA
              onPress={submitRenewal}
            >
              <Text style={styles.confirmRenewText}>CONFIRMAR OFERTA</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ... EL RESTO DE LOS ESTILOS SE MANTIENE IGUAL ...
const getClassColor = (cls: string) => {
  switch (cls) {
    case "Giant":
      return "#EF4444";
    case "Cruiser":
      return "#3B82F6";
    case "Bruiser":
      return "#10B981";
    case "Fighter":
      return "#F59E0B";
    case "Specialist":
      return "#8B5CF6";
    default:
      return "#64748B";
  }
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F5F7FA" },

  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    backgroundColor: "white",
    padding: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  navTitle: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  editIconBtn: { padding: 8 },

  expiredBanner: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    gap: 8,
  },
  expiredBannerText: { color: "white", fontWeight: "bold", fontSize: 12 },

  // PERFIL
  profileHeader: { alignItems: "center", paddingTop: 10, paddingBottom: 20 },
  avatarContainer: { position: "relative", marginBottom: 12 },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "white",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
  },
  avatarText: { fontSize: 40, color: "white", fontWeight: "bold" },

  floatBadge: {
    position: "absolute",
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "white",
  },
  floatBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  name: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1E293B",
    textAlign: "center",
  },
  classText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },

  titlesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  titlePill: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    gap: 4,
  },
  titlePillText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  titlePillIcon: { fontSize: 10, color: "white" },

  // SECCIONES
  sectionContainer: { marginBottom: 20, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94A3B8",
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },

  // STATS
  statRow: { marginBottom: 12 },
  statLabel: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  statValue: { fontSize: 12, fontWeight: "bold" },
  progressBarBg: { height: 6, backgroundColor: "#F1F5F9", borderRadius: 3 },
  progressBarFill: { height: "100%", borderRadius: 3 },

  // RECORD
  recordRow: { flexDirection: "row", gap: 15 },
  recordBox: {
    flex: 1,
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
  },
  recordNum: { fontSize: 24, fontWeight: "900" },
  recordLabel: { fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },

  // CONTRATO
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "bold",
    marginBottom: 2,
  },
  infoValue: { fontSize: 14, color: "#1E293B", fontWeight: "700" },
  renewSmallBtn: {
    // backgroundColor: "#1E293B", // SE USA TEMA AHORA
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  renewSmallText: { color: "white", fontSize: 10, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },

  // ACTIONS
  deleteLink: { padding: 15, alignItems: "center", marginBottom: 20 },
  deleteLinkText: { color: "#EF4444", fontWeight: "600" },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  inputGroup: { marginBottom: 15 },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748B",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    color: "#1E293B",
    fontWeight: "600",
  },
  summaryBox: {
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  summaryText: { color: "#3B82F6", fontWeight: "bold", fontSize: 12 },
  confirmRenewBtn: {
    // backgroundColor: "#10B981", // SE USA TEMA AHORA
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmRenewText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
