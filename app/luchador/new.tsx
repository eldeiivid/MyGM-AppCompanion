import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGame } from "../../src/context/GameContext";
import { MASTER_ROSTER } from "../../src/data/realWorldRoster"; // Tu lista maestra
import { addLuchador, getAllLuchadores } from "../../src/database/operations";
import { getWrestlerImage } from "../../src/utils/imageHelper";

const { width } = Dimensions.get("window");

const CLASS_OPTIONS = ["Bruiser", "Cruiser", "Fighter", "Giant", "Specialist"];
const GENDER_OPTIONS = ["Male", "Female"];
const CROWD_OPTIONS = ["Face", "Heel"];

export default function NewLuchadorScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { saveId, brandTheme } = useGame();

  // Form State
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Male");
  const [mainClass, setMainClass] = useState("Specialist");
  const [altClass, setAltClass] = useState("None"); // Segunda clase
  const [crowd, setCrowd] = useState("Face");

  // Stats (In-Ring Max 25, Mic 1-5)
  const [ringLevel, setRingLevel] = useState("1");
  const [mic, setMic] = useState("1");

  // Contract State
  const [isDraft, setIsDraft] = useState(true); // Permanent Roster
  const [weeksLeft, setWeeksLeft] = useState("25");
  const [hiringCost, setHiringCost] = useState("100000");

  const [imageUri, setImageUri] = useState("");

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // --- REGLA: Si In-Ring < 15, AltClass se resetea a "None" ---
  useEffect(() => {
    const lvl = parseInt(ringLevel) || 0;
    if (lvl < 15 && altClass !== "None") {
      setAltClass("None");
    }
  }, [ringLevel]);

  // --- LOGICA AUTOCOMPLETE ---
  const handleNameChange = (text: string) => {
    setName(text);
    if (text.length > 1) {
      const filtered = MASTER_ROSTER.filter((w) =>
        w.name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (wrestler: any) => {
    // Solo llenamos Nombre, Género e Imagen (datos fijos)
    setName(wrestler.name);
    setGender(wrestler.gender);
    setImageUri(wrestler.file);

    // Ocultamos sugerencias
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSave = () => {
    if (!name.trim()) return Alert.alert("Error", "Name is required");
    if (!saveId) return;

    // Verificar duplicado
    const roster = getAllLuchadores(saveId);
    const exists = roster.some(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      return Alert.alert("Error", "This superstar is already on your roster!");
    }

    const rLvl = parseInt(ringLevel) || 1;
    const rMic = parseInt(mic) || 1;
    const rCost = parseInt(hiringCost) || 0;
    const rWeeks = parseInt(weeksLeft) || 10;
    const draftStatus = isDraft ? 1 : 0;

    // Validación In-Ring Level Max 25
    if (rLvl > 25) {
      return Alert.alert("Stats Error", "In-Ring Level cannot exceed 25.");
    }

    // Validación Mic Max 5
    if (rMic > 5) {
      return Alert.alert("Stats Error", "Mic Skill cannot exceed 5.");
    }

    // Si no puso imagen manual, intentamos generar una por defecto
    const finalImage =
      imageUri || name.toLowerCase().replace(/\s+/g, "") + ".webp";

    addLuchador(
      saveId,
      name,
      gender,
      mainClass,
      altClass, // Guardamos la segunda clase si aplica
      crowd,
      rLvl,
      rMic,
      rWeeks,
      rCost,
      finalImage,
      draftStatus,
      0,
      0
    );

    router.back();
  };

  // RENDER HELPERS
  const OptionPill = ({ label, selected, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        selected && { backgroundColor: brandTheme, borderColor: brandTheme },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          selected && { color: "#FFF", fontWeight: "900" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.absoluteFill, { backgroundColor: "#000" }]} />
      <LinearGradient
        colors={["#1E293B", "#000"]}
        style={styles.absoluteFill}
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
          <Text style={styles.headerTitle}>New Signing</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>SIGN</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* AVATAR PREVIEW */}
            <View style={styles.avatarSection}>
              <View
                style={[
                  styles.avatarCircle,
                  { borderColor: crowd === "Face" ? "#3B82F6" : "#EF4444" },
                ]}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: getWrestlerImage(imageUri) }}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 40, color: "#333" }}>
                    {name[0] || "?"}
                  </Text>
                )}
              </View>
              <Text style={styles.previewName}>{name || "SUPERSTAR NAME"}</Text>
            </View>

            {/* NAME INPUT & AUTOCOMPLETE */}
            <View style={{ zIndex: 100 }}>
              <Text style={styles.label}>NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name..."
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={handleNameChange}
              />
              {/* SUGGESTIONS DROPDOWN */}
              {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {suggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Image
                          source={{ uri: getWrestlerImage(item.file) }}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 15,
                            backgroundColor: "#333",
                          }}
                          contentFit="cover"
                        />
                        <Text style={styles.suggestionText}>{item.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* GENDER & CROWD */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>GENDER</Text>
                <View style={styles.pillContainer}>
                  {GENDER_OPTIONS.map((opt) => (
                    <OptionPill
                      key={opt}
                      label={opt}
                      selected={gender === opt}
                      onPress={() => setGender(opt)}
                    />
                  ))}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>ALIGNMENT</Text>
                <View style={styles.pillContainer}>
                  {CROWD_OPTIONS.map((opt) => (
                    <OptionPill
                      key={opt}
                      label={opt}
                      selected={crowd === opt}
                      onPress={() => setCrowd(opt)}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* MAIN CLASS */}
            <Text style={styles.label}>PRIMARY STYLE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 10 }}
            >
              {CLASS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setMainClass(opt)}
                  style={[
                    styles.bigPill,
                    mainClass === opt && {
                      backgroundColor: "#334155",
                      borderColor: brandTheme,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bigPillText,
                      mainClass === opt && { color: brandTheme },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* SECONDARY CLASS (Solo si Level >= 15) */}
            {parseInt(ringLevel) >= 15 && (
              <View>
                <Text style={[styles.label, { color: "#F59E0B" }]}>
                  SECONDARY STYLE (UNLOCKED)
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }}
                >
                  <TouchableOpacity
                    onPress={() => setAltClass("None")}
                    style={[
                      styles.bigPill,
                      altClass === "None" && {
                        backgroundColor: "#333",
                        borderColor: "#666",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bigPillText,
                        altClass === "None" && { color: "#999" },
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {CLASS_OPTIONS.filter((c) => c !== mainClass).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setAltClass(opt)}
                      style={[
                        styles.bigPill,
                        altClass === opt && {
                          backgroundColor: "#451a03",
                          borderColor: "#F59E0B",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bigPillText,
                          altClass === opt && { color: "#F59E0B" },
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* STATS (IN-RING & MIC) */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>IN-RING LEVEL (1-25)</Text>
                <TextInput
                  style={[
                    styles.statInput,
                    parseInt(ringLevel) >= 15 && {
                      borderColor: "#F59E0B",
                      color: "#F59E0B",
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#64748B"
                  value={ringLevel}
                  onChangeText={setRingLevel}
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>MIC SKILL (1-5)</Text>
                <TextInput
                  style={styles.statInput}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#64748B"
                  value={mic}
                  onChangeText={setMic}
                  maxLength={1}
                />
              </View>
            </View>

            {/* CONTRACT DETAILS */}
            <BlurView intensity={20} tint="dark" style={styles.glassCard}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Text style={styles.sectionTitle}>CONTRACT DETAILS</Text>
                <Switch
                  value={isDraft}
                  onValueChange={setIsDraft}
                  trackColor={{ false: "#333", true: brandTheme }}
                  thumbColor={"#FFF"}
                />
              </View>

              <Text style={styles.helperText}>
                {isDraft
                  ? "PERMANENT ROSTER (No Expiration)"
                  : "FREE AGENT (Temporary Contract)"}
              </Text>

              {!isDraft && (
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.label}>DURATION (WEEKS)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={weeksLeft}
                    onChangeText={setWeeksLeft}
                  />
                </View>
              )}

              <Text style={styles.label}>SALARY COST ($)</Text>
              <TextInput
                style={[styles.input, { color: "#4ADE80", fontWeight: "bold" }]}
                keyboardType="numeric"
                value={hiringCost}
                onChangeText={setHiringCost}
              />
            </BlurView>

            <Text style={styles.label}>IMAGE FILENAME (Auto-filled)</Text>
            <TextInput
              style={styles.input}
              placeholder="filename.webp"
              placeholderTextColor="#64748B"
              value={imageUri}
              onChangeText={setImageUri}
              autoCapitalize="none"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
  },
  saveBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveText: { color: "#FFF", fontWeight: "900" },

  scrollContent: { padding: 20, paddingBottom: 50 },

  avatarSection: { alignItems: "center", marginBottom: 25 },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#111",
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 10,
  },
  avatarImg: { width: "100%", height: "100%" },
  previewName: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },

  label: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 15,
    paddingLeft: 5,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 15,
    color: "#FFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  // SUGGESTIONS
  suggestionsBox: {
    position: "absolute",
    top: 85,
    left: 0,
    right: 0,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#475569",
    maxHeight: 250,
    zIndex: 999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  suggestionText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },

  row: { flexDirection: "row" },
  pillContainer: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  pillText: { color: "#94A3B8", fontWeight: "600", fontSize: 12 },

  bigPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  bigPillText: { color: "#94A3B8", fontWeight: "bold" },

  statInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 15,
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  glassCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginTop: 20,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 15,
    letterSpacing: 1,
  },
  helperText: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 15,
    fontStyle: "italic",
  },
});
