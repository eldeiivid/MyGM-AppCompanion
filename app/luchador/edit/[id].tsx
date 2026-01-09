import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  getLuchadorById,
  updateLuchador,
} from "../../../src/database/operations";
import { Ionicons } from "@expo/vector-icons";

export default function EditLuchadorScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // --- ESTADOS ---
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Male");
  const [wClass, setWClass] = useState("Cruiser");
  const [altClass, setAltClass] = useState("None");
  const [crowd, setCrowd] = useState("Face");
  const [ringLevel, setRingLevel] = useState("1");
  const [mic, setMic] = useState("1");

  // Contrato
  const [weeksLeft, setWeeksLeft] = useState("10");
  const [hiringCost, setHiringCost] = useState("0");
  const [isDraft, setIsDraft] = useState(false); // <--- NUEVO ESTADO

  const [manualWins, setManualWins] = useState("0");
  const [manualLosses, setManualLosses] = useState("0");

  const classes = ["Cruiser", "Bruiser", "Giant", "Fighter", "Specialist"];

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
        setWeeksLeft(data.weeksLeft?.toString() || "25");
        setHiringCost(data.hiringCost?.toString() || "0");

        // Cargar estado del contrato
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
      isDraft ? 1 : 0, // <--- ENVIAMOS EL NUEVO PARÁMETRO
      Number(manualWins),
      Number(manualLosses)
    );

    if (success) {
      Alert.alert("Actualizado", "Datos guardados correctamente.");
      router.back();
    } else {
      Alert.alert("Error", "No se pudo actualizar el registro.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Editar Luchador</Text>

      <Text style={styles.label}>Nombre:</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.sectionTitle}>RÉCORD (Sincronizar con 2K25)</Text>
      <View style={styles.statsRow}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>Wins:</Text>
          <TextInput
            style={[styles.input, { color: "#4CAF50", fontWeight: "bold" }]}
            value={manualWins}
            onChangeText={setManualWins}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Losses:</Text>
          <TextInput
            style={[styles.input, { color: "#F44336", fontWeight: "bold" }]}
            value={manualLosses}
            onChangeText={setManualLosses}
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>HABILIDADES</Text>
      <View style={styles.statsRow}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>Nivel Ring:</Text>
          <TextInput
            style={styles.input}
            value={ringLevel}
            onChangeText={setRingLevel}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Micrófono:</Text>
          <TextInput
            style={styles.input}
            value={mic}
            onChangeText={setMic}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* --- NUEVA SECCIÓN: CONTRATO --- */}
      <Text style={styles.sectionTitle}>CONTRATO</Text>
      <View
        style={[
          styles.contractBox,
          isDraft ? styles.draftBorder : styles.faBorder,
        ]}
      >
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchTitle}>
              {isDraft ? "♾️ DRAFT (Permanente)" : "📅 AGENTE LIBRE (Temporal)"}
            </Text>
          </View>
          <Switch
            value={isDraft}
            onValueChange={setIsDraft}
            trackColor={{ false: "#E0E0E0", true: "#2196F3" }}
          />
        </View>

        {!isDraft && (
          <View style={styles.statsRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Semanas Restantes:</Text>
              <TextInput
                style={styles.input}
                value={weeksLeft}
                onChangeText={setWeeksLeft}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>Costo Fichaje ($):</Text>
          <TextInput
            style={styles.input}
            value={hiringCost}
            onChangeText={setHiringCost}
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.label}>Género:</Text>
      <View style={styles.row}>
        {["Male", "Female"].map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.btnOption, gender === g && styles.btnSelected]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.btnText, gender === g && styles.textSelected]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Reacción (Alignment):</Text>
      <View style={styles.row}>
        {["Face", "Heel"].map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.btnOption, crowd === c && styles.btnSelected]}
            onPress={() => setCrowd(c)}
          >
            <Text style={[styles.btnText, crowd === c && styles.textSelected]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Clase Principal:</Text>
      <View style={styles.row}>
        {classes.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.btnOption, wClass === c && styles.btnSelected]}
            onPress={() => setWClass(c)}
          >
            <Text style={[styles.btnText, wClass === c && styles.textSelected]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lógica Nivel 15 */}
      {Number(ringLevel) >= 15 ? (
        <View>
          <Text style={styles.label}>Clase Secundaria:</Text>
          <View style={styles.row}>
            {["None", ...classes].map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.btnOption,
                  altClass === c && styles.btnSelectedAlt,
                ]}
                onPress={() => setAltClass(c)}
              >
                <Text
                  style={[
                    styles.btnText,
                    altClass === c && styles.textSelected,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={16} color="#8e8e93" />
          <Text style={styles.lockedText}>
            La clase secundaria se desbloquea en Nivel de Ring 15
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
        <Text style={styles.saveButtonText}>GUARDAR CAMBIOS</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
    paddingBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#AAA",
    marginTop: 25,
    letterSpacing: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 15,
    color: "#555",
  },
  input: {
    backgroundColor: "#f2f2f7",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btnOption: {
    padding: 8,
    backgroundColor: "#eee",
    borderRadius: 8,
    minWidth: 75,
    alignItems: "center",
  },
  btnSelected: { backgroundColor: "#007AFF" },
  btnSelectedAlt: { backgroundColor: "#5856D6" },
  btnText: { color: "#333", fontSize: 11 },
  textSelected: { color: "white", fontWeight: "bold" },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    marginTop: 30,
    alignItems: "center",
  },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },

  // Estilos contrato
  contractBox: {
    backgroundColor: "#FAFAFA",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderLeftWidth: 4,
  },
  draftBorder: { borderLeftColor: "#2196F3" },
  faBorder: { borderLeftColor: "#FF9800" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  switchTitle: { fontWeight: "bold", fontSize: 14, color: "#333" },

  lockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f7",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    gap: 10,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#d1d1d6",
  },
  lockedText: { color: "#8e8e93", fontSize: 12, fontWeight: "600" },
});
