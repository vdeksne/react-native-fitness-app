import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Unit = "lbs" | "kg";

const trainingDayOptions = [
  { value: "legsGlutesDay", label: "Legs & Glutes Day" },
  { value: "shouldersArmsDay", label: "Shoulders & Arms Day" },
  { value: "backDay", label: "Back Day" },
  { value: "chestArmsDay", label: "Chest & Arms Day" },
  { value: "glutesHamstringsDay", label: "Glutes & Hamstrings Day" },
  { value: "absCoreDay", label: "Abs / Core Day" },
];

export default function Workout() {
  const [started, setStarted] = useState(false);
  const [unit, setUnit] = useState<Unit>("kg");
  const [selectedDay, setSelectedDay] = useState<string>(
    trainingDayOptions[0].value
  );
  const [showDayList, setShowDayList] = useState(false);

  // --- FIX for workoutTimer undefined ---
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (started) {
      timerRef.current = setInterval(() => {
        setWorkoutTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setWorkoutTimer(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started]);
  // --- END FIX ---

  const selectedDayLabel = useMemo(
    () => trainingDayOptions.find((o) => o.value === selectedDay)?.label,
    [selectedDay]
  );

  if (!started) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.starter}>
          <Text style={styles.starterTitle}>Ready to start?</Text>
          <Text style={styles.starterSubtitle}>
            Pick your training day, then start your workout.
          </Text>

          <View style={styles.dayPicker}>
            <TouchableOpacity
              style={styles.dayPickerTrigger}
              onPress={() => setShowDayList((v) => !v)}
            >
              <Text style={styles.dayPickerLabel}>Training Day</Text>
              <View style={styles.dayPickerValueRow}>
                <Text style={styles.dayPickerValue}>{selectedDayLabel}</Text>
                <Ionicons
                  name={showDayList ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#111"
                />
              </View>
            </TouchableOpacity>
            {showDayList && (
              <View style={styles.dayList}>
                {trainingDayOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.dayListItem}
                    onPress={() => {
                      setSelectedDay(opt.value);
                      setShowDayList(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayListText,
                        opt.value === selectedDay && styles.dayListTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => setStarted(true)}
          >
            <Text style={styles.successBtnText}>Start Workout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Active Workout</Text>
          <Text style={styles.headerSub}>
            {typeof workoutTimer === "number"
              ? `${Math.floor(workoutTimer / 60)
                  .toString()
                  .padStart(2, "0")}:${(workoutTimer % 60)
                  .toString()
                  .padStart(2, "0")}`
              : "00:00"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[styles.unitBtn, unit === "lbs" && styles.unitBtnActive]}
              onPress={() => setUnit("lbs")}
            >
              <Text
                style={[
                  styles.unitText,
                  unit === "lbs" && styles.unitTextActive,
                ]}
              >
                lbs
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitBtn, unit === "kg" && styles.unitBtnActive]}
              onPress={() => setUnit("kg")}
            >
              <Text
                style={[
                  styles.unitText,
                  unit === "kg" && styles.unitTextActive,
                ]}
              >
                kg
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.endBtn}
            onPress={() => setStarted(false)}
          >
            <Text style={styles.endBtnText}>End Workout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.caption}>1 exercises</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Hamstring Curl</Text>
              <Text style={styles.cardMeta}>0 sets · 0 completed</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="trash" size={18} color="#C83737" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Sets</Text>
          <TouchableOpacity style={styles.emptySet}>
            <Text style={styles.emptySetText}>
              No sets yet. Add your first set below.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addSetBtn}>
            <Text style={styles.addSetText}>+ Add Set</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dayPicker}>
          <TouchableOpacity
            style={styles.dayPickerTrigger}
            onPress={() => setShowDayList((v) => !v)}
          >
            <Text style={styles.dayPickerLabel}>Training Day</Text>
            <View style={styles.dayPickerValueRow}>
              <Text style={styles.dayPickerValue}>{selectedDayLabel}</Text>
              <Ionicons
                name={showDayList ? "chevron-up" : "chevron-down"}
                size={16}
                color="#111"
              />
            </View>
          </TouchableOpacity>
          {showDayList && (
            <View style={styles.dayList}>
              {trainingDayOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.dayListItem}
                  onPress={() => {
                    setSelectedDay(opt.value);
                    setShowDayList(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dayListText,
                      opt.value === selectedDay && styles.dayListTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>+ Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.successBtn}>
          <Text style={styles.successBtnText}>Complete Workout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#777",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: "#1F2A44",
    borderRadius: 8,
    overflow: "hidden",
  },
  unitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  unitBtnActive: {
    backgroundColor: "#3D5AFE",
  },
  unitText: {
    color: "#C7D0E0",
    fontSize: 12,
    fontWeight: "600",
  },
  unitTextActive: {
    color: "#fff",
  },
  endBtn: {
    backgroundColor: "#C83737",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  endBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  caption: {
    textAlign: "center",
    color: "#777",
    fontSize: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#777",
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FDEAEA",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  emptySet: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C8D2E5",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#F9FBFF",
  },
  emptySetText: {
    color: "#7A869A",
    fontSize: 13,
  },
  addSetBtn: {
    borderWidth: 1,
    borderColor: "#3D5AFE",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F1F4FF",
  },
  addSetText: {
    color: "#1E3DF0",
    fontSize: 14,
    fontWeight: "700",
  },
  dayPicker: {
    marginBottom: 16,
  },
  dayPickerTrigger: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 12,
  },
  dayPickerLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 6,
  },
  dayPickerValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayPickerValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  dayList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginTop: 8,
    overflow: "hidden",
  },
  dayListItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dayListText: {
    fontSize: 14,
    color: "#444",
  },
  dayListTextActive: {
    color: "#1E3DF0",
    fontWeight: "700",
  },
  primaryBtn: {
    backgroundColor: "#2F6DF6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  successBtn: {
    backgroundColor: "#2FA44F",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  successBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  starter: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  starterTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  starterSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
});
