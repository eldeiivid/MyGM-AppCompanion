import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
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
import { addLuchador } from "../../src/database/operations";

const CLASSES = ["Bruiser", "Cruiser", "Fighter", "Giant", "Specialist"];
const GENDERS = ["Male", "Female"];
const CROWDS = ["Face", "Heel"];

export default function NewLuchadorScreen() {
  const router = useRouter();
  const { saveId, brandTheme } = useGame();

  const [name, setName] = useState("");
  const [gender, setGender] = useState("Male");
  const [mainClass, setMainClass] = useState("Specialist");
  const [crowd, setCrowd] = useState("Face");

  const [ringLevel, setRingLevel] = useState("1");
  const [mic, setMic] = useState("1");
  const [pop, setPop] = useState("50");

  const [isDraft, setIsDraft] = useState(true);
  const [weeksLeft, setWeeksLeft] = useState("25");
  const [hiringCost, setHiringCost] = useState("100000");

  const handleSave = () => {
    if (!saveId) return;

    if (!name.trim()) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }

    const ring = parseInt(ringLevel) || 1;
    const micVal = parseInt(mic) || 1;
    const weeks = parseInt(weeksLeft) || 5;
    const cost = parseInt(hiringCost) || 0;
    const draftStatus = isDraft ? 1 : 0;

    const result = addLuchador(
      saveId,
      name,
      gender,
      mainClass,
      "None",
      crowd,
      ring,
      micVal,
      weeks,
      cost,
      "",
      draftStatus,
      0,
      0
    );

    if (result) {
      Alert.alert("Éxito", "Luchador contratado correctamente", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Error", "No se pudo guardar en la base de datos");
    }
  };

  // Helper para renderizar opciones (Pills Glass)
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
          <Text style={styles.headerTitle}>NEW SIGNING</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Nombre y Datos Básicos */}
          <BlurView intensity={20} tint="dark" style={styles.glassCard}>
            <Text style={styles.sectionTitle}>BASIC INFO</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ring Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: John Cena"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.pillContainer}>
                  {GENDERS.map((g) => (
                    <OptionPill
                      key={g}
                      label={g}
                      selected={gender === g}
                      onPress={() => setGender(g)}
                    />
                  ))}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Alignment</Text>
                <View style={styles.pillContainer}>
                  {CROWDS.map((c) => (
                    <OptionPill
                      key={c}
                      label={c}
                      selected={crowd === c}
                      onPress={() => setCrowd(c)}
                    />
                  ))}
                </View>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 15 }]}>
              Fighting Style
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 5 }}
            >
              {CLASSES.map((cls) => (
                <TouchableOpacity
                  key={cls}
                  onPress={() => setMainClass(cls)}
                  style={[
                    styles.classPill,
                    mainClass === cls && {
                      backgroundColor: "rgba(255,255,255,0.2)",
                      borderColor: "#FFF",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.classText,
                      mainClass === cls && { color: "#FFF" },
                    ]}
                  >
                    {cls}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </BlurView>

          {/* Estadísticas */}
          <BlurView intensity={20} tint="dark" style={styles.glassCard}>
            <Text style={styles.sectionTitle}>ATTRIBUTES</Text>
            <View style={styles.row}>
              <View style={styles.statBox}>
                <Text style={styles.label}>In-Ring (1-25)</Text>
                <TextInput
                  style={styles.statInput}
                  keyboardType="numeric"
                  value={ringLevel}
                  onChangeText={setRingLevel}
                  maxLength={2}
                />
              </View>
              <View style={styles.statBox}>
                <Text style={styles.label}>Mic (1-5)</Text>
                <TextInput
                  style={styles.statInput}
                  keyboardType="numeric"
                  value={mic}
                  onChangeText={setMic}
                  maxLength={1}
                />
              </View>
              <View style={styles.statBox}>
                <Text style={styles.label}>Pop (0-100)</Text>
                <TextInput
                  style={styles.statInput}
                  keyboardType="numeric"
                  value={pop}
                  onChangeText={setPop}
                  maxLength={3}
                />
              </View>
            </View>
          </BlurView>

          {/* Contrato */}
          <BlurView intensity={20} tint="dark" style={styles.glassCard}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 15,
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
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Duration (Weeks)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={weeksLeft}
                  onChangeText={setWeeksLeft}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Salary Cost ($)</Text>
              <TextInput
                style={[styles.input, { color: "#4ADE80" }]}
                keyboardType="numeric"
                value={hiringCost}
                onChangeText={setHiringCost}
              />
            </View>
          </BlurView>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: brandTheme }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>SIGN TALENT</Text>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color="#FFF"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </ScrollView>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 1,
  },

  glassCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 20,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    marginBottom: 15,
    letterSpacing: 1,
  },

  inputGroup: { marginBottom: 15 },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#CBD5E1",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  row: { flexDirection: "row", justifyContent: "space-between" },
  pillContainer: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

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

  statBox: { flex: 1, marginHorizontal: 4 },
  statInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  helperText: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 15,
    fontStyle: "italic",
  },

  saveBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    marginTop: 10,
  },
  saveBtnText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },
});
