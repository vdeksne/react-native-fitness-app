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
  Modal,
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
import { supabaseSafe as supabase } from "../../../lib/supabase";
import * as SecureStore from "expo-secure-store";
import { useTheme } from "../../../context/ThemeContext";

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

type PlanDay = {
  id: string;
  dayLabel: string;
  value: string;
  focus: string;
  exercises: string[];
  color: string;
};

const baseDayOptions = [
  { value: "legsGlutesDay", label: "Legs & Glutes Day" },
  { value: "shouldersArmsDay", label: "Shoulders & Arms Day" },
  { value: "backDay", label: "Back Day" },
  { value: "chestArmsDay", label: "Chest & Arms Day" },
  { value: "glutesHamstringsDay", label: "Glutes & Hamstrings Day" },
  { value: "absCoreDay", label: "Abs / Core Day" },
];

const defaultWeeklyPlan: PlanDay[] = [
  {
    id: "plan-mon",
    dayLabel: "Monday",
    value: "legsGlutesDay",
    focus: "Legs / Glutes",
    exercises: [
      "Hip thrusts - 4x20",
      "Cable kickbacks - 3x12",
      "Squats (Smith) - 4x10",
    ],
    color: "#F2E8FF",
  },
  {
    id: "plan-tue",
    dayLabel: "Tuesday",
    value: "shouldersArmsDay",
    focus: "Shoulders / Arms",
    exercises: [
      "Pushup machine - 4x10",
      "Arnold press - 4x10",
      "Cable curl - 4x15",
    ],
    color: "#E8F3FF",
  },
  {
    id: "plan-wed",
    dayLabel: "Wednesday",
    value: "backDay",
    focus: "Back",
    exercises: [
      "Lat pulldown - 4x20",
      "Cable row - 4x20",
      "Upright row - 3x12",
    ],
    color: "#E9FBF2",
  },
  {
    id: "plan-thu",
    dayLabel: "Thursday",
    value: "chestArmsDay",
    focus: "Chest / Arms",
    exercises: [
      "Incline bench - 4x10",
      "Chest fly - 4x12",
      "Triceps dips - 4x15",
    ],
    color: "#FFF4E5",
  },
  {
    id: "plan-fri",
    dayLabel: "Friday",
    value: "glutesHamstringsDay",
    focus: "Glutes / Hamstrings",
    exercises: [
      "Bulgarian split squat - 3x10",
      "Romanian deadlift - 4x12",
      "Sumo squat - 3x15",
    ],
    color: "#E8F7FF",
  },
  {
    id: "plan-sat",
    dayLabel: "Saturday",
    value: "absCoreDay",
    focus: "Abs / Core",
    exercises: [
      "Captain's chair - 3x30",
      "Cable crunch - 3x30",
      "Plank - 3x30 sec",
    ],
    color: "#FFF0F2",
  },
];

