import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
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
  getLuchadorTitleHistory,
  renewContract,
} from "../../src/database/operations";
import { getWrestlerImage } from "../../src/utils/imageHelper";

const { width } = Dimensions.get("window");
const TITLES_REPO_URL =
  "https://raw.githubusercontent.com/eldeiivid/wwe-mymg-assets/main/titles/";

export default function LuchadorDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const { saveId } = useGame();

  const [luchador, setLuchador] = useState<any | null>(null);
  const [currentTitles, setCurrentTitles] = useState<any[]>([]);
  const [pastTitles, setPastTitles] = useState<any[]>([]);

  // MODAL STATES
  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewWeeks, setRenewWeeks] = useState("10");
  const [renewCost, setRenewCost] = useState("0");

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // HELPER IMAGENES
  const getTitleImage = (title: any) => {
    if (!title) return undefined;
    if (title.imageUri && title.imageUri !== "")
      return `${TITLES_REPO_URL}${title.imageUri}`;

    const gender = title.gender === "Female" ? "female" : "male";
    if (title.isMITB === 1 || title.name?.includes("MITB")) {
      return `${TITLES_REPO_URL}${gender}-moneyinthebank.png`;
    }

    let brand = "raw";
    const nameLower = title.name?.toLowerCase() || "";
    if (nameLower.includes("smackdown")) brand = "smackdown";
    else if (nameLower.includes("nxt")) brand = "nxt";
    else if (nameLower.includes("aew")) brand = "aew";

    let division = "world";
    if (title.category === "Midcard") division = "midcard";
    else if (title.category === "Tag") division = "tagteam";

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
      const active = allTitles.filter(
        (t: any) => t.holderId1 === Number(id) || t.holderId2 === Number(id)
      );
      setCurrentTitles(active);

      let history: any[] = [];
      try {
        history = getLuchadorTitleHistory(saveId, Number(id));
      } catch (e) {
        console.log("Error cargando historial");
      }

      const currentAsHistory = active.map((t: any) => ({
        id: `curr-${t.id}`,
        titleName: t.name,
        imageUri: t.imageUri,
        category: t.category,
        gender: t.gender,
        isMITB: t.isMITB,
        weekWon: t.weekWon,
        weekLost: null,
      }));

      setPastTitles([...currentAsHistory, ...history]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id, saveId])
  );

  const handleDelete = () => {
    Alert.alert("¿Despedir?", "Esta acción es irreversible.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Despedir",
        style: "destructive",
        onPress: () => {
          deleteLuchador(Number(id));
          router.back();
        },
      },
    ]);
  };

  const handleOpenRenew = () => {
    const suggested = Math.floor((luchador.hiringCost || 10000) * 0.1);
    setRenewCost(suggested.toString());
    setRenewWeeks("10");
    setRenewModalVisible(true);
  };

  const submitRenewal = () => {
    if (!saveId) return;
    const cost = parseInt(renewCost) || 0;
    const weeks = parseInt(renewWeeks) || 0;
    if (weeks <= 0) return Alert.alert("Error", "Mínimo 1 semana.");

    Alert.alert(
      "Confirmar",
      `Pagar $${cost.toLocaleString()} por ${weeks} semanas?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Firmar",
          onPress: () => {
            if (renewContract(saveId, Number(id), cost, weeks)) {
              setRenewModalVisible(false);
              loadData();
              Alert.alert("Éxito", "Contrato renovado.");
            }
          },
        },
      ]
    );
  };

  if (!luchador) return null;

  const isHeel = luchador.crowd === "Heel";
  // Colores base (Un poco más oscuros para dar elegancia)
  const primaryColor = isHeel ? "#7f1d1d" : "#1e3a8a";
  const accentColor = isHeel ? "#EF4444" : "#3B82F6";

  const wrestlerImageSource = luchador.imageUri
    ? { uri: getWrestlerImage(luchador.imageUri) }
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. FONDO GENERAL */}
      <LinearGradient
        colors={[primaryColor, "#000"]}
        locations={[0, 0.5]} // El color principal solo llega hasta la mitad
        style={styles.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER NAV */}
          <View style={styles.navBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() =>
                router.push({
                  pathname: "../luchador/edit/[id]",
                  params: { id: Number(id) },
                })
              }
            >
              <MaterialCommunityIcons name="pencil" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* 2. TOP CARD (HERO SECTION) */}
          <View style={styles.heroContainer}>
            {/* TEXTO DE FONDO (NOMBRE GIGANTE ATRAS DE TODO) */}
            <Text
              style={styles.bigBgText}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {luchador.name.split(" ").pop()?.toUpperCase()}
            </Text>

            {/* CONTENEDOR DE LA IMAGEN + MASCARA DE FUSIÓN */}
            <View style={styles.imageWrapper}>
              {wrestlerImageSource ? (
                <>
                  <Image
                    source={wrestlerImageSource}
                    style={styles.heroImage}
                    contentFit="cover"
                  />
                  {/* --- ESTE ES EL SECRETO: GRADIENTE SUPERPUESTO PARA FUSIONAR --- */}
                  <LinearGradient
                    // De transparente arriba a NEGRO abajo (mismo color que el fondo de la app)
                    colors={["transparent", "transparent", "#000"]}
                    locations={[0, 0.7, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                </>
              ) : (
                <View style={styles.placeholderImage}>
                  <Text
                    style={{ fontSize: 80, color: "rgba(255,255,255,0.1)" }}
                  >
                    {luchador.name[0]}
                  </Text>
                </View>
              )}
            </View>

            {/* INFO TEXT (Sobrepuesto a la izquierda) */}
            <View style={styles.infoOverlay}>
              <View
                style={[styles.roleBadge, { backgroundColor: accentColor }]}
              >
                <Text style={styles.roleText}>
                  {luchador.crowd.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.nameText}>{luchador.name.toUpperCase()}</Text>
              <Text style={styles.classText}>
                {luchador.mainClass.toUpperCase()}
                {luchador.altClass && luchador.altClass !== "None"
                  ? ` • ${luchador.altClass.toUpperCase()}`
                  : ""}
              </Text>
            </View>

            {/* OVR (Flotando a la derecha) */}
            <View style={styles.ovrContainer}>
              <BlurView intensity={30} tint="light" style={styles.ovrBlur}>
                <Text style={styles.ovrNumber}>{luchador.ringLevel}</Text>
                <Text style={styles.ovrLabel}>OVR</Text>
              </BlurView>
            </View>
          </View>

          {/* 3. STATS GRID (MIC - WINS - LOSSES) */}
          <View style={styles.statsRow}>
            {/* MIC */}
            <View
              style={[
                styles.statItem,
                { backgroundColor: "rgba(255,255,255,0.05)" },
              ]}
            >
              <Text style={styles.statLabel}>MIC</Text>
              <Text style={styles.statValue}>{luchador.mic}</Text>
            </View>

            {/* WINS (Verde) */}
            <View
              style={[
                styles.statItem,
                {
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: "#10B981" }]}>WINS</Text>
              <Text style={[styles.statValue, { color: "#10B981" }]}>
                {luchador.normalWins}
              </Text>
            </View>

            {/* LOSSES (Rojo) */}
            <View
              style={[
                styles.statItem,
                {
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.statLabel, { color: "#EF4444" }]}>
                LOSSES
              </Text>
              <Text style={[styles.statValue, { color: "#EF4444" }]}>
                {luchador.normalLosses}
              </Text>
            </View>
          </View>

          {/* 4. SECCIONES DE CONTENIDO */}
          <View style={styles.contentSection}>
            {/* TITULOS ACTUALES */}
            {currentTitles.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>CURRENT CHAMPION</Text>
                <View style={styles.activeTitlesRow}>
                  {currentTitles.map((t) => (
                    <View key={t.id} style={styles.activeTitleCard}>
                      <Image
                        source={{ uri: getTitleImage(t) }}
                        style={styles.activeTitleImg}
                        contentFit="contain"
                      />
                      <Text style={styles.activeTitleName} numberOfLines={1}>
                        {t.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* TROPHY ROOM */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>TROPHY ROOM</Text>
              {pastTitles.length === 0 ? (
                <Text style={styles.emptyText}>
                  No championships history yet.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {pastTitles.map((reign, idx) => {
                    const isActive = reign.weekLost === null;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.trophyCard,
                          isActive && {
                            borderColor: "#F59E0B",
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: getTitleImage(reign) }}
                          style={styles.trophyImg}
                          contentFit="contain"
                        />
                        <View>
                          <Text style={styles.trophyName} numberOfLines={1}>
                            {reign.titleName}
                          </Text>
                          <Text
                            style={[
                              styles.trophyDetail,
                              isActive && {
                                color: "#F59E0B",
                                fontWeight: "bold",
                              },
                            ]}
                          >
                            {isActive
                              ? "CURRENT REIGN"
                              : `${
                                  (reign.weekLost || 0) - (reign.weekWon || 0)
                                } WEEKS`}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* CONTRACT */}
            <View style={styles.contractBox}>
              <View style={styles.contractHeader}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#94A3B8"
                />
                <Text style={styles.contractTitle}>CONTRACT STATUS</Text>
              </View>

              <View style={styles.contractDetails}>
                <View>
                  <Text style={styles.contractSubLabel}>TYPE</Text>
                  <Text
                    style={[
                      styles.contractMainValue,
                      { color: luchador.isDraft ? "#FFF" : "#F59E0B" },
                    ]}
                  >
                    {luchador.isDraft === 1 ? "PERMANENT" : "TEMPORARY"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.contractSubLabel}>TIME LEFT</Text>
                  <Text
                    style={[
                      styles.contractMainValue,
                      { color: luchador.weeksLeft < 5 ? "#EF4444" : "#FFF" },
                    ]}
                  >
                    {luchador.isDraft === 1 ? "∞" : `${luchador.weeksLeft} WKS`}
                  </Text>
                </View>
                <View>
                  <Text style={styles.contractSubLabel}>SALARY</Text>
                  <Text style={styles.contractMainValue}>
                    ${luchador.hiringCost?.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* BOTONES ACCION */}
              <View style={styles.btnRow}>
                {luchador.isDraft === 0 && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                    onPress={handleOpenRenew}
                  >
                    <Text style={styles.btnText}>RENEW DEAL</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: "rgba(239,68,68,0.2)",
                      borderWidth: 1,
                      borderColor: "#EF4444",
                    },
                  ]}
                  onPress={handleDelete}
                >
                  <Text style={[styles.btnText, { color: "#EF4444" }]}>
                    RELEASE
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* MODAL RENOVAR */}
      <Modal visible={renewModalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <BlurView intensity={95} tint="dark" style={styles.modalContent}>
            <Text style={styles.modalTitle}>Renew Contract</Text>
            <View style={{ gap: 15, marginVertical: 20 }}>
              <View>
                <Text style={styles.inputLabel}>Weeks to Add</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={renewWeeks}
                  onChangeText={setRenewWeeks}
                />
              </View>
              <View>
                <Text style={styles.inputLabel}>Bonus Cost ($)</Text>
                <TextInput
                  style={[styles.input, { color: "#10B981" }]}
                  keyboardType="numeric"
                  value={renewCost}
                  onChangeText={setRenewCost}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#333" }]}
                onPress={() => setRenewModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  { backgroundColor: accentColor, flex: 1 },
                ]}
                onPress={submitRenewal}
              >
                <Text style={styles.modalBtnText}>Sign Deal</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 50,
    position: "absolute",
    top: 50,
    width: "100%",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  // HERO SECTION
  heroContainer: {
    height: 500,
    width: width,
    position: "relative",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  bigBgText: {
    position: "absolute",
    top: 80,
    left: -20,
    fontSize: 120,
    fontWeight: "900",
    color: "rgba(255,255,255,0.03)",
    width: width + 100,
    zIndex: 1,
  },
  imageWrapper: {
    width: width,
    height: 500,
    position: "absolute",
    bottom: 0,
    zIndex: 2,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  infoOverlay: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10, // Asegura que el texto esté sobre la imagen y el gradiente
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleText: { color: "#FFF", fontWeight: "bold", fontSize: 10 },
  nameText: {
    color: "#FFF",
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 48,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    width: "80%",
  },
  classText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 5,
    textShadowColor: "rgba(0,0,0,1)",
    textShadowRadius: 5,
  },

  ovrContainer: {
    position: "absolute",
    right: 20,
    bottom: 30,
    zIndex: 10,
  },
  ovrBlur: {
    width: 70,
    height: 70,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  ovrNumber: { color: "#FFF", fontSize: 28, fontWeight: "900" },
  ovrLabel: { color: "#CBD5E1", fontSize: 10, fontWeight: "bold" },

  // STATS ROW
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 30,
  },
  statItem: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 24, fontWeight: "900", color: "#FFF" },
  statLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#94A3B8",
    marginTop: 2,
  },

  // CONTENT
  contentSection: { paddingHorizontal: 20 },
  sectionBlock: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 15,
  },

  activeTitlesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  activeTitleCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    width: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  activeTitleImg: { width: 80, height: 45, marginBottom: 5 },
  activeTitleName: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },

  trophyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
    paddingRight: 15,
    borderRadius: 12,
    gap: 10,
  },
  trophyImg: { width: 50, height: 30 },
  trophyName: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  trophyDetail: { color: "#64748B", fontSize: 10, fontWeight: "600" },
  emptyText: { color: "#64748B", fontStyle: "italic" },

  // CONTRACT BOX
  contractBox: {
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 50,
  },
  contractHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 15,
  },
  contractTitle: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  contractDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  contractSubLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
  },
  contractMainValue: { color: "#FFF", fontSize: 16, fontWeight: "bold" },

  btnRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#FFF", fontWeight: "900", fontSize: 12 },

  // MODAL
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
  },
  modalContent: { borderRadius: 24, padding: 24, overflow: "hidden" },
  modalTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  inputLabel: { color: "#94A3B8", marginBottom: 5, fontWeight: "bold" },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#FFF",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
  },
  modalBtn: { padding: 15, borderRadius: 12, alignItems: "center" },
  modalBtnText: { color: "#FFF", fontWeight: "bold" },
});
