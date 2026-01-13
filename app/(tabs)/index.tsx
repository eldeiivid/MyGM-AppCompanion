import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList, // Importante para el carrusel
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
import { getWrestlerImage } from "../../src/utils/imageHelper";

const { width } = Dimensions.get("window");

// --- URL BASE PARA TÍTULOS ---
const TITLES_REPO_URL =
  "https://raw.githubusercontent.com/eldeiivid/wwe-mymg-assets/main/titles/";

// --- CONFIGURACIÓN UI ---
const NEWS_CARD_WIDTH = width - 40;
const NEWS_SNAP = NEWS_CARD_WIDTH + 20;

// Configuración del Carrusel (Estilo Material)
const POSTER_WIDTH = width * 0.85; // Ocupa el 85% del ancho
const POSTER_HEIGHT = 420;
const POSTER_SPACING = 10; // Espacio entre cartas
// El intervalo de snap es el ancho de la carta + el margen derecho
const SNAP_INTERVAL = POSTER_WIDTH + POSTER_SPACING;

// --- GITHUB ASSETS CONFIG ---
const GITHUB_ASSETS_URL =
  "https://raw.githubusercontent.com/eldeiivid/wwe-mymg-assets/main/backgrounds/";

export default function HomeEvolution() {
  const router = useRouter();
  const { saveId, brandTheme, setSaveId } = useGame();

  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentCash, setCurrentCash] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [titlesMap, setTitlesMap] = useState<Record<number, any>>({});
  const [featuredMatches, setFeaturedMatches] = useState<any[]>([]);
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);

  // --- REF PARA EL AUTO-SCROLL ---
  const matchesListRef = useRef<FlatList>(null);
  const [matchIndex, setMatchIndex] = useState(0);

  // --- EFECTO DE AUTO-SCROLL ---
  useEffect(() => {
    let interval: any;

    if (featuredMatches.length > 1) {
      interval = setInterval(() => {
        let nextIndex = matchIndex + 1;
        if (nextIndex >= featuredMatches.length) {
          nextIndex = 0; // Volver al inicio
        }
        setMatchIndex(nextIndex);

        matchesListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
          viewPosition: 0.5, // Centrar
        });
      }, 4000); // Cambia cada 4 segundos
    }

    return () => clearInterval(interval);
  }, [matchIndex, featuredMatches]);

  // Detectar scroll manual para pausar/actualizar el índice
  const handleMatchScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SNAP_INTERVAL);
    setMatchIndex(index);
  };

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Volver al menú principal?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: () => setSaveId(null) },
    ]);
  };

  // --- AUTO-FIX IMAGES ---
  const handleAutoImageUpdate = () => {
    if (!saveId) return;
    Alert.alert(
      "🪄 Auto-Conectar Imágenes",
      "Esto actualizará la base de datos para que los nombres coincidan con GitHub. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "¡Conectar Todo!",
          onPress: () => {
            const count = autoMapRosterImages(saveId);
            loadData();
            Alert.alert("¡Éxito!", `Se actualizaron ${count} luchadores.`);
          },
        },
      ]
    );
  };

  // --- HELPER DE TÍTULO ---
  const getTitleImage = (titleId: number) => {
    const title = titlesMap[titleId];
    if (!title) return null;

    if (title.imageUri && title.imageUri !== "") {
      return `${TITLES_REPO_URL}${title.imageUri}`;
    }

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

  // --- HELPERS ---
  const getSmartNewsText = (text: string) => {
    let finalString = text.replace(/Title\s+(\d+)/gi, (match, id) => {
      const parsedId = parseInt(id);
      return titlesMap[parsedId] ? titlesMap[parsedId].name : match;
    });
    if (finalString.includes("changed hands"))
      return finalString.replace("changed hands", "has a new champion");
    if (finalString.includes("retained"))
      return finalString.replace("retained", "retained the gold");
    return finalString;
  };

  const getParticipantsArray = (match: any) => {
    try {
      const p =
        typeof match.participants === "string"
          ? JSON.parse(match.participants)
          : match.participants;
      const allTeamsValues = Object.values(p);
      const list: any[] = [];
      allTeamsValues.forEach((team: any) => {
        if (Array.isArray(team) && team.length > 0) {
          list.push(...team);
        }
      });
      return list;
    } catch (error) {
      return [];
    }
  };

  const formatMatchNames = (participants: any[], matchType: string) => {
    const pNames = participants.map((p) => p.name);

    if (matchType.includes("Tag") && pNames.length === 4) {
      const team1 = `${pNames[0]} & ${pNames[1]}`;
      const team2 = `${pNames[2]} & ${pNames[3]}`;
      return `${team1}\nVS\n${team2}`;
    }
    if (pNames.length === 4) {
      return `${pNames[0]} vs ${pNames[1]}\n${pNames[2]} vs ${pNames[3]}`;
    }
    if (pNames.length === 3) {
      return `${pNames[0]} vs ${pNames[1]}\nvs ${pNames[2]}`;
    }
    if (matchType.startsWith("Promo")) {
      if (pNames.length === 1) return pNames[0];
      return pNames.join(" & ");
    }
    return pNames.join(" vs ");
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
    const tMap: Record<number, any> = {};
    titles.forEach((t: any) => {
      tMap[t.id] = t;
    });
    setTitlesMap(tMap);
    setExpiringCount(expiring);

    // --- LÓGICA DE DESTACADOS ---
    const plannedMatches = getPlannedMatchesForCurrentWeek(saveId);
    let highlights: any[] = [];

    if (plannedMatches && plannedMatches.length > 0) {
      plannedMatches.forEach((match, index) => {
        let label = "";
        let isFeatured = false;
        let priority = 0;

        if (index === plannedMatches.length - 1) {
          label = "MAIN EVENT";
          isFeatured = true;
          priority = 1;
        } else if (index === 0) {
          label = "OPENER";
          isFeatured = true;
          priority = 2;
        } else if (match.isTitleMatch === 1) {
          label = "TITLE MATCH";
          isFeatured = true;
          priority = 1.5;
        } else if (
          match.stipulation &&
          match.stipulation !== "Normal" &&
          match.stipulation !== "None"
        ) {
          label = match.stipulation.toUpperCase();
          isFeatured = true;
          priority = 3;
        }

        if (isFeatured) {
          highlights.push({ ...match, label, priority });
        }
      });
      highlights.sort((a, b) => a.priority - b.priority);
    }
    setFeaturedMatches(highlights);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (saveId) loadData();
    }, [saveId])
  );

  const handleNewsScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / NEWS_SNAP);
    setActiveNewsIndex(index);
  };

  const formatCash = (cash: number) => {
    if (cash >= 1000000) return `${(cash / 1000000).toFixed(1)}M`;
    if (cash >= 1000) return `${(cash / 1000).toFixed(0)}K`;
    return cash.toString();
  };

  // --- RENDERIZADO DE IMÁGENES ---
  const renderFighters = (participants: any[], matchType: string) => {
    // 0. CASO PROMO
    if (matchType.startsWith("Promo")) {
      if (participants.length === 1) {
        return (
          <Image
            source={{ uri: getWrestlerImage(participants[0].imageUri) }}
            style={styles.fighterPromoSingle}
            contentFit="contain"
          />
        );
      }
      if (participants.length === 2) {
        return (
          <>
            <Image
              source={{ uri: getWrestlerImage(participants[0].imageUri) }}
              style={styles.fighter1v1Left}
              contentFit="contain"
            />
            <Image
              source={{ uri: getWrestlerImage(participants[1].imageUri) }}
              style={styles.fighter1v1Right}
              contentFit="contain"
            />
          </>
        );
      }
    }

    // 1. CASO 1 VS 1
    if (participants.length === 2) {
      return (
        <>
          <Image
            source={{ uri: getWrestlerImage(participants[0].imageUri) }}
            style={styles.fighter1v1Left}
            contentFit="contain"
          />
          <Image
            source={{ uri: getWrestlerImage(participants[1].imageUri) }}
            style={styles.fighter1v1Right}
            contentFit="contain"
          />
        </>
      );
    }

    // 2. CASO TAG TEAM
    if (matchType.includes("Tag") && participants.length === 4) {
      return (
        <>
          <Image
            source={{ uri: getWrestlerImage(participants[1].imageUri) }}
            style={[
              styles.fighterTag,
              {
                left: -30,
                zIndex: 1,
                opacity: 0.7,
                transform: [{ scale: 0.85 }],
              },
            ]}
            contentFit="contain"
          />
          <Image
            source={{ uri: getWrestlerImage(participants[0].imageUri) }}
            style={[styles.fighterTag, { left: 15, zIndex: 2 }]}
            contentFit="contain"
          />

          <Image
            source={{ uri: getWrestlerImage(participants[3].imageUri) }}
            style={[
              styles.fighterTag,
              {
                right: -30,
                zIndex: 1,
                opacity: 0.7,
                transform: [{ scale: 0.85 }],
              },
            ]}
            contentFit="contain"
          />
          <Image
            source={{ uri: getWrestlerImage(participants[2].imageUri) }}
            style={[styles.fighterTag, { right: 15, zIndex: 2 }]}
            contentFit="contain"
          />
        </>
      );
    }

    // 3. CASO MULTI-MAN
    if (participants.length > 2) {
      return (
        <View style={styles.multiManContainer}>
          {participants.map((p: any, i: number) => (
            <Image
              key={i}
              source={{ uri: getWrestlerImage(p.imageUri) }}
              style={[
                styles.fighterMultiStrip,
                { marginLeft: i === 0 ? 0 : -55, zIndex: i },
              ]}
              contentFit="contain"
            />
          ))}
        </View>
      );
    }

    return null;
  };

  // --- RENDER DE CADA TARJETA DEL CARRUSEL ---
  const renderPosterCardItem = ({ item: match, index }: any) => {
    const participants = getParticipantsArray(match);
    const isCrowded = participants.length > 2;
    const dynamicFontSize = isCrowded ? 16 : 22;
    const dynamicLineHeight = isCrowded ? 20 : 26;

    let cardColor = brandTheme || "#333";
    if (match.label === "MAIN EVENT") cardColor = "#EF4444";
    else if (match.isTitleMatch) cardColor = "#F59E0B";
    else if (match.label === "OPENER") cardColor = "#3B82F6";

    const brandName = data?.brandName ? data.brandName.toLowerCase() : "raw";
    const bgImageUri = `${GITHUB_ASSETS_URL}${brandName}-background.jpg`;

    const isPromo = match.matchType.startsWith("Promo");

    // OBTENER IMAGEN DEL TÍTULO
    const titleImageUri = match.isTitleMatch
      ? getTitleImage(match.titleId)
      : null;

    return (
      <TouchableOpacity
        key={match.id}
        activeOpacity={0.9}
        onPress={() => router.push("/show")}
        style={[styles.posterCard, { marginRight: POSTER_SPACING }]}
      >
        <Image
          source={{ uri: bgImageUri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          placeholder={{ blurhash: "L02?IVof00ay_Nof00ay00ay~qj[" }}
          transition={500}
        />

        <LinearGradient
          colors={[cardColor, "rgba(0,0,0,0.6)", "black"]}
          locations={[0, 0.4, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.85 }]}
        />

        {/* TÍTULO */}
        {match.isTitleMatch && titleImageUri ? (
          <Image
            source={{ uri: titleImageUri }}
            style={styles.posterTitleImage}
            contentFit="contain"
          />
        ) : null}

        {/* VS */}
        {!isPromo && <Text style={styles.posterVsBg}>VS</Text>}

        <View style={styles.posterFightersContainer}>
          {renderFighters(participants, match.matchType)}
        </View>

        <BlurView intensity={30} tint="dark" style={styles.posterInfoBlur}>
          <View style={[styles.posterBadge, { backgroundColor: cardColor }]}>
            <Text style={styles.posterBadgeText}>{match.label}</Text>
          </View>

          <Text
            style={[
              styles.posterNames,
              { fontSize: dynamicFontSize, lineHeight: dynamicLineHeight },
            ]}
            numberOfLines={4}
            adjustsFontSizeToFit={false}
          >
            {formatMatchNames(participants, match.matchType)}
          </Text>

          <Text style={styles.posterMeta}>
            {isPromo ? "SEGMENT" : match.matchType}
          </Text>
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.absoluteFill, { backgroundColor: "#000" }]} />
      <LinearGradient
        colors={[brandTheme || "#EF4444", "black"]}
        style={[styles.absoluteFill, { height: "60%", opacity: 0.2 }]}
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
        <View style={styles.header}>
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
            <TouchableOpacity
              onPress={handleAutoImageUpdate}
              style={[
                styles.iconBtn,
                { borderColor: "#3B82F6", borderWidth: 1 },
              ]}
            >
              <Ionicons name="color-wand" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("../history")}
              style={[
                styles.iconBtn,
                { borderColor: brandTheme, borderWidth: 1 },
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

        {/* --- 1. NEWS REPORT --- */}
        <View style={styles.newsSection}>
          <Text style={styles.sectionTitle}>Week Report</Text>
          <ScrollView
            horizontal
            pagingEnabled={false}
            snapToInterval={NEWS_SNAP}
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
                    style={{ width: NEWS_CARD_WIDTH, marginRight: 20 }}
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
              <View style={{ width: NEWS_CARD_WIDTH, marginRight: 20 }}>
                <BlurView intensity={15} tint="dark" style={styles.newsCard}>
                  <Text style={styles.newsSubtext}>
                    No major news reported yet.
                  </Text>
                </BlurView>
              </View>
            )}
          </ScrollView>
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

        {/* --- 2. BENTO STATS --- */}
        <View style={styles.bentoGrid}>
          <BlurView intensity={25} tint="light" style={styles.glassCardSmall}>
            <View style={styles.iconBox}>
              <Ionicons name="calendar" size={16} color="#FBBF24" />
            </View>
            <Text style={styles.cardTag}>WEEK</Text>
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

        {/* --- ALERTS --- */}
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

        {/* --- 3. TONIGHT'S CARD (CARRUSEL MEJORADO CON FLATLIST) --- */}
        <View style={{ marginBottom: 35 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Text style={styles.sectionTitle}>Tonight's Card</Text>
            {featuredMatches.length > 0 && (
              <Text
                style={{ color: "#64748B", fontSize: 12, fontWeight: "bold" }}
              >
                {featuredMatches.length} KEY MATCHES
              </Text>
            )}
          </View>

          {featuredMatches.length > 0 ? (
            <FlatList
              ref={matchesListRef}
              data={featuredMatches}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderPosterCardItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={SNAP_INTERVAL}
              decelerationRate="fast"
              snapToAlignment="start"
              // Padding interno para que el carrusel no toque el borde izquierdo de la pantalla
              contentContainerStyle={{ paddingLeft: 0, paddingRight: 20 }}
              // Detectar scroll manual
              onMomentumScrollEnd={handleMatchScroll}
              // Propiedades de optimización
              getItemLayout={(data, index) => ({
                length: SNAP_INTERVAL,
                offset: SNAP_INTERVAL * index,
                index,
              })}
            />
          ) : (
            <TouchableOpacity onPress={() => router.push("/planner")}>
              <BlurView
                intensity={15}
                tint="dark"
                style={[styles.emptyPoster, { borderColor: brandTheme }]}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={50}
                  color={brandTheme}
                />
                <Text
                  style={{
                    color: "white",
                    fontWeight: "bold",
                    marginTop: 10,
                    fontSize: 16,
                  }}
                >
                  Build The Card
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 12 }}>
                  Week {data?.currentWeek}
                </Text>
              </BlurView>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scrollContent: { padding: 20, paddingTop: 0, paddingBottom: 150 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  sectionTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // --- POSTER STYLES (NUEVO CARRUSEL) ---
  posterCard: {
    width: POSTER_WIDTH, // Ancho fijo para snapping correcto
    height: POSTER_HEIGHT,
    borderRadius: 24, // Bordes más suaves
    overflow: "hidden",
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  emptyPoster: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  posterVsBg: {
    position: "absolute",
    top: "20%",
    width: "100%",
    textAlign: "center",
    fontSize: 120,
    fontWeight: "900",
    color: "rgba(255,255,255,0.05)",
    zIndex: 0,
  },

  posterFightersContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    zIndex: 1,
    overflow: "hidden",
  },

  // Estilos de Imagenes 1v1
  fighter1v1Left: {
    width: "55%",
    height: "75%",
    position: "absolute",
    bottom: 0,
    left: -40,
    zIndex: 2,
  },
  fighter1v1Right: {
    width: "55%",
    height: "75%",
    position: "absolute",
    bottom: 0,
    right: -40,
    zIndex: 1,
  },

  // Estilo Promo Solo
  fighterPromoSingle: {
    width: "80%", // Mas ancho para que se vea bien solo
    height: "85%",
    position: "absolute",
    bottom: 0,
    zIndex: 2,
  },

  // Estilos Tag Team (Más chicos)
  fighterTag: { width: "55%", height: "70%", position: "absolute", bottom: 0 },

  // Estilos Multi-Man (Tira de imágenes pegadas)
  multiManContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: "100%",
    width: "100%",
    justifyContent: "center",
    paddingBottom: 0,
  },
  fighterMultiStrip: {
    width: "45%", // Ancho para que 4 ocupen el espacio solapados
    height: "75%",
    bottom: 0,
  },

  posterInfoBlur: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    paddingBottom: 25,
    zIndex: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  posterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  posterBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // IMAGEN DEL TÍTULO EN POSTER
  posterTitleImage: {
    position: "absolute",
    top: 15,
    alignSelf: "center",
    width: 80,
    height: 60,
    zIndex: 20,
  },

  // TEXTO CENTRADO (BASE)
  posterNames: {
    color: "white",
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    textAlign: "center",
  },
  posterMeta: {
    color: "#CBD5E1",
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },

  // BENTO GRID
  bentoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 35,
  },
  glassCardSmall: {
    width: (width - 55) / 2,
    padding: 20,
    borderRadius: 20,
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
    borderRadius: 20,
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

  newsSection: { marginBottom: 35 },
  newsCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 130,
    overflow: "hidden",
    justifyContent: "center",
  },
  newsHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  newsDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  newsBadge: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  newsTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  newsSubtext: { color: "#94A3B8", fontSize: 13, lineHeight: 18 },
  newsBgIcon: { position: "absolute", right: -10, bottom: -10 },

  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  paginationDot: { height: 6, borderRadius: 3 },
});
