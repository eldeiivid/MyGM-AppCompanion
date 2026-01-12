import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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

import { useGame } from "../../../src/context/GameContext";
import {
  getLuchadorById,
  updateLuchador,
} from "../../../src/database/operations";

const CLASSES = ["Cruiser", "Bruiser", "Giant", "Fighter", "Specialist"];

export default function EditLuchadorScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { brandTheme } = useGame();

  // --- ESTADOS ---
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Male");
  const [wClass, setWClass] = useState("Cruiser");
  const [altClass, setAltClass] = useState("None");
  const [crowd, setCrowd] = useState("Face");
  const [ringLevel, setRingLevel] = useState("1");
  const [mic, setMic] = useState("1");
  const [pop, setPop] = useState("50"); // Agregado para consistencia, aunque no estaba en tu edit original explícitamente

  // Contrato
  const [weeksLeft, setWeeksLeft] = useState("10");
  const [hiringCost, setHiringCost] = useState("0");
  const [isDraft, setIsDraft] = useState(false);

  const [manualWins, setManualWins] = useState("0");
  const [manualLosses, setManualLosses] = useState("0");

  useEffect(() => {
    if (id) {
      const data: any = getLuchadorById(Number(id));
      if (data) {
        setName(data.name);
        setGender(data.gender || "Male");
        setWClass(data.mainClass || "Cruiser");
        setAltClass(data.altClass || "None");
        setCrowd(data.crowd || "Face");
        setRingLevel(data.ringLevel?.toString() || "1");
        setMic(data.mic?.toString() || "1");
        setPop(data.popularity?.toString() || "50");
        setWeeksLeft(data.weeksLeft?.toString() || "25");
        setHiringCost(data.hiringCost?.toString() || "0");
        setIsDraft(data.isDraft === 1);
        setManualWins(data.normalWins?.toString() || "0");
        setManualLosses(data.normalLosses?.toString() || "0");
      }
    }
  }, [id]);

  const handleUpdate = () => {
    // REGLA DE NEGOCIO: Si el nivel bajó de 15, reseteamos la clase secundaria
    const finalAltClass = Number(ringLevel) >= 15 ? altClass : "None";

    const success = updateLuchador(
      Number(id),
      name,
      gender,
      wClass,
      finalAltClass,
      crowd,
      Number(ringLevel),
      Number(mic),
      Number(weeksLeft),
      Number(hiringCost),
      // "",  <--- BORRA ESTA LÍNEA (El string vacío causaba el error)
      isDraft ? 1 : 0,
      Number(manualWins),
      Number(manualLosses)
    );

    if (success) {
      Alert.alert("System Update", "Talent data updated successfully.");
      router.back();
    } else {
      Alert.alert("Error", "Could not update talent record.");
    }
  };

  // Helper para Pills
  const OptionPill = ({ label, selected, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.glassPill,
        selected && { backgroundColor: brandTheme, borderColor: brandTheme },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          selected && { color: "#FFF", fontWeight: "bold" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <View style={[styles.absoluteFill, { backgroundColor: "#000" }]} />
      <LinearGradient
        colors={[brandTheme || "#EF4444", "transparent"]}
        style={[styles.absoluteFill, { height: "40%", opacity: 0.3 }]}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>EDIT PROFILE</Text>
          <TouchableOpacity onPress={handleUpdate} style={styles.saveIconBtn}>
            <Ionicons name="checkmark" size={24} color={brandTheme} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Nombre */}
            <BlurView intensity={20} tint="dark" style={styles.glassCard}>
              <Text style={styles.label}>Ring Name</Text>
              <TextInput
                style={styles.mainInput}
                value={name}
                onChangeText={setName}
                placeholderTextColor="#64748B"
              />
            </BlurView>

            {/* Récord Manual */}
            <Text style={styles.sectionTitle}>MANUAL RECORD SYNC</Text>
            <View style={styles.row}>
              <BlurView intensity={20} tint="dark" style={styles.recordBox}>
                <Text style={[styles.label, { color: "#4ADE80" }]}>WINS</Text>
                <TextInput
                  style={[styles.recordInput, { color: "#4ADE80" }]}
                  value={manualWins}
                  onChangeText={setManualWins}
                  keyboardType="numeric"
                />
              </BlurView>
              <BlurView intensity={20} tint="dark" style={styles.recordBox}>
                <Text style={[styles.label, { color: "#F87171" }]}>LOSSES</Text>
                <TextInput
                  style={[styles.recordInput, { color: "#F87171" }]}
                  value={manualLosses}
                  onChangeText={setManualLosses}
                  keyboardType="numeric"
                />
              </BlurView>
            </View>

            {/* Atributos */}
            <Text style={styles.sectionTitle}>ATTRIBUTES</Text>
            <BlurView intensity={20} tint="dark" style={styles.glassCard}>
              <View style={styles.row}>
                <View style={styles.statBox}>
                  <Text style={styles.miniLabel}>Ring (1-25)</Text>
                  <TextInput
                    style={styles.statInput}
                    value={ringLevel}
                    onChangeText={setRingLevel}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.miniLabel}>Mic (1-5)</Text>
                  <TextInput
                    style={styles.statInput}
                    value={mic}
                    onChangeText={setMic}
                    keyboardType="numeric"
                    maxLength={1}
                  />
                </View>
                {/* Pop (Si tu DB lo soporta en update, sino es solo visual) */}
                <View style={styles.statBox}>
                  <Text style={styles.miniLabel}>Pop (0-100)</Text>
                  <TextInput
                    style={styles.statInput}
                    value={pop}
                    onChangeText={setPop}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>
            </BlurView>

            {/* Contrato */}
            <Text style={styles.sectionTitle}>CONTRACT DETAILS</Text>
            <BlurView
              intensity={20}
              tint="dark"
              style={[
                styles.glassCard,
                isDraft
                  ? { borderColor: brandTheme }
                  : { borderColor: "rgba(255,255,255,0.1)" },
              ]}
            >
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>
                    {isDraft ? "PERMANENT DRAFT" : "FREE AGENT"}
                  </Text>
                  <Text style={styles.switchSub}>
                    {isDraft ? "No expiration date." : "Renewals required."}
                  </Text>
                </View>
                <Switch
                  value={isDraft}
                  onValueChange={setIsDraft}
                  trackColor={{ false: "#333", true: brandTheme }}
                  thumbColor={"#FFF"}
                />
              </View>

              {!isDraft && (
                <View style={styles.rowInput}>
                  <Text style={styles.miniLabel}>Weeks Remaining</Text>
                  <TextInput
                    style={styles.input}
                    value={weeksLeft}
                    onChangeText={setWeeksLeft}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <View style={[styles.rowInput, { marginTop: 10 }]}>
                <Text style={styles.miniLabel}>Salary Cost ($)</Text>
                <TextInput
                  style={styles.input}
                  value={hiringCost}
                  onChangeText={setHiringCost}
                  keyboardType="numeric"
                />
              </View>
            </BlurView>

            {/* Características */}
            <Text style={styles.sectionTitle}>CHARACTERISTICS</Text>
            <BlurView intensity={20} tint="dark" style={styles.glassCard}>
              <Text style={styles.miniLabel}>Gender</Text>
              <View style={styles.pillContainer}>
                {["Male", "Female"].map((g) => (
                  <OptionPill
                    key={g}
                    label={g}
                    selected={gender === g}
                    onPress={() => setGender(g)}
                  />
                ))}
              </View>

              <Text style={[styles.miniLabel, { marginTop: 15 }]}>
                Alignment
              </Text>
              <View style={styles.pillContainer}>
                {["Face", "Heel"].map((c) => (
                  <OptionPill
                    key={c}
                    label={c}
                    selected={crowd === c}
                    onPress={() => setCrowd(c)}
                  />
                ))}
              </View>
            </BlurView>

            {/* Clases */}
            <Text style={styles.sectionTitle}>FIGHTING STYLE</Text>
            <BlurView intensity={20} tint="dark" style={styles.glassCard}>
              <Text style={styles.miniLabel}>Main Class</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 15 }}
              >
                {CLASSES.map((cls) => (
                  <TouchableOpacity
                    key={cls}
                    onPress={() => setWClass(cls)}
                    style={[
                      styles.classPill,
                      wClass === cls && {
                        backgroundColor: "rgba(255,255,255,0.2)",
                        borderColor: "#FFF",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.classText,
                        wClass === cls && { color: "#FFF" },
                      ]}
                    >
                      {cls}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Lógica Nivel 15 */}
              <Text style={styles.miniLabel}>Secondary Class (Lvl 15+)</Text>
              {Number(ringLevel) >= 15 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {["None", ...CLASSES].map((cls) => (
                    <TouchableOpacity
                      key={cls}
                      onPress={() => setAltClass(cls)}
                      style={[
                        styles.classPill,
                        altClass === cls && {
                          backgroundColor: brandTheme + "40",
                          borderColor: brandTheme,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.classText,
                          altClass === cls && { color: "#FFF" },
                        ]}
                      >
                        {cls}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.lockedBox}>
                  <Ionicons name="lock-closed" size={14} color="#64748B" />
                  <Text style={styles.lockedText}>
                    Unlocks at Ring Level 15
                  </Text>
                </View>
              )}
            </BlurView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: brandTheme }]}
              onPress={handleUpdate}
            >
              <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#000" },
  absoluteFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  saveIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 10,
    marginTop: 20,
    letterSpacing: 1,
    paddingLeft: 5,
  },

  glassCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },

  // INPUTS
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#CBD5E1",
    marginBottom: 5,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 6,
  },

  mainInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: 12,
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  // RECORD ROW
  row: { flexDirection: "row", gap: 15 },
  recordBox: {
    flex: 1,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  recordInput: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    width: "100%",
  },

  // STATS
  statBox: { flex: 1 },
  statInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  // CONTRACT
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  switchTitle: { fontWeight: "bold", fontSize: 14, color: "#FFF" },
  switchSub: { fontSize: 11, color: "#94A3B8" },
  rowInput: { marginTop: 5 },

  // PILLS
  pillContainer: { flexDirection: "row", gap: 8 },
  glassPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flex: 1,
    alignItems: "center",
  },
  pillText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },

  classPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginRight: 8,
    backgroundColor: "transparent",
  },
  classText: { color: "#94A3B8", fontWeight: "600", fontSize: 12 },

  // LOCKED
  lockedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    borderStyle: "dashed",
  },
  lockedText: { color: "#64748B", fontSize: 12, fontStyle: "italic" },

  saveBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 30,
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },
});
