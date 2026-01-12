import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Contexto y Operaciones
import { useGame } from "../../src/context/GameContext";
import {
  autoMapRosterImages,
  getAllLuchadores,
  getAllTitles,
  getGameState,
  getPlannedMatchesForCurrentWeek,
} from "../../src/database/operations";
import {
  DashboardStats,
  getDashboardData,
} from "../../src/services/DashboardService";

// Helper de imágenes

const { width } = Dimensions.get("window");

// --- CONFIGURACIÓN DEL CARRUSEL ---
const CARD_WIDTH = width - 40;
const CARD_MARGIN = 20;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN;

export default function HomeEvolution() {
  const router = useRouter();
  const { saveId, brandTheme, setSaveId } = useGame();

  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentCash, setCurrentCash] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [titlesMap, setTitlesMap] = useState<Record<number, string>>({});
  const [nextMatch, setNextMatch] = useState<any>(null);

  const [activeNewsIndex, setActiveNewsIndex] = useState(0);

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Volver al menú principal?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: () => {
          setSaveId(null);
        },
      },
    ]);
  };

  // --- 2. LÓGICA DEL BOTÓN MÁGICO (AUTO-FIX IMAGES) ---
  const handleAutoImageUpdate = () => {
    if (!saveId) return;
    Alert.alert(
      "🪄 Auto-Conectar Imágenes",
      "Esto actualizará la base de datos para que los nombres coincidan con GitHub (ej: 'Cody Rhodes' -> 'codyrhodes.webp'). ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "¡Conectar Todo!",
          onPress: () => {
            const count = autoMapRosterImages(saveId);
            loadData(); // Recargamos para ver los cambios si aplicara
            Alert.alert(
              "¡Éxito!",
              `Se actualizaron las rutas de ${count} luchadores.`
            );
          },
        },
      ]
    );
  };

  // --- HELPERS ---
  const getVersusText = (match: any) => {
    if (!match || !match.participants) return "Card Pending";
    if (Array.isArray(match.participants)) {
      return match.participants.map((p: any) => p.name).join(" vs ");
    }
    try {
      const parts = Object.values(match.participants).flat();
      // @ts-ignore
      return parts.map((p: any) => p.name).join(" vs ");
    } catch (e) {
      return "Tag Team Match";
    }
  };

  const getSmartNewsText = (text: string) => {
    let finalString = text.replace(/Title\s+(\d+)/gi, (match, id) => {
      const parsedId = parseInt(id);
      return titlesMap[parsedId] ? titlesMap[parsedId] : match;
    });
    if (finalString.includes("changed hands"))
      return finalString.replace("changed hands", "has a new champion");
    if (finalString.includes("retained"))
      return finalString.replace("retained", "retained the gold");
    return finalString;
  };

  const loadData = async () => {
    if (!saveId) return;
    setLoading(true);

    const state: any = getGameState(saveId);
    if (state) setCurrentCash(state.currentCash);

    const stats = await getDashboardData(saveId);
    setData(stats);

    const roster = getAllLuchadores(saveId);
    const expiring = roster.filter(
      (l) => l.weeksLeft <= 4 && l.isDraft === 0
    ).length;

    const titles = getAllTitles(saveId);
    const tMap: Record<number, string> = {};
    titles.forEach((t: any) => {
      tMap[t.id] = t.name;
    });
    setTitlesMap(tMap);
    setExpiringCount(expiring);

    const plannedMatches = getPlannedMatchesForCurrentWeek(saveId);
    if (plannedMatches && plannedMatches.length > 0) {
      setNextMatch(plannedMatches[plannedMatches.length - 1]);
    } else {
      setNextMatch(null);
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (saveId) loadData();
    }, [saveId])
  );

  const handleNewsScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SNAP_INTERVAL);
    setActiveNewsIndex(index);
  };

  const formatCash = (cash: number) => {
    if (cash >= 1000000) return `${(cash / 1000000).toFixed(1)}M`;
    if (cash >= 1000) return `${(cash / 1000).toFixed(0)}K`;
    return cash.toString();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.absoluteFill, { backgroundColor: "#000" }]} />
      <LinearGradient
        colors={[brandTheme || "#EF4444", "rgba(0,0,0,0.5)", "transparent"]}
        style={[styles.absoluteFill, { height: "45%", opacity: 0.4 }]}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor="#FFF"
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          {/* Botón Logout */}
          <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
            <Ionicons name="log-out-outline" size={22} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={{ alignItems: "center" }}>
            <Text style={styles.greetingLabel}>GM OFFICE</Text>
            <Text style={styles.brandName}>
              {data?.brandName?.toUpperCase() || "WWE"}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* 3. BOTÓN MÁGICO (FIX IMAGES) */}
            <TouchableOpacity
              onPress={handleAutoImageUpdate}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: "rgba(59, 130, 246, 0.2)",
                  borderColor: "#3B82F6",
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name="color-wand" size={20} color="#3B82F6" />
            </TouchableOpacity>

            {/* Botón Historial */}
            <TouchableOpacity
              onPress={() => router.push("../history")}
              style={[
                styles.iconBtn,
                {
                  borderColor: brandTheme,
                  borderWidth: 1,
                  backgroundColor: brandTheme + "20",
                },
              ]}
            >
              <Ionicons
                name="file-tray-full-outline"
                size={20}
                color={brandTheme || "#FFF"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* NEWS TICKER */}
        <View style={styles.newsSection}>
          <Text style={styles.sectionTitle}>Previous Week Report</Text>

          <ScrollView
            horizontal
            pagingEnabled={false}
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onScroll={handleNewsScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {data?.news && data.news.length > 0 ? (
              data.news.map((item, index) => {
                let accentColor = brandTheme || "#EF4444";
                if (item.type === "TITLE_CHANGE") accentColor = "#F59E0B";
                if (item.type === "STREAK") accentColor = "#FB923C";
                if (item.type === "FINANCE_BAD") accentColor = "#EF4444";

                return (
                  <View
                    key={index}
                    style={{ width: CARD_WIDTH, marginRight: CARD_MARGIN }}
                  >
                    <BlurView
                      intensity={25}
                      tint="dark"
                      style={[
                        styles.newsCard,
                        { borderColor: `${accentColor}33` },
                      ]}
                    >
                      <View style={styles.newsHeader}>
                        <View
                          style={[
                            styles.newsDot,
                            { backgroundColor: accentColor },
                          ]}
                        />
                        <Text
                          style={[styles.newsBadge, { color: accentColor }]}
                        >
                          {item.type?.replace("_", " ") || "REPORT"}
                        </Text>
                      </View>
                      <Text style={styles.newsTitle} numberOfLines={1}>
                        {getSmartNewsText(item.text)}
                      </Text>
                      <Text style={styles.newsSubtext} numberOfLines={2}>
                        {item.subtext}
                      </Text>
                      <Ionicons
                        name={
                          item.type === "TITLE_CHANGE" ? "trophy" : "newspaper"
                        }
                        size={80}
                        color={`${accentColor}10`}
                        style={styles.newsBgIcon}
                      />
                    </BlurView>
                  </View>
                );
              })
            ) : (
              <View style={{ width: CARD_WIDTH, marginRight: CARD_MARGIN }}>
                <BlurView intensity={15} tint="dark" style={styles.newsCard}>
                  <Text style={styles.newsSubtext}>
                    No major news reported yet.
                  </Text>
                </BlurView>
              </View>
            )}
          </ScrollView>

          {/* INDICATORS */}
          {data?.news && data.news.length > 1 && (
            <View style={styles.paginationContainer}>
              {data.news.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.paginationDot,
                    {
                      backgroundColor:
                        i === activeNewsIndex
                          ? brandTheme || "#FFF"
                          : "rgba(255,255,255,0.2)",
                      width: i === activeNewsIndex ? 20 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* BENTO GRID */}
        <View style={styles.bentoGrid}>
          <BlurView intensity={25} tint="light" style={styles.glassCardSmall}>
            <View style={styles.iconBox}>
              <Ionicons name="calendar" size={16} color="#FBBF24" />
            </View>
            <Text style={styles.cardTag}>CURRENT WEEK</Text>
            <Text style={styles.cardValue}>{data?.currentWeek || 1} / 52</Text>
          </BlurView>

          <BlurView intensity={25} tint="light" style={styles.glassCardSmall}>
            <View style={styles.iconBox}>
              <Ionicons name="cash" size={16} color="#4ADE80" />
            </View>
            <Text style={styles.cardTag}>BUDGET</Text>
            <Text style={styles.cardValue}>${formatCash(currentCash)}</Text>
          </BlurView>
        </View>

        {/* ALERTS */}
        {expiringCount > 0 ? (
          <BlurView intensity={40} tint="dark" style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="alert-circle" size={18} color="#F87171" />
              <Text style={styles.alertTitle}> URGENT ATTENTION</Text>
            </View>
            <Text style={styles.alertBody}>
              You have{" "}
              <Text style={styles.highlight}>{expiringCount} contracts</Text>{" "}
              expiring soon.
            </Text>
          </BlurView>
        ) : (
          <BlurView intensity={20} tint="dark" style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
              <Text style={[styles.alertTitle, { color: "#4ADE80" }]}>
                ROSTER STABLE
              </Text>
            </View>
            <Text style={styles.alertBody}>
              All contracts are secured. Good job, GM.
            </Text>
          </BlurView>
        )}

        {/* TONIGHT'S PREVIEW */}
        <Text style={styles.sectionTitle}>Tonight's Main Event</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/show")}
          style={styles.mainEventContainer}
        >
          <ImageBackground
            source={{
              // Usamos el helper también aquí por si acaso
              uri: nextMatch
                ? "https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=1000"
                : "https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=1000",
            }}
            style={styles.eventImg}
            imageStyle={{ borderRadius: 28 }}
          >
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.95)"]}
              style={styles.eventOverlay}
            >
              {nextMatch ? (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={styles.eventBadge}>MAIN EVENT</Text>
                    {nextMatch.isTitleMatch === 1 && (
                      <View
                        style={{
                          backgroundColor: "#F59E0B",
                          borderRadius: 4,
                          paddingHorizontal: 4,
                          paddingVertical: 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "900",
                            color: "black",
                          }}
                        >
                          TITLE
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.eventMatch} numberOfLines={2}>
                    {getVersusText(nextMatch)}
                  </Text>
                  <Text style={styles.eventSub}>
                    {nextMatch.matchType} • {nextMatch.stipulation || "Normal"}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.eventBadge, { color: "#94A3B8" }]}>
                    NEXT SHOW
                  </Text>
                  <Text style={styles.eventMatch}>Card Empty</Text>
                  <Text style={styles.eventSub}>
                    Tap to start booking Week {data?.currentWeek}
                  </Text>
                </>
              )}
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 150,
    marginTop: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 60,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  greetingLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  brandName: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },

  bentoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  glassCardSmall: {
    width: (width - 55) / 2,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTag: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardValue: { color: "#FFF", fontSize: 20, fontWeight: "900", marginTop: 4 },

  alertCard: {
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: 35,
    overflow: "hidden",
  },
  alertHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  alertTitle: {
    color: "#F87171",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  alertBody: { color: "#94A3B8", fontSize: 14, lineHeight: 20 },
  highlight: { color: "#FFF", fontWeight: "800" },

  sectionTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 15,
  },

  mainEventContainer: {
    height: 200,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  eventImg: { flex: 1, justifyContent: "flex-end" },
  eventOverlay: { padding: 20, paddingTop: 60 },
  eventBadge: {
    color: "#EF4444",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 4,
  },
  eventMatch: { color: "#FFF", fontSize: 24, fontWeight: "900" },
  eventSub: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },

  newsSection: { marginBottom: 30 },
  newsCard: {
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 140,
    overflow: "hidden",
    justifyContent: "center",
  },
  newsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  newsDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  newsBadge: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  newsTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  newsSubtext: { color: "#94A3B8", fontSize: 13, lineHeight: 18 },
  newsBgIcon: { position: "absolute", right: -10, bottom: -10 },

  // Pagination Styles
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
});
