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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import {
  client,
  adminClient,
  config as sanityConfig,
} from "../../../../sanity/client";

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
  completed: boolean;
  expanded: boolean;
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

  const dataset = sanityConfig.dataset || "fitness-app";
  const apiVersion = sanityConfig.apiVersion || "2023-10-12";
  const readClient = client.withConfig({ dataset, apiVersion });
  const writeClient = (adminClient || client).withConfig({
    dataset,
    apiVersion,
  });

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const fetchQuote = useCallback(async () => {
    try {
      const apiKey =
        Constants.expoConfig?.extra?.apiNinjasKey ||
        process.env.EXPO_PUBLIC_API_NINJAS_KEY ||
        process.env.API_NINJAS_KEY;
      if (!apiKey) return;
      const res = await fetch(
        "https://api.api-ninjas.com/v2/randomquotes?categories=success,wisdom",
        { headers: { "X-Api-Key": apiKey } }
      );
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        const first = json[0];
        const text = first?.quote;
        const author = first?.author;
        if (text) setQuote(text + (author ? ` — ${author}` : ""));
      }
    } catch {
      // ignore
    }
  }, []);

  const [quote, setQuote] = useState<string>("Push hard. Log every rep.");
  const [loadingStats, setLoadingStats] = useState(false);
  const [statError, setStatError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<
    {
      _id: string;
      date?: string;
      durationMin?: number;
      exercises?: {
        name?: string;
        sets?: { reps?: number; weight?: number; weightUnit?: string }[];
      }[];
    }[]
  >([]);

  const loadWorkouts = useCallback(async () => {
    try {
      setLoadingStats(true);
      setStatError(null);
      const data = await readClient.fetch(
        `*[_type == "workout"] | order(coalesce(date, _createdAt) desc)[0..9]{
          _id,
          date,
          durationMin,
          exercises[]{ "name": exercise->name, sets[]{reps, weight, weightUnit} }
        }`
      );
      setWorkouts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setStatError("Could not load workout stats.");
      setWorkouts([]);
    } finally {
      setLoadingStats(false);
    }
  }, [readClient]);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    fetchQuote();
    loadWorkouts();
  }, [pulse, fetchQuote, loadWorkouts]);

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

  const filteredExercises = useMemo(() => {
    if (!selectedDay) return availableExercises;
    return availableExercises.filter((ex) =>
      ex.trainingDays?.includes(selectedDay)
    );
  }, [availableExercises, selectedDay]);

  const fetchLastSetForExercise = useCallback(
    async (exerciseId: string) => {
      try {
        const data = await readClient.fetch(
          `*[_type == "workout" && references($exId)]
            | order(coalesce(date, _createdAt) desc)[0].exercises[exercise._ref == $exId][0].sets[-1]`,
          { exId: exerciseId }
        );
        const last = data;
        if (last) {
          const unitFromLast: Unit = last?.weightUnit === "lbs" ? "lbs" : "kg";
          return {
            reps:
              last?.reps !== undefined && last?.reps !== null
                ? String(last.reps)
                : "0",
            weight:
              last?.weight !== undefined && last?.weight !== null
                ? String(last.weight)
                : "0",
            unit: unitFromLast || unit,
          };
        }
      } catch (e) {
        // ignore and fallback to defaults
      }
      return null;
    },
    [unit]
  );

  const fetchLocalExercises = useCallback(async () => {
    try {
      setLoadingExercises(true);
      setError(null);
      const data = await readClient.fetch(
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

  const addExerciseToSession = async (exerciseId: string) => {
    const found = availableExercises.find((ex) => ex._id === exerciseId);
    if (!found) return;
    const key = `${exerciseId}-${Date.now()}`;
    const lastSet = await fetchLastSetForExercise(exerciseId);
    const baseSet = lastSet || { reps: "0", weight: "0", unit };
    setSessionExercises((prev) => [
      ...prev,
      {
        key,
        exerciseId,
        name: found.name,
        sets: [baseSet],
        completed: false,
        expanded: true,
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
              sets: [
                ...ex.sets,
                ex.sets.length > 0
                  ? { ...ex.sets[ex.sets.length - 1] }
                  : { reps: "0", weight: "0", unit },
              ],
              completed: false,
              expanded: true,
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

  const markExerciseComplete = (exerciseKey: string) => {
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.key === exerciseKey
          ? { ...ex, completed: true, expanded: false }
          : ex
      )
    );
  };

  const toggleExerciseExpanded = (exerciseKey: string) => {
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.key === exerciseKey ? { ...ex, expanded: !ex.expanded } : ex
      )
    );
  };

  const handleStart = () => {
    setQuote("Loading inspiration...");
    fetchQuote();
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
      await writeClient.create(payload);
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
      <Animated.View style={[styles.gymBanner, pulseStyle]}>
        <Ionicons name="barbell" size={16} color="#222" />
        <Text style={styles.gymBannerText}>{quote}</Text>
      </Animated.View>
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

        <Text style={styles.caption}>
          {sessionExercises.length}{" "}
          {sessionExercises.length === 1 ? "exercise" : "exercises"}
        </Text>

        {sessionExercises.map((ex, exIdx) => {
          const volume = ex.sets.reduce(
            (acc, s) => acc + (Number(s.reps) || 0) * (Number(s.weight) || 0),
            0
          );
          return (
            <View style={styles.card} key={ex.key}>
              <TouchableOpacity
                style={[
                  styles.cardHeader,
                  ex.completed && {
                    backgroundColor: "#F4F4F4",
                    borderRadius: 8,
                  },
                ]}
                onPress={() => toggleExerciseExpanded(ex.key)}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={styles.cardTitle}>
                    {ex.name} (Exercise #{exIdx + 1})
                  </Text>
                  <Text style={styles.cardMeta}>
                    {ex.sets.length} sets · {ex.completed ? ex.sets.length : 0}{" "}
                    completed · {volume} kg
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  {ex.completed ? (
                    <Text style={styles.finishedPill}>Finished</Text>
                  ) : null}
                  <Ionicons
                    name={ex.expanded ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#111"
                  />
                  {ex.expanded ? (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => removeExercise(ex.key)}
                    >
                      <Ionicons name="trash" size={18} color="#444" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>

              {ex.expanded ? (
                <>
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
                      <Text style={styles.setIndex}>Set #{idx + 1}</Text>
                      <View style={styles.setInputs}>
                        <View style={styles.setInputBlock}>
                          <Text style={styles.setLabel}>Reps</Text>
                          <TextInput
                            style={styles.setInput}
                            keyboardType="numeric"
                            value={set.reps}
                            onChangeText={(t) =>
                              updateSet(ex.key, idx, "reps", t)
                            }
                          />
                        </View>
                        <View style={styles.setInputBlock}>
                          <Text style={styles.setLabel}>
                            Weight ({set.unit})
                          </Text>
                          <TextInput
                            style={styles.setInput}
                            keyboardType="numeric"
                            value={set.weight}
                            onChangeText={(t) =>
                              updateSet(ex.key, idx, "weight", t)
                            }
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
                          <Ionicons name="trash" size={16} color="#444" />
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

                  <TouchableOpacity
                    style={[
                      styles.finishExerciseBtn,
                      ex.completed && { backgroundColor: "#E6E6E6" },
                    ]}
                    onPress={() => markExerciseComplete(ex.key)}
                    disabled={ex.completed}
                  >
                    <Text
                      style={[
                        styles.finishExerciseText,
                        ex.completed && { color: "#333" },
                      ]}
                    >
                      {ex.completed
                        ? `Exercise #${exIdx + 1} finished`
                        : `Finish Exercise #${exIdx + 1}`}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          );
        })}

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
                <ActivityIndicator color="#555" />
                <Text style={styles.loaderText}>Loading...</Text>
              </View>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <ScrollView style={{ maxHeight: 260 }}>
                {filteredExercises.length === 0 ? (
                  <Text style={styles.emptySetText}>
                    No exercises match this training day.
                  </Text>
                ) : null}
                {filteredExercises.map((opt) => (
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
    backgroundColor: "#F5F5F5",
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
    backgroundColor: "#2C2C2C",
    borderRadius: 8,
    overflow: "hidden",
  },
  unitBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  unitBtnActive: {
    backgroundColor: "#111",
  },
  unitText: {
    color: "#E0E0E0",
    fontSize: 12,
    fontWeight: "600",
  },
  unitTextActive: {
    color: "#fff",
  },
  endBtn: {
    backgroundColor: "#333",
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
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 11,
    color: "#777",
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E6E6E6",
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
    borderColor: "#D0D0D0",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#F7F7F7",
  },
  emptySetText: {
    color: "#666",
    fontSize: 13,
  },
  addSetBtn: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F2F2F2",
  },
  addSetText: {
    color: "#222",
    fontSize: 14,
    fontWeight: "700",
  },
  setRow: {
    borderWidth: 1,
    borderColor: "#DADADA",
    borderRadius: 12,
    padding: 10,
    paddingRight: 12,
    marginBottom: 10,
    backgroundColor: "#F7F7F7",
    overflow: "hidden",
  },
  setIndex: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
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
    borderColor: "#D6D6D6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  finishExerciseBtn: {
    marginTop: 10,
    backgroundColor: "#333",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  finishExerciseText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  finishedPill: {
    backgroundColor: "#E6E6E6",
    color: "#333",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
    fontWeight: "700",
    fontSize: 11,
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
    backgroundColor: "#333",
  },
  unitToggleSmallText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  gymBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  gymBannerText: {
    flex: 1,
    color: "#222",
    fontWeight: "700",
    fontSize: 12,
    flexWrap: "wrap",
    lineHeight: 16,
  },
  iconBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E6E6E6",
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
    color: "#111",
    fontWeight: "700",
  },
  primaryBtn: {
    backgroundColor: "#222",
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
    backgroundColor: "#444",
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
    borderBottomColor: "#E6E6E6",
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
    color: "#555",
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
