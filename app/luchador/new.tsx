import { Ionicons } from "@expo/vector-icons";
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
import { ManagementHeader } from "../../src/components/ManagementHeader";
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

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />

      <ManagementHeader />

      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Nuevo Fichaje</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 20 }}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Nombre del Luchador</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: John Cena"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Género</Text>
              <View style={styles.pillsContainer}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.pill,
                      gender === g && {
                        backgroundColor: brandTheme,
                        borderColor: brandTheme,
                      },
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        gender === g && styles.pillTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Reacción</Text>
              <View style={styles.pillsContainer}>
                {CROWDS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.pill,
                      crowd === c && {
                        backgroundColor: brandTheme,
                        borderColor: brandTheme,
                      },
                    ]}
                    onPress={() => setCrowd(c)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        crowd === c && styles.pillTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>Clase Principal</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 15 }}
          >
            {CLASSES.map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[
                  styles.pill,
                  mainClass === cls && {
                    backgroundColor: brandTheme,
                    borderColor: brandTheme,
                  },
                ]}
                onPress={() => setMainClass(cls)}
              >
                <Text
                  style={[
                    styles.pillText,
                    mainClass === cls && styles.pillTextActive,
                  ]}
                >
                  {cls}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Estadísticas</Text>
          <View style={styles.row}>
            <View style={styles.statInput}>
              <Text style={styles.label}>Ring Lvl (1-20)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={ringLevel}
                onChangeText={setRingLevel}
                maxLength={2}
              />
            </View>
            <View style={styles.statInput}>
              <Text style={styles.label}>Mic Lvl (1-20)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={mic}
                onChangeText={setMic}
                maxLength={2}
              />
            </View>
            <View style={styles.statInput}>
              <Text style={styles.label}>Pop (0-100)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={pop}
                onChangeText={setPop}
                maxLength={3}
              />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.section,
            {
              borderLeftWidth: 5,
              borderLeftColor: isDraft ? brandTheme : "#9CA3AF",
            },
          ]}
        >
          <Text style={styles.sectionHeader}>Tipo de Contrato</Text>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>
                {isDraft
                  ? "♾️ DRAFT (Permanente)"
                  : "📅 AGENTE LIBRE (Temporal)"}
              </Text>
              <Text style={styles.switchSub}>
                {isDraft
                  ? "Pertenece a la plantilla fija. No expira."
                  : "Contrato temporal que debe renovarse."}
              </Text>
            </View>
            <Switch
              value={isDraft}
              onValueChange={setIsDraft}
              trackColor={{ false: "#E0E0E0", true: brandTheme }}
              thumbColor={"#fff"}
            />
          </View>

          {!isDraft && (
            <View style={{ marginTop: 15 }}>
              <Text style={styles.label}>Duración (Semanas)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={weeksLeft}
                onChangeText={setWeeksLeft}
              />
            </View>
          )}

          <View style={{ marginTop: 15 }}>
            <Text style={styles.label}>Costo de Fichaje ($)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={hiringCost}
              onChangeText={setHiringCost}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: brandTheme }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>CONTRATAR LUCHADOR</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F5F7FA" },
  container: { flex: 1 },

  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#F5F7FA",
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
  navTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B" },

  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20,
    color: "#1C1C1E",
    marginTop: 10,
  },

  section: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },

  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#8E8E93",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    fontWeight: "500",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },

  pillsContainer: { flexDirection: "row", gap: 8, marginBottom: 15 },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "transparent",
  },
  pillText: { fontSize: 12, color: "#666", fontWeight: "600" },
  pillTextActive: { color: "white" },

  statInput: { flex: 1, marginHorizontal: 4 },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  switchSub: { fontSize: 11, color: "#888", maxWidth: 220, marginTop: 2 },

  saveBtn: {
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