export default function Workout() {
  const { colors, theme } = useTheme();
  const buttonTextColor = theme === "dark" ? colors.text : "#111";
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    Constants.expoConfig?.extra?.supabaseUrl ||
    "";
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    Constants.expoConfig?.extra?.supabaseAnonKey ||
    "";
  const canWrite = !!supabaseUrl && !!supabaseAnonKey;
  const [dayOptions, setDayOptions] = useState(baseDayOptions);
  const [weeklyPlan, setWeeklyPlan] = useState<PlanDay[]>(defaultWeeklyPlan);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<{
    dayLabel: string;
    focus: string;
    value: string;
    exercisesText: string;
    color: string;
  }>({
    dayLabel: "",
    focus: "",
    value: "",
    exercisesText: "",
    color: defaultWeeklyPlan[0].color,
  });
  const getWeekKey = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - now.getDay());
    return start.toISOString().slice(0, 10);
  };
  const [weekKey, setWeekKey] = useState(getWeekKey());
  const [completedPlans, setCompletedPlans] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [unit, setUnit] = useState<Unit>("kg");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(
    baseDayOptions[0].value
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
  const [lastRemovedExercise, setLastRemovedExercise] =
    useState<ActiveExercise | null>(null);
  const [lastRemovedIndex, setLastRemovedIndex] = useState<number | null>(null);
  const [lastRemovedPlan, setLastRemovedPlan] = useState<PlanDay | null>(null);
  const [lastRemovedPlanIndex, setLastRemovedPlanIndex] = useState<
    number | null
  >(null);

  const planPalette = [
    "#F2E8FF",
    "#E8F3FF",
    "#E9FBF2",
    "#FFF4E5",
    "#E8F7FF",
    "#FFF0F2",
    "#E7ECFF",
  ];

  const toSlug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || `plan-${Date.now()}`;

  const pickColor = (seed?: string) => {
    if (!seed) return planPalette[0];
    const hash = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return planPalette[hash % planPalette.length];
  };

  const openPlanModal = (plan?: PlanDay) => {
    setEditingPlanId(plan?.id || null);
    const chosenColor =
      plan?.color || pickColor(plan?.dayLabel || `plan-${Date.now()}`);
    setPlanForm({
      dayLabel: plan?.dayLabel || "",
      focus: plan?.focus || "",
      value: plan?.value || "",
      exercisesText: (plan?.exercises || []).join("\n"),
      color: chosenColor,
    });
    setPlanModalVisible(true);
  };

  const savePlanToStorage = async (plan: PlanDay[]) => {
    try {
      await SecureStore.setItemAsync("weekly_plan_v1", JSON.stringify(plan));
    } catch {
      // non-fatal persistence error
    }
  };

  const storageCompletedKey = (wk: string) => `weekly_completed_${wk}`;

  const loadCompletedForWeek = useCallback(async (wk: string) => {
    try {
      const raw = await SecureStore.getItemAsync(storageCompletedKey(wk));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCompletedPlans(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setCompletedPlans([]);
  }, []);

  const saveCompletedForWeek = async (wk: string, list: string[]) => {
    try {
      await SecureStore.setItemAsync(
        storageCompletedKey(wk),
        JSON.stringify(list)
      );
    } catch {
      // ignore
    }
  };

  const markPlanCompleted = (planValue: string) => {
    setCompletedPlans((prev) => {
      if (prev.includes(planValue)) return prev;
      const next = [...prev, planValue];
      saveCompletedForWeek(weekKey, next);
      return next;
    });
  };

  const loadPlanFromStorage = useCallback(async () => {
    try {
      const raw = await SecureStore.getItemAsync("weekly_plan_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setWeeklyPlan(parsed);
          return;
        }
      }
    } catch {
      // fall back to defaults
    }
    setWeeklyPlan(defaultWeeklyPlan);
  }, []);

  const handleSavePlanEntry = () => {
    const cleanedExercises = planForm.exercisesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const value = planForm.value
      ? toSlug(planForm.value)
      : toSlug(planForm.dayLabel || planForm.focus);

    const newEntry: PlanDay = {
      id: editingPlanId || `plan-${Date.now()}`,
      dayLabel: planForm.dayLabel || "New Day",
      focus: planForm.focus || "Training Day",
      value,
      exercises: cleanedExercises,
      color: planForm.color || pickColor(planForm.dayLabel),
    };

    setWeeklyPlan((prev) => {
      const exists = prev.some((p) => p.id === newEntry.id);
      const next = exists
        ? prev.map((p) => (p.id === newEntry.id ? newEntry : p))
        : [...prev, newEntry];
      savePlanToStorage(next);
      return next;
    });
    setPlanModalVisible(false);
  };

  const handleDeletePlanEntry = () => {
    if (!editingPlanId) {
      setPlanModalVisible(false);
      return;
    }
    setWeeklyPlan((prev) => {
      const idx = prev.findIndex((p) => p.id === editingPlanId);
      const removed = prev.find((p) => p.id === editingPlanId) || null;
      if (removed) {
        setLastRemovedPlan(removed);
        setLastRemovedPlanIndex(idx >= 0 ? idx : null);
      }
      const next = prev.filter((p) => p.id !== editingPlanId);
      savePlanToStorage(next);
      return next;
    });
    setPlanModalVisible(false);
  };

  const undoRemovePlan = () => {
    if (!lastRemovedPlan) return;
    setWeeklyPlan((prev) => {
      const exists = prev.find((p) => p.id === lastRemovedPlan.id);
      if (exists) return prev;
      const copy = [...prev];
      const idx =
        lastRemovedPlanIndex === null
          ? copy.length
          : Math.min(Math.max(0, lastRemovedPlanIndex), copy.length);
      copy.splice(idx, 0, lastRemovedPlan);
      savePlanToStorage(copy);
      return copy;
    });
    setLastRemovedPlan(null);
    setLastRemovedPlanIndex(null);
  };

  const startFromPlan = (plan: PlanDay) => {
    setSelectedDay(plan.value);
    setShowDayList(false);
    setSessionExercises([]);
    setStarted(true);
    setStartedAt(new Date());
  };

  const planEditorModal = (
    <Modal
      visible={planModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setPlanModalVisible(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {editingPlanId ? "Edit day" : "Add day"}
          </Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Day (e.g. Monday)"
            placeholderTextColor="#888"
            value={planForm.dayLabel}
            onChangeText={(t) =>
              setPlanForm((prev) => ({
                ...prev,
                dayLabel: t,
                color: prev.color || pickColor(t),
              }))
            }
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Focus (e.g. Chest & Arms)"
            placeholderTextColor="#888"
            value={planForm.focus}
            onChangeText={(t) =>
              setPlanForm((prev) => ({
                ...prev,
                focus: t,
              }))
            }
          />
          <TextInput
            style={[styles.modalInput, styles.modalTextarea]}
            placeholder={
              "Exercises (one per line)\nBench Press - 4x10\nCable Fly - 4x12"
            }
            placeholderTextColor="#888"
            value={planForm.exercisesText}
            multiline
            onChangeText={(t) =>
              setPlanForm((prev) => ({
                ...prev,
                exercisesText: t,
              }))
            }
          />
          <View style={styles.modalActions}>
            {editingPlanId ? (
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalDeleteBtn]}
                onPress={handleDeletePlanEntry}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalCancelBtn]}
              onPress={() => setPlanModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalSaveBtn]}
              onPress={handleSavePlanEntry}
            >
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Quote API removed to avoid rate limits; use a static message instead.
  const staticQuote = "Push hard. Log every rep.";
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
      const { data, error } = await supabase
        .from("workouts")
        .select("id,date,duration_min,exercises")
        .order("date", { ascending: false })
        .limit(10);
      if (error) throw error;
      const mapped =
        data?.map((w: any) => ({
          _id: w.id,
          date: w.date,
          durationMin: w.duration_min,
          exercises: w.exercises || [],
        })) || [];
      setWorkouts(mapped);
    } catch (e: any) {
      setStatError("Could not load workout stats.");
      setWorkouts([]);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.04, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    loadWorkouts();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPlanFromStorage();
  }, [loadPlanFromStorage]);

  useEffect(() => {
    setWeekKey(getWeekKey());
    loadCompletedForWeek(getWeekKey());
  }, [loadCompletedForWeek]);

  useEffect(() => {
    const merged = [...baseDayOptions];
    weeklyPlan.forEach((p) => {
      const idx = merged.findIndex((d) => d.value === p.value);
      if (idx >= 0) {
        merged[idx] = { value: p.value, label: p.focus };
      } else {
        merged.push({ value: p.value, label: p.focus });
      }
    });
    setDayOptions(merged);
    const exists = merged.some((o) => o.value === selectedDay);
    if (!exists && merged.length) {
      setSelectedDay(merged[0].value);
    }
  }, [selectedDay, weeklyPlan]);

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
    () =>
      dayOptions.find((o) => o.value === selectedDay)?.label || "Training Day",
    [dayOptions, selectedDay]
  );

  const activePlan = useMemo(
    () => weeklyPlan.find((p) => p.value === selectedDay),
    [selectedDay, weeklyPlan]
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
        const { data, error } = await supabase
          .from("workouts")
          .select("exercises,date")
          .order("date", { ascending: false })
          .limit(10);
        if (error) throw error;
        const rows: any[] = Array.isArray(data) ? data : [];
        for (const row of rows) {
          const match = (row.exercises || []).find(
            (ex: any) => ex.exerciseId === exerciseId
          );
          if (match?.sets?.length) {
            const last = match.sets[match.sets.length - 1];
            const unitFromLast: Unit =
              last?.weightUnit === "lbs" ? "lbs" : "kg";
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
      const { data, error } = await supabase
        .from("exercises")
        .select("id,name,major_muscle_groups,training_days,is_active")
        .or("is_active.is.null,is_active.eq.true")
        .limit(100);
      if (error) throw error;
      const arr: ExerciseOption[] = Array.isArray(data)
        ? data.map((ex: any) => ({
            _id: ex.id,
            name: ex.name,
            majorMuscleGroups: ex.major_muscle_groups || [],
            trainingDays: ex.training_days || [],
          }))
        : [];
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
    setSessionExercises((prev) => {
      const idx = prev.findIndex((ex) => ex.key === exerciseKey);
      if (idx === -1) return prev;
      const removed = prev[idx];
      setLastRemovedExercise(removed);
      setLastRemovedIndex(idx);
      return prev.filter((ex) => ex.key !== exerciseKey);
    });
  };

  const undoRemoveExercise = () => {
    if (!lastRemovedExercise || lastRemovedIndex === null) return;
    setSessionExercises((prev) => {
      const exists = prev.find((ex) => ex.key === lastRemovedExercise.key);
      if (exists) return prev;
      const copy = [...prev];
      const idx = Math.min(Math.max(0, lastRemovedIndex), copy.length);
      copy.splice(idx, 0, lastRemovedExercise);
      return copy;
    });
    setLastRemovedExercise(null);
    setLastRemovedIndex(null);
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
        "Supabase config required",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      setError("Supabase is not configured.");
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
      user_id: "demo-user",
      date: now.toISOString(),
      started_at: startedAt ? startedAt.toISOString() : now.toISOString(),
      ended_at: now.toISOString(),
      duration_min: durationMin,
      exercises: sessionExercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: ex.sets.map((s) => ({
          reps: Number(s.reps) || 0,
          weight: s.weight ? Number(s.weight) : undefined,
          weightUnit: s.unit,
        })),
      })),
    };

    try {
      setSaving(true);
      const { error } = await supabase.from("workouts").insert([payload]);
      if (error) {
        console.warn("[supabase] save workout failed", error);
        throw error;
      }
      if (selectedDay) {
        markPlanCompleted(selectedDay);
      }
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <ScrollView
          contentContainerStyle={styles.starterScroll}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: colors.bg }}
        >
          <View style={styles.starterHeader}>
            <Text style={[styles.starterTitle, { color: colors.text }]}>
              This week&apos;s plan
            </Text>
            <Text style={[styles.starterSubtitle, { color: colors.muted }]}>
              Tap a day to jump in or edit the plan before you start.
            </Text>
          </View>

          <View style={styles.planHeaderRow}>
            <Text style={[styles.starterTitle, { color: colors.text }]}>
              Weekly Overview
            </Text>
            <TouchableOpacity
              style={[
                styles.planActionBtn,
                {
                  backgroundColor: colors.accentDark,
                  borderColor: colors.accent,
                },
              ]}
              onPress={() => openPlanModal()}
            >
              <Text style={[styles.planActionText, { color: colors.text }]}>
                + Add day
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.planScroll}>
            {weeklyPlan.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: plan.color || colors.border,
                  },
                ]}
                activeOpacity={0.9}
                onPress={() => startFromPlan(plan)}
              >
                <View style={styles.planCardHeader}>
                  <View>
                    <Text style={[styles.planDay, { color: colors.muted }]}>
                      {plan.dayLabel}
                    </Text>
                    <Text style={[styles.planFocus, { color: colors.text }]}>
                      {plan.focus}
                    </Text>
                  </View>
                  <View style={styles.planRightChips}>
                    {completedPlans.includes(plan.value) ? (
                      <View
                        style={[
                          styles.planDoneChip,
                          {
                            backgroundColor: colors.bg,
                            borderColor: colors.accentDark,
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={colors.accent}
                        />
                        <Text
                          style={[
                            styles.planDoneText,
                            { color: buttonTextColor },
                          ]}
                        >
                          Done
                        </Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={[
                        styles.planEditChip,
                        {
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        openPlanModal(plan);
                      }}
                    >
                      <Ionicons
                        name="create-outline"
                        size={14}
                        color={buttonTextColor}
                      />
                      <Text
                        style={[
                          styles.planEditText,
                          { color: buttonTextColor },
                        ]}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.planExercises}>
                  {plan.exercises.length === 0 ? (
                    <Text
                      style={[
                        styles.planExerciseTextFaint,
                        { color: colors.muted },
                      ]}
                    >
                      Add exercises to this day
                    </Text>
                  ) : null}
                  {plan.exercises.slice(0, 4).map((line, idx) => (
                    <View key={`${plan.id}-ex-${idx}`} style={styles.planLine}>
                      <View style={styles.planDot} />
                      <Text
                        style={[
                          styles.planExerciseText,
                          { color: colors.text },
                        ]}
                      >
                        {line}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.planFooterRow}>
                  <View
                    style={[
                      styles.planPill,
                      { backgroundColor: colors.accentDark || plan.color },
                    ]}
                  >
                    <Text
                      style={[styles.planPillText, { color: buttonTextColor }]}
                    >
                      Tap to start
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.planCard,
                styles.planAddCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => openPlanModal()}
              activeOpacity={0.9}
            >
              <Text style={[styles.planAddText, { color: buttonTextColor }]}>
                + New day
              </Text>
              <Text style={[styles.planAddHint, { color: colors.muted }]}>
                Build your own split
              </Text>
            </TouchableOpacity>
          </View>

          {lastRemovedPlan ? (
            <View style={styles.undoBar}>
              <Text style={styles.undoText}>
                Removed "{lastRemovedPlan.dayLabel}". Undo?
              </Text>
              <TouchableOpacity style={styles.undoBtn} onPress={undoRemovePlan}>
                <Text style={styles.undoBtnText}>Undo</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.dayPicker}>
            <TouchableOpacity
              style={[
                styles.dayPickerTrigger,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowDayList((v) => !v)}
            >
              <Text style={[styles.dayPickerLabel, { color: colors.muted }]}>
                Quick start
              </Text>
              <View style={styles.dayPickerValueRow}>
                <Text style={[styles.dayPickerValue, { color: colors.text }]}>
                  {selectedDayLabel}
                </Text>
                <Ionicons
                  name={showDayList ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.text}
                />
              </View>
            </TouchableOpacity>
            {showDayList && (
              <View
                style={[
                  styles.dayList,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {dayOptions.map((opt) => (
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
                        { color: colors.text },
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
            style={[
              styles.successBtn,
              {
                backgroundColor: colors.accentDark,
                borderColor: colors.accent,
              },
            ]}
            onPress={handleStart}
          >
            <Text style={[styles.successBtnText, { color: colors.text }]}>
              Start workout
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {planEditorModal}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
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
        {activePlan ? (
          <View
            style={[
              styles.activePlanCard,
              {
                backgroundColor: colors.card,
                borderColor: activePlan.color || colors.accent,
              },
            ]}
          >
            <View style={styles.activePlanHeader}>
              <View>
                <Text style={[styles.activePlanDay, { color: colors.text }]}>
                  {activePlan.dayLabel}
                </Text>
                <Text style={[styles.activePlanFocus, { color: colors.text }]}>
                  {activePlan.focus}
                </Text>
              </View>
              <View style={styles.planRightChips}>
                {completedPlans.includes(activePlan.value) ? (
                  <View style={styles.planDoneChip}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={colors.accent}
                    />
                    <Text style={[styles.planDoneText, { color: colors.text }]}>
                      Done
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.activePlanChip,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={[styles.activePlanChipText, { color: colors.text }]}
                  >
                    Plan
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.planExercises}>
              {activePlan.exercises.length === 0 ? (
                <Text style={styles.planExerciseTextFaint}>
                  Add exercises to this plan
                </Text>
              ) : null}
              {activePlan.exercises.slice(0, 5).map((line, idx) => (
                <View
                  key={`${activePlan.id}-live-${idx}`}
                  style={styles.planLine}
                >
                  <View
                    style={[styles.planDot, { backgroundColor: colors.accent }]}
                  />
                  <Text
                    style={[styles.planExerciseText, { color: colors.text }]}
                  >
                    {line}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.dayPicker}>
          <TouchableOpacity
            style={[
              styles.dayPickerTrigger,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => setShowDayList((v) => !v)}
          >
            <Text style={[styles.dayPickerLabel, { color: colors.muted }]}>
              Training Day
            </Text>
            <View style={styles.dayPickerValueRow}>
              <Text style={[styles.dayPickerValue, { color: colors.text }]}>
                {selectedDayLabel}
              </Text>
              <Ionicons
                name={showDayList ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.text}
              />
            </View>
          </TouchableOpacity>
          {showDayList && (
            <View
              style={[
                styles.dayList,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {dayOptions.map((opt) => (
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
                      { color: colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={[styles.caption, { color: colors.muted }]}>
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
                    backgroundColor: colors.card,
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
                    {ex.sets.length} sets - {ex.completed ? ex.sets.length : 0}{" "}
                    completed - {volume} kg
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
                    color={colors.text}
                  />
                  {ex.expanded ? (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => removeExercise(ex.key)}
                    >
                      <Ionicons name="trash" size={18} color={colors.text} />
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
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.accentDark, borderColor: colors.accent },
          ]}
          onPress={() => setShowExerciseList(true)}
        >
          <Text style={[styles.primaryBtnText, { color: colors.text }]}>
            + Add Exercise
          </Text>
        </TouchableOpacity>

        {lastRemovedExercise ? (
          <View style={styles.undoBar}>
            <Text style={styles.undoText}>
              Removed "{lastRemovedExercise.name}". Undo?
            </Text>
            <TouchableOpacity
              style={styles.undoBtn}
              onPress={undoRemoveExercise}
            >
              <Text style={styles.undoBtnText}>Undo</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.successBtn,
            {
              backgroundColor: colors.accentDark,
              borderColor: colors.accent,
            },
            saving && { opacity: 0.7 },
          ]}
          onPress={handleComplete}
          disabled={saving}
        >
          <Text style={[styles.successBtnText, { color: colors.text }]}>
            {saving ? "Saving..." : "Complete Workout"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      {planEditorModal}
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
    backgroundColor: "#0F1116",
    borderBottomWidth: 1,
    borderBottomColor: "#162029",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EAFDFC",
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#B7C6D4",
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
    backgroundColor: "#08E8DE",
  },
  unitText: {
    color: "#EAFDFC",
    fontSize: 12,
    fontWeight: "600",
  },
  unitTextActive: {
    color: "#0B0C0F",
  },
  endBtn: {
    backgroundColor: "#222",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#08E8DE",
  },
  endBtnText: {
    color: "#EAFDFC",
    fontSize: 12,
    fontWeight: "700",
  },
  caption: {
    textAlign: "center",
    color: "#B7C6D4",
    fontSize: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#0F1116",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#162029",
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
    color: "#EAFDFC",
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 11,
    color: "#B7C6D4",
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0F1116",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#162029",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EAFDFC",
    marginBottom: 10,
  },
  emptySet: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#162029",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#0F1116",
  },
  emptySetText: {
    color: "#B7C6D4",
    fontSize: 13,
  },
  addSetBtn: {
    borderWidth: 1,
    borderColor: "#162029",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#0F1116",
  },
  addSetText: {
    color: "#EAFDFC",
    fontSize: 14,
    fontWeight: "700",
  },
  setRow: {
    borderWidth: 1,
    borderColor: "#162029",
    borderRadius: 12,
    padding: 10,
    paddingRight: 12,
    marginBottom: 10,
    backgroundColor: "#0F1116",
    overflow: "hidden",
  },
  setIndex: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EAFDFC",
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
    color: "#B7C6D4",
    marginBottom: 4,
  },
  setInput: {
    borderWidth: 1,
    borderColor: "#162029",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#0F1116",
    color: "#EAFDFC",
  },
  finishExerciseBtn: {
    marginTop: 10,
    backgroundColor: "#222",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  finishExerciseText: {
    color: "#EAFDFC",
    fontWeight: "700",
    fontSize: 14,
  },
  finishedPill: {
    backgroundColor: "#0F1116",
    color: "#EAFDFC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
    fontWeight: "700",
    fontSize: 11,
    borderWidth: 1,
    borderColor: "#162029",
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
  iconBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0F1116",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#162029",
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
    borderWidth: 1,
    borderColor: "#222",
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
    borderWidth: 1,
    borderColor: "#444",
  },
  successBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  exerciseList: {
    backgroundColor: "#0F1116",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#162029",
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
    color: "#EAFDFC",
  },
  exerciseListItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#162029",
  },
  exerciseListName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EAFDFC",
  },
  exerciseListMeta: {
    fontSize: 12,
    color: "#B7C6D4",
    marginTop: 2,
  },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loaderText: {
    color: "#EAFDFC",
    fontSize: 13,
  },
  errorText: {
    color: "#08E8DE",
    fontSize: 13,
  },
  starter: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  starterScroll: {
    padding: 24,
    paddingBottom: 36,
  },
  starterHeader: {
    marginBottom: 10,
  },
  starterTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#EAFDFC",
    marginBottom: 8,
    textAlign: "center",
  },
  starterSubtitle: {
    fontSize: 14,
    color: "#B7C6D4",
    marginBottom: 20,
    textAlign: "center",
  },
  planHeaderRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  planActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  planScroll: {
    gap: 12,
    paddingVertical: 6,
    flexDirection: "column",
  },
  planCard: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    marginRight: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  planDay: {
    fontSize: 12,
    color: "#555",
    fontWeight: "700",
  },
  planFocus: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginTop: 4,
  },
  planEditChip: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planRightChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planEditText: {
    fontSize: 12,
    color: "#111",
    fontWeight: "700",
  },
  planDoneChip: {
    backgroundColor: "#E7F6EE",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#B1E0C1",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planDoneText: {
    fontSize: 12,
    color: "#0F5132",
    fontWeight: "700",
  },
  planExercises: {
    gap: 6,
    marginBottom: 12,
  },
  planLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#111",
  },
  planExerciseText: {
    fontSize: 13,
    color: "#111",
  },
  planExerciseTextFaint: {
    fontSize: 13,
    color: "#555",
  },
  planFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planPill: {
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  planPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  planAddCard: {
    backgroundColor: "#f8f8f8",
    borderStyle: "dashed",
    borderColor: "#D3D3D3",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  planAddText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  planAddHint: {
    marginTop: 6,
    color: "#777",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: "#F9F9F9",
  },
  modalTextarea: {
    height: 120,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalDeleteBtn: {
    borderColor: "#E57373",
    backgroundColor: "#FBECEC",
  },
  modalDeleteText: {
    color: "#B71C1C",
    fontWeight: "700",
  },
  modalCancelBtn: {
    borderColor: "#D7D7D7",
    backgroundColor: "#F5F5F5",
  },
  modalCancelText: {
    color: "#333",
    fontWeight: "700",
  },
  modalSaveBtn: {
    borderColor: "#111",
    backgroundColor: "#111",
  },
  modalSaveText: {
    color: "#fff",
    fontWeight: "800",
  },
  undoBar: {
    marginTop: 10,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  undoText: {
    color: "#fff",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  undoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  undoBtnText: {
    color: "#111",
    fontWeight: "800",
    fontSize: 13,
  },
  activePlanCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  activePlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activePlanDay: {
    fontSize: 12,
    color: "#333",
    fontWeight: "700",
  },
  activePlanFocus: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    marginTop: 2,
  },
  activePlanChip: {
    backgroundColor: "#111",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  activePlanChipText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
});
