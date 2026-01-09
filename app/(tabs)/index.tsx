import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useGame } from "../../src/context/GameContext";
import {
  getAllLuchadores,
  getAllMatches,
  getAllTitles,
  getGameState,
} from "../../src/database/operations";
import {
  DashboardStats,
  getDashboardData,
} from "../../src/services/DashboardService";

const { width } = Dimensions.get("window");

export default function DashboardScreen() {
  const router = useRouter();
  const { saveId, brandTheme, clearSession } = useGame();

  const [data, setData] = useState<DashboardStats | null>(null);
  const [fullMomentum, setFullMomentum] = useState<any[]>([]);
  const [titlesMap, setTitlesMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [currentCash, setCurrentCash] = useState(0);

  const [newsModalVisible, setNewsModalVisible] = useState(false);
  const [selectedNewsGroup, setSelectedNewsGroup] = useState<{
    title: string;
    data: any[];
    type: string;
    colors: [string, string, ...string[]];
    icon: any;
  } | null>(null);

  // REDIRECCIÓN CORREGIDA: Si se limpia la sesión, forzar salida al index raíz
  useEffect(() => {
    if (saveId === null) {
      // Forzamos la redirección a la raíz absoluta
      router.replace("../../index" as any);
      // O simplemente router.replace("/") pero asegurándonos de que ocurra tras el render
    }
  }, [saveId]);

  useFocusEffect(
    useCallback(() => {
      if (saveId) loadData();
    }, [saveId])
  );

  const loadData = async () => {
    if (!saveId) return;
    setLoading(true);

    const state: any = getGameState(saveId);
    if (state) setCurrentCash(state.currentCash);

    const titles = getAllTitles(saveId);
    const tMap: Record<number, string> = {};
    titles.forEach((t: any) => {
      tMap[t.id] = t.name;
    });
    setTitlesMap(tMap);

    const stats = await getDashboardData(saveId);

    const roster = getAllLuchadores(saveId);
    let calculatedStreaks: any[] = [];
    try {
      const allMatches = getAllMatches(saveId);
      const completedMatches = allMatches.filter(
        (m: any) => m.isCompleted === 1 || m.rating > 0
      );

      const streaks: Record<number, number> = {};
      roster.forEach((l: any) => (streaks[l.id] = 0));
      completedMatches.sort((a: any, b: any) => a.id - b.id);

      completedMatches.forEach((m: any) => {
        if (m.participants) {
          try {
            const pData = JSON.parse(m.participants);
            const winners = pData.winner || [];
            const losers = pData.losers || [];
            winners.forEach((id: number) => {
              const current = streaks[id] || 0;
              streaks[id] = current > 0 ? current + 1 : 1;
            });
            losers.forEach((id: number) => {
              const current = streaks[id] || 0;
              streaks[id] = current < 0 ? current - 1 : -1;
            });
          } catch (jsonError) {}
        } else if (m.winnerId) {
          const current = streaks[m.winnerId] || 0;
          streaks[m.winnerId] = current > 0 ? current + 1 : 1;
        }
      });

      calculatedStreaks = roster
        .map((l: any) => ({
          id: l.id,
          name: l.name,
          imageUri: l.imageUri,
          count: streaks[l.id] || 0,
        }))
        .filter((l: any) => Math.abs(l.count) >= 2);
      calculatedStreaks.sort((a, b) => Math.abs(b.count) - Math.abs(a.count));
    } catch (e) {
      console.log("Error calculando rachas:", e);
    }

    setFullMomentum(calculatedStreaks.slice(0, 10));
    setData(stats);
    setLoading(false);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveSlide(Math.round(index));
  };

  const getSmartNewsText = (text: string) => {
    let finalString = text.replace(/Title\s+(\d+)/gi, (match, id) => {
      const parsedId = parseInt(id);
      return titlesMap[parsedId] ? titlesMap[parsedId] : match;
    });
    if (finalString.includes("changed hands"))
      return finalString.replace("changed hands", "tiene nuevo dueño");
    if (finalString.includes("retained"))
      return finalString.replace("retained", "retuvo el título");
    return finalString;
  };

  const getTitleIdByName = (name: string) => {
    const titleIdString = Object.keys(titlesMap).find(
      (key) => titlesMap[parseInt(key)] === name
    );
    return titleIdString ? parseInt(titleIdString) : null;
  };

  const openGroupModal = (
    item: any,
    colors: [string, string, ...string[]],
    icon: any
  ) => {
    setSelectedNewsGroup({
      title: item.text,
      data: item.data,
      type: item.type,
      colors: colors,
      icon: icon,
    });
    setNewsModalVisible(true);
  };

  const lastFinance = data?.finances[data.finances.length - 1] || {
    income: 0,
    expenses: 0,
    profit: 0,
  };

  // FUNCIÓN PARA SALIR
  const handleExitGame = () => {
    Alert.alert(
      "Cerrar Oficina",
      "¿Deseas volver al menú principal de selección de partidas?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
          onPress: () => {
            clearSession(); // Al ejecutarse esto, el _layout.tsx detectará que saveId es null y te sacará solito.
          },
        },
      ]
    );
  };

  if (!data && loading)
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando Oficina...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      <SafeAreaView>
        <View style={styles.header}>
          <View>
            <Text style={[styles.dateLabel, { color: brandTheme }]}>
              {data?.brandName?.toUpperCase() || "SHOW"} • SEMANA{" "}
              {data?.currentWeek}
            </Text>
            <Text style={styles.greeting}>Hola, {data?.gmName || "GM"}</Text>
          </View>

          <TouchableOpacity style={styles.profileBtn} onPress={handleExitGame}>
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=${
                  data?.gmName?.replace(" ", "+") || "GM"
                }&background=${brandTheme.replace("#", "")}&color=fff`,
              }}
              style={styles.profileImg}
            />
            <View style={styles.exitBadge}>
              <Ionicons name="log-out" size={10} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor={brandTheme}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 1. NOTICIAS */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={width}
          >
            {data?.news.length === 0 ? (
              <View style={{ width: width, paddingHorizontal: 20 }}>
                <View style={[styles.newsCard, { backgroundColor: "#1E293B" }]}>
                  <View style={styles.newsContent}>
                    <Text style={styles.newsBadge}>ACTUALIDAD</Text>
                    <Text style={styles.newsTitle}>Sin Novedades</Text>
                    <Text style={styles.newsSub}>
                      Todo tranquilo en el vestuario.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              data?.news.map((item, index) => {
                const isTitleChange = item.type === "TITLE_CHANGE";
                const isTitleRetain = item.type === "TITLE_RETAIN";
                const isStreak = item.type === "STREAK";
                const isBadStreak = item.type === "BAD_STREAK";
                const isFinanceBad = item.type === "FINANCE_BAD";
                const isStreakBroken = item.type === "STREAK_BROKEN";
                const isUpset = item.type === "UPSET";
                const isGroupStreak = item.type === "GROUP_STREAK";
                const isGroupBadStreak = item.type === "GROUP_BAD_STREAK";

                let gradientColors: [string, string, ...string[]] = [
                  "#1E293B",
                  "#334155",
                ];
                let iconName: any = "newspaper";
                let badgeText = "REPORTE";

                if (isTitleChange) {
                  gradientColors = ["#B45309", "#F59E0B"];
                  iconName = "trophy";
                  badgeText = "NUEVO CAMPEÓN";
                } else if (isTitleRetain) {
                  gradientColors = ["#1E293B", "#334155"];
                  iconName = "shield-checkmark";
                  badgeText = "DEFENSA EXITOSA";
                } else if (isStreakBroken) {
                  gradientColors = ["#047857", "#10B981"];
                  iconName = "fitness";
                  badgeText = "¡REDENCIÓN!";
                } else if (isUpset) {
                  gradientColors = ["#7C3AED", "#A78BFA"];
                  iconName = "flash";
                  badgeText = "SORPRESA";
                } else if (isBadStreak || isGroupBadStreak) {
                  gradientColors = ["#1F3A93", "#4B77BE"];
                  iconName = "snow";
                  badgeText = "CRISIS";
                } else if (isFinanceBad) {
                  gradientColors = ["#B91C1C", "#EF4444"];
                  iconName = "alert-circle";
                  badgeText = "FINANZAS";
                } else if (isStreak || isGroupStreak) {
                  gradientColors = ["#C2410C", "#FB923C"];
                  iconName = "flame";
                  badgeText = "IMPARABLE";
                }

                return (
                  <View
                    key={index}
                    style={{ width: width, paddingHorizontal: 20 }}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      style={styles.newsCard}
                    >
                      <View style={styles.newsContent}>
                        <View style={styles.badgeBlur}>
                          <Text style={styles.newsBadge}>{badgeText}</Text>
                        </View>
                        <Text style={styles.newsTitle} numberOfLines={2}>
                          {getSmartNewsText(item.text)}
                        </Text>
                        <Text style={styles.newsSub} numberOfLines={3}>
                          {item.subtext}
                        </Text>
                        {(isGroupStreak || isGroupBadStreak) && (
                          <TouchableOpacity
                            style={styles.viewMoreBtn}
                            onPress={() =>
                              openGroupModal(item, gradientColors, iconName)
                            }
                          >
                            <Text style={styles.viewMoreText}>
                              Ver Detalles
                            </Text>
                            <Ionicons
                              name="arrow-forward"
                              size={14}
                              color="white"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Ionicons
                        name={iconName}
                        size={120}
                        color="rgba(255,255,255,0.1)"
                        style={styles.bgIcon}
                      />
                    </LinearGradient>
                  </View>
                );
              })
            )}
          </ScrollView>
          <View style={styles.pagination}>
            {data?.news.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeSlide && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* 2. FINANZAS Y ACCIONES */}
        <View style={styles.sectionContainer}>
          <View style={styles.bentoRow}>
            <View style={[styles.bentoCard, styles.financeCard]}>
              <View style={styles.financeHeader}>
                <Ionicons name="wallet" size={20} color="#64748B" />
                <Text style={styles.cardLabel}>FINANZAS</Text>
              </View>
              <Text
                style={[
                  styles.balanceAmount,
                  { color: lastFinance.profit >= 0 ? "#10B981" : "#EF4444" },
                ]}
              >
                ${currentCash.toLocaleString()}
              </Text>
              <View style={styles.financeGraph}>
                {data?.finances.map((f, i) => (
                  <View key={i} style={styles.graphBarContainer}>
                    <View
                      style={[
                        styles.graphBar,
                        {
                          height: `${Math.min(
                            (Math.abs(f.profit) / 2000) * 100,
                            100
                          )}%`,
                          backgroundColor:
                            f.profit >= 0 ? "#10B981" : "#EF4444",
                          opacity: i === data.finances.length - 1 ? 1 : 0.4,
                        },
                      ]}
                    />
                  </View>
                ))}
                {data?.finances.length === 0 && (
                  <Text style={{ fontSize: 10, color: "#ccc" }}>Sin datos</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.bentoCard, styles.actionCard]}
              activeOpacity={0.7}
              onPress={() => router.push("/show")}
            >
              <LinearGradient
                colors={[brandTheme, "#1E293B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGradient}
              >
                <Ionicons name="calendar" size={32} color="white" />
                <Text style={styles.actionText}>Planear{"\n"}Show</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. MOMENTUM */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Momentum</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/roster")}>
              <Text style={[styles.linkText, { color: brandTheme }]}>
                Ver Roster ›
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {fullMomentum.map((luchador) => (
              <View key={luchador.id} style={styles.streakCard}>
                <View style={styles.streakHeader}>
                  {luchador.imageUri ? (
                    <Image
                      source={{ uri: luchador.imageUri }}
                      style={styles.streakAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.streakPlaceholder,
                        {
                          backgroundColor:
                            luchador.count > 0 ? "#F59E0B" : "#3B82F6",
                        },
                      ]}
                    >
                      <Text style={{ color: "white", fontWeight: "bold" }}>
                        {luchador.name.charAt(0)}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.streakIcon,
                      {
                        backgroundColor:
                          luchador.count > 0 ? "#F59E0B" : "#3B82F6",
                      },
                    ]}
                  >
                    <Ionicons
                      name={luchador.count > 0 ? "flame" : "snow"}
                      size={12}
                      color="white"
                    />
                  </View>
                </View>
                <Text style={styles.streakName} numberOfLines={1}>
                  {luchador.name}
                </Text>
                <Text
                  style={[
                    styles.streakCount,
                    { color: luchador.count > 0 ? "#F59E0B" : "#3B82F6" },
                  ]}
                >
                  {Math.abs(luchador.count)}{" "}
                  {luchador.count > 0 ? "Victorias" : "Derrotas"}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 4. CAMPEONES */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sala de Campeones</Text>
            <TouchableOpacity onPress={() => router.push("/titles/manage")}>
              <Text style={[styles.linkText, { color: brandTheme }]}>
                Ver Todos ›
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.reignList}>
            {data?.milestones.map((milestone, index) => {
              const titleId = getTitleIdByName(milestone.title);
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.reignRow}
                  onPress={() => {
                    if (titleId) router.push(`/titles/${titleId}`);
                    else router.push("/titles/manage");
                  }}
                >
                  <View
                    style={[
                      styles.iconBox,
                      {
                        backgroundColor:
                          milestone.status === "golden" ? "#FFFBEB" : "#F1F5F9",
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 18 }}>
                      {milestone.status === "golden" ? "👑" : "🏆"}
                    </Text>
                  </View>
                  <View style={styles.reignInfo}>
                    <Text style={styles.reignTitle}>{milestone.title}</Text>
                    <Text style={styles.reignChamp}>{milestone.champion}</Text>
                  </View>
                  <View style={styles.reignStats}>
                    <Text style={styles.daysNum}>{milestone.days}</Text>
                    <Text style={styles.daysLabel}>DÍAS</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL */}
      <Modal
        visible={newsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNewsModalVisible(false)}
      >
        {selectedNewsGroup && (
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={selectedNewsGroup.colors}
              style={styles.modalGradientHeader}
            >
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalHeaderTitle}>
                  {selectedNewsGroup.title}
                </Text>
                <TouchableOpacity
                  onPress={() => setNewsModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              <Ionicons
                name={selectedNewsGroup.icon}
                size={140}
                color="rgba(255,255,255,0.15)"
                style={styles.modalBgIcon}
              />
            </LinearGradient>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {selectedNewsGroup.data.map((l, index) => (
                <View key={index} style={styles.modalItem}>
                  <View style={styles.modalItemLeft}>
                    {l.imageUri ? (
                      <Image
                        source={{ uri: l.imageUri }}
                        style={styles.modalAvatar}
                      />
                    ) : (
                      <View style={styles.modalPlaceholder}>
                        <Text style={styles.modalInitial}>
                          {l.name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.modalName}>{l.name}</Text>
                      <Text style={styles.modalSubName}>
                        {l.count > 0 ? "Racha ganadora" : "Racha perdedora"}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.modalBadge,
                      { backgroundColor: l.count > 0 ? "#FFF7ED" : "#EFF6FF" },
                    ]}
                  >
                    <Ionicons
                      name={l.count > 0 ? "flame" : "snow"}
                      size={14}
                      color={l.count > 0 ? "#F59E0B" : "#3B82F6"}
                    />
                    <Text
                      style={[
                        styles.modalBadgeText,
                        { color: l.count > 0 ? "#B45309" : "#1E40AF" },
                      ]}
                    >
                      {Math.abs(l.count)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  loadingText: { marginTop: 10, color: "#64748B", fontWeight: "600" },
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  greeting: { fontSize: 28, fontWeight: "800", color: "#1E293B" },
  profileBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    position: "relative",
  },
  profileImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "white",
  },
  exitBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  carouselContainer: { marginBottom: 25 },
  newsCard: {
    height: 180,
    borderRadius: 24,
    padding: 24,
    justifyContent: "center",
    overflow: "hidden",
  },
  newsContent: { zIndex: 2 },
  badgeBlur: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  newsBadge: {
    color: "white",
    fontWeight: "bold",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  newsTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    lineHeight: 28,
  },
  newsSub: { color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 20 },
  bgIcon: {
    position: "absolute",
    right: -20,
    bottom: -20,
    transform: [{ rotate: "-15deg" }],
  },
  viewMoreBtn: {
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  viewMoreText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
    marginRight: 5,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#CBD5E1" },
  dotActive: { width: 20, backgroundColor: "#3B82F6" },
  sectionContainer: { marginBottom: 30 },
  bentoRow: { flexDirection: "row", paddingHorizontal: 20, gap: 15 },
  bentoCard: {
    borderRadius: 20,
    backgroundColor: "white",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  financeCard: {
    flex: 2,
    height: 160,
    padding: 16,
    justifyContent: "space-between",
  },
  financeHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8" },
  balanceAmount: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  financeGraph: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 50,
    gap: 8,
    marginTop: 10,
  },
  graphBarContainer: { flex: 1, height: "100%", justifyContent: "flex-end" },
  graphBar: { width: "100%", borderRadius: 4 },
  actionCard: { flex: 1, height: 160 },
  actionGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  actionText: {
    color: "white",
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  linkText: { color: "#3B82F6", fontWeight: "600", fontSize: 14 },
  horizontalScroll: { paddingHorizontal: 20 },
  streakCard: { marginRight: 15, width: 100, alignItems: "center" },
  streakHeader: {
    marginBottom: 8,
    position: "relative",
    width: 60,
    height: 60,
  },
  streakAvatar: { width: 60, height: 60, borderRadius: 30 },
  streakPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  streakIcon: {
    position: "absolute",
    bottom: -2,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F5F7FA",
  },
  streakName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 2,
    textAlign: "center",
  },
  streakCount: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  reignList: {
    marginHorizontal: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 5,
  },
  reignRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  reignInfo: { flex: 1 },
  reignTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  reignChamp: { fontSize: 12, color: "#64748B", marginTop: 2 },
  reignStats: { alignItems: "center", marginRight: 10 },
  daysNum: { fontSize: 14, fontWeight: "800", color: "#1E293B" },
  daysLabel: { fontSize: 8, fontWeight: "700", color: "#94A3B8" },
  modalContainer: { flex: 1, backgroundColor: "#F5F7FA" },
  modalGradientHeader: {
    padding: 20,
    paddingTop: 30,
    height: 180,
    justifyContent: "flex-start",
    position: "relative",
    overflow: "hidden",
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  modalHeaderTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "white",
    letterSpacing: -0.5,
  },
  modalCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 20,
  },
  modalBgIcon: {
    position: "absolute",
    right: -30,
    bottom: -30,
    transform: [{ rotate: "-15deg" }],
    zIndex: 1,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalItemLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  modalAvatar: { width: 48, height: 48, borderRadius: 24 },
  modalPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalInitial: { fontWeight: "bold", color: "#94A3B8", fontSize: 18 },
  modalName: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  modalSubName: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  modalBadgeText: { fontSize: 13, fontWeight: "800" },
});
