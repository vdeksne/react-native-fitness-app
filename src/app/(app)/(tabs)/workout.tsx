import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { client, adminClient } from "../../../../sanity/client";

type Unit = "lbs" | "kg";

type ExerciseOption = {
  _id: string;
  name: string;
  majorMuscleGroups?: string[];
  trainingDays?: string[];
};

type SetEntry = {
  reps: string;
  weight: string;
  unit: Unit;
};

type ActiveExercise = {
  key: string;
  exerciseId: string;
  name: string;
  sets: SetEntry[];
};

const trainingDayOptions = [
  { value: "legsGlutesDay", label: "Legs & Glutes Day" },
  { value: "shouldersArmsDay", label: "Shoulders & Arms Day" },
  { value: "backDay", label: "Back Day" },
  { value: "chestArmsDay", label: "Chest & Arms Day" },
  { value: "glutesHamstringsDay", label: "Glutes & Hamstrings Day" },
  { value: "absCoreDay", label: "Abs / Core Day" },
];

export default function Workout() {
  const canWrite = adminClient !== client;
  const [started, setStarted] = useState(false);
  const [unit, setUnit] = useState<Unit>("kg");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(
    trainingDayOptions[0].value
  );
  const [showDayList, setShowDayList] = useState(false);
  const [showExerciseList, setShowExerciseList] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<
    ExerciseOption[]
  >([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [sessionExercises, setSessionExercises] = useState<ActiveExercise[]>(
    []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchLocalExercises = useCallback(async () => {
    try {
      setLoadingExercises(true);
      setError(null);
      const data = await client.fetch(
        `*[_type == "exercise" && isActive != false]{_id, name, majorMuscleGroups, trainingDays}`
      );
      const arr: ExerciseOption[] = Array.isArray(data) ? data : [];
      setAvailableExercises(arr);
    } catch (e: any) {
      setError("Could not load exercises from your database.");
    } finally {
      setLoadingExercises(false);
    }
  }, []);

  useEffect(() => {
    fetchLocalExercises();
  }, [fetchLocalExercises]);

  const addExerciseToSession = (exerciseId: string) => {
    const found = availableExercises.find((ex) => ex._id === exerciseId);
    if (!found) return;
    const key = `${exerciseId}-${Date.now()}`;
    setSessionExercises((prev) => [
      ...prev,
      {
        key,
        exerciseId,
        name: found.name,
        sets: [{ reps: "0", weight: "0", unit }],
      },
    ]);
    setShowExerciseList(false);
  };

  const updateSet = (
    exerciseKey: string,
    setIndex: number,
    field: "reps" | "weight" | "unit",
    value: string
  ) => {
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.key === exerciseKey
          ? {
              ...ex,
              sets: ex.sets.map((s, i) =>
                i === setIndex ? { ...s, [field]: value } : s
              ),
            }
          : ex
      )
    );
  };

  const addSet = (exerciseKey: string) => {
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.key === exerciseKey
          ? {
              ...ex,
              sets: [...ex.sets, { reps: "0", weight: "0", unit }],
            }
          : ex
      )
    );
  };

  const removeSet = (exerciseKey: string, setIndex: number) => {
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.key === exerciseKey
          ? { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) }
          : ex
      )
    );
  };

  const removeExercise = (exerciseKey: string) => {
    setSessionExercises((prev) => prev.filter((ex) => ex.key !== exerciseKey));
  };

  const handleStart = () => {
    setStarted(true);
    setStartedAt(new Date());
  };

  const handleEnd = () => {
    setStarted(false);
    setSessionExercises([]);
    setStartedAt(null);
  };

  const handleComplete = async () => {
    if (!canWrite) {
      Alert.alert(
        "Sanity write token required",
        "Set EXPO_PUBLIC_SANITY_TOKEN (write-enabled) and restart the dev server."
      );
      return;
    }
    if (sessionExercises.length === 0) {
      Alert.alert("Add exercises", "Please add at least one exercise.");
      return;
    }
    const clientToUse = adminClient || client;
    const now = new Date();
    const durationMin =
      startedAt != null
        ? Math.max(1, Math.round((now.getTime() - startedAt.getTime()) / 60000))
        : Math.max(1, Math.round(workoutTimer / 60));

    const payload = {
      _type: "workout",
      userId: "demo-user",
      date: now.toISOString(),
      startedAt: startedAt ? startedAt.toISOString() : now.toISOString(),
      endedAt: now.toISOString(),
      durationMin,
      exercises: sessionExercises.map((ex) => ({
        exercise: { _type: "reference", _ref: ex.exerciseId },
        sets: ex.sets.map((s) => ({
          reps: Number(s.reps) || 0,
          weight: s.weight ? Number(s.weight) : undefined,
          weightUnit: s.unit,
        })),
      })),
    };

    try {
      setSaving(true);
      await clientToUse.create(payload);
      Alert.alert("Saved", "Workout saved to your history.");
      handleEnd();
    } catch (e: any) {
      Alert.alert("Save failed", "Could not save workout to your database.");
    } finally {
      setSaving(false);
    }
  };

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

          <TouchableOpacity style={styles.successBtn} onPress={handleStart}>
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
          <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
            <Text style={styles.endBtnText}>End Workout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.caption}>
          {sessionExercises.length}{" "}
          {sessionExercises.length === 1 ? "exercise" : "exercises"}
        </Text>

        {sessionExercises.map((ex) => (
          <View style={styles.card} key={ex.key}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{ex.name}</Text>
                <Text style={styles.cardMeta}>
                  {ex.sets.length} sets · {ex.sets.length} completed
                </Text>
              </View>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => removeExercise(ex.key)}
              >
                <Ionicons name="trash" size={18} color="#C83737" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Sets</Text>
            {ex.sets.length === 0 ? (
              <TouchableOpacity style={styles.emptySet}>
                <Text style={styles.emptySetText}>
                  No sets yet. Add your first set below.
                </Text>
              </TouchableOpacity>
            ) : null}

            {ex.sets.map((set, idx) => (
              <View key={`${ex.key}-set-${idx}`} style={styles.setRow}>
                <Text style={styles.setIndex}>{idx + 1}</Text>
                <View style={styles.setInputs}>
                  <View style={styles.setInputBlock}>
                    <Text style={styles.setLabel}>Reps</Text>
                    <TextInput
                      style={styles.setInput}
                      keyboardType="numeric"
                      value={set.reps}
                      onChangeText={(t) => updateSet(ex.key, idx, "reps", t)}
                    />
                  </View>
                  <View style={styles.setInputBlock}>
                    <Text style={styles.setLabel}>Weight ({set.unit})</Text>
                    <TextInput
                      style={styles.setInput}
                      keyboardType="numeric"
                      value={set.weight}
                      onChangeText={(t) => updateSet(ex.key, idx, "weight", t)}
                    />
                  </View>
                </View>
                <View style={styles.setActions}>
                  <TouchableOpacity
                    style={styles.unitToggleSmall}
                    onPress={() =>
                      updateSet(
                        ex.key,
                        idx,
                        "unit",
                        set.unit === "kg" ? "lbs" : "kg"
                      )
                    }
                  >
                    <Text style={styles.unitToggleSmallText}>
                      {set.unit.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtnSmall}
                    onPress={() => removeSet(ex.key, idx)}
                  >
                    <Ionicons name="trash" size={16} color="#C83737" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addSetBtn}
              onPress={() => addSet(ex.key)}
            >
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        {showExerciseList && (
          <View style={styles.exerciseList}>
            <View style={styles.exerciseListHeader}>
              <Text style={styles.exerciseListTitle}>Choose exercise</Text>
              <TouchableOpacity onPress={() => setShowExerciseList(false)}>
                <Ionicons name="close" size={20} color="#111" />
              </TouchableOpacity>
            </View>
            {loadingExercises ? (
              <View style={styles.loaderRow}>
                <ActivityIndicator color="#1E3DF0" />
                <Text style={styles.loaderText}>Loading...</Text>
              </View>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <ScrollView style={{ maxHeight: 260 }}>
                {availableExercises.map((opt) => (
                  <TouchableOpacity
                    key={opt._id}
                    style={styles.exerciseListItem}
                    onPress={() => addExerciseToSession(opt._id)}
                  >
                    <Text style={styles.exerciseListName}>{opt.name}</Text>
                    <Text style={styles.exerciseListMeta}>
                      {opt.majorMuscleGroups?.join(", ") || "Muscle group"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

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
          style={styles.primaryBtn}
          onPress={() => setShowExerciseList(true)}
        >
          <Text style={styles.primaryBtnText}>+ Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.successBtn, saving && { opacity: 0.7 }]}
          onPress={handleComplete}
          disabled={saving}
        >
          <Text style={styles.successBtnText}>
            {saving ? "Saving..." : "Complete Workout"}
          </Text>
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
  setRow: {
    borderWidth: 1,
    borderColor: "#E5E9F2",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#F7FBFF",
  },
  setIndex: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E3DF0",
    marginBottom: 6,
  },
  setInputs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  setInputBlock: {
    flex: 1,
  },
  setLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  setInput: {
    borderWidth: 1,
    borderColor: "#D9DFEA",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  setActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unitToggleSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#1E3DF0",
  },
  unitToggleSmallText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  iconBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FDEAEA",
    alignItems: "center",
    justifyContent: "center",
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
  exerciseList: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    padding: 12,
    marginBottom: 16,
  },
  exerciseListHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  exerciseListTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  exerciseListItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F6",
  },
  exerciseListName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  exerciseListMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loaderText: {
    color: "#111",
    fontSize: 13,
  },
  errorText: {
    color: "#C83737",
    fontSize: 13,
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
