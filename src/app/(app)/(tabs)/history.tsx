import React, { useEffect, useState, useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabaseSafe as supabase } from "../../../lib/supabase";
import { useTheme } from "../../../context/ThemeContext";

type WorkoutSet = { reps?: number; weight?: number; weightUnit?: string };
type WorkoutExercise = { name: string; sets: WorkoutSet[] };
type WorkoutDoc = {
  _id: string;
  date?: string;
  durationMin?: number;
  exercises: WorkoutExercise[];
};

export default function History() {
  const { colors } = useTheme();
  const [workouts, setWorkouts] = useState<WorkoutDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from("workouts")
          .select("id,date,duration_min,exercises")
          .order("date", { ascending: false })
          .limit(10);
        if (error) throw error;
        const arr: WorkoutDoc[] = Array.isArray(data)
          ? data.map((w: any) => ({
              _id: w.id,
              date: w.date,
              durationMin: w.duration_min,
              exercises: w.exercises || [],
            }))
          : [];
        setWorkouts(arr);
      } catch (e: any) {
        setError("Could not load workout history.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const deleteWorkout = async (id: string) => {
    Alert.alert("Delete workout", "Remove this workout from history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setWorkouts((prev) => prev.filter((w) => w._id !== id));
          try {
            await supabase.from("workouts").delete().eq("id", id);
          } catch {
            // ignore for now
          }
        },
      },
    ]);
  };

  const clearWorkouts = () => {
    if (!workouts.length) return;
    Alert.alert("Clear history", "Remove all workouts from history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setSaving(true);
          supabase
            .from("workouts")
            .delete()
            .then(() => setWorkouts([]))
            .finally(() => setSaving(false));
        },
      },
    ]);
  };

  const latest = workouts[0];

  const summary = useMemo(() => {
    if (!latest) {
      return {
        date: "No workouts yet",
        duration: "--",
        exerciseCount: 0,
        setCount: 0,
        volume: "--",
      };
    }
    const setCount = latest.exercises.reduce(
      (acc, ex) => acc + (ex.sets?.length || 0),
      0
    );
    const volumeKg = latest.exercises.reduce((acc, ex) => {
      return (
        acc +
        ex.sets.reduce((sacc, set) => {
          const reps = set.reps || 0;
          const weight = set.weight || 0;
          return sacc + reps * weight;
        }, 0)
      );
    }, 0);

    return {
      date: latest.date
        ? new Date(latest.date).toLocaleString()
        : "Unknown date",
      duration: latest.durationMin ? `${latest.durationMin} min` : "--",
      exerciseCount: latest.exercises.length,
      setCount,
      volume: `${volumeKg} kg`,
    };
  }, [latest]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity>
          <Text style={[styles.link, { color: colors.text }]}>History</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Workout Record
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryHeaderRow}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Latest Workout
            </Text>
            {workouts.length ? (
              <TouchableOpacity
                style={[
                  styles.clearBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  saving && { opacity: 0.6 },
                ]}
                onPress={clearWorkouts}
                disabled={saving}
              >
                <Text style={[styles.clearBtnText, { color: colors.text }]}>
                  {saving ? "Clearing..." : "Clear"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.loaderText, { color: colors.text }]}>
                Loading...
              </Text>
            </View>
          ) : error ? (
            <Text style={[styles.errorText, { color: colors.accent }]}>{error}</Text>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.muted} />
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  {summary.date}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={16} color={colors.muted} />
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  {summary.duration}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="barbell-outline" size={16} color={colors.muted} />
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  {summary.exerciseCount} exercises
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="stats-chart-outline" size={16} color={colors.muted} />
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  {summary.setCount} total sets
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="fitness-outline" size={16} color={colors.muted} />
                <Text style={[styles.summaryText, { color: colors.text }]}>
                  {summary.volume} total volume
                </Text>
              </View>
            </>
          )}
        </View>

        {loading ? null : workouts.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No workouts saved yet.
          </Text>
        ) : (
          workouts.map((w) => (
            <View
              key={w._id}
              style={[
                styles.workoutBlock,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.workoutHeaderRow}>
                <Text style={[styles.workoutDate, { color: colors.text }]}>
                  {w.date ? new Date(w.date).toLocaleString() : "Unknown date"}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.deletePill,
                    { backgroundColor: colors.card, borderColor: colors.accent },
                  ]}
                  onPress={() => deleteWorkout(w._id)}
                >
                  <Text style={[styles.deletePillText, { color: colors.text }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
              {w.exercises.map((ex, idx) => (
                <ExerciseCard
                  key={`${w._id}-${idx}`}
                  name={ex.name}
                  setsCompleted={ex.sets.length}
                  sets={ex.sets.map((s) => ({
                    label: `${s.reps || 0} reps`,
                    weight: s.weight ? `${s.weight} ${s.weightUnit || "kg"}` : "Bodyweight",
                  }))}
                  volume={`${ex.sets.reduce((acc, s) => acc + (s.reps || 0) * (s.weight || 0), 0)} kg`}
                  themeColors={{
                    card: colors.card,
                    border: colors.border,
                    text: colors.text,
                    muted: colors.muted,
                  }}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type SetRow = { label: string; weight: string };

function ExerciseCard({
  name,
  setsCompleted,
  sets,
  volume,
}: {
  name: string;
  setsCompleted: number;
  sets: SetRow[];
  volume: string;
}) {
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View>
          <Text style={styles.exerciseTitle}>{name}</Text>
          <Text style={styles.exerciseMeta}>
            {setsCompleted} {setsCompleted === 1 ? "set" : "sets"} completed
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{setsCompleted}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Sets:</Text>
      {sets.map((s, idx) => (
        <View key={`${name}-${idx}`} style={styles.setRow}>
          <Text style={styles.setIndex}>{idx + 1}</Text>
          <Text style={styles.setLabel}>{s.label}</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.setWeight}>{s.weight}</Text>
        </View>
      ))}

      <Text style={styles.volumeLabel}>Exercise Volume:</Text>
      <Text style={styles.volumeValue}>{volume}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0C0F",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0B0C0F",
    borderBottomWidth: 1,
    borderBottomColor: "#162029",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: {
    color: "#EAFDFC",
    fontSize: 14,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EAFDFC",
  },
  summaryCard: {
    backgroundColor: "#0F1116",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#162029",
    marginBottom: 12,
    shadowColor: "transparent",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EAFDFC",
    marginBottom: 10,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    color: "#B7C6D4",
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
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#162029",
    backgroundColor: "#0F1116",
  },
  clearBtnText: {
    color: "#08E8DE",
    fontWeight: "800",
    fontSize: 12,
  },
  deleteBtn: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: "#D9534F",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  emptyText: {
    textAlign: "center",
    color: "#B7C6D4",
    marginTop: 12,
  },
  workoutDate: {
    fontSize: 13,
    color: "#B7C6D4",
    marginBottom: 8,
    marginLeft: 4,
  },
  exerciseCard: {
    backgroundColor: "#0F1116",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#162029",
    marginBottom: 12,
    shadowColor: "transparent",
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  exerciseTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EAFDFC",
  },
  exerciseMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#B7C6D4",
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#121820",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#EAFDFC",
    fontWeight: "700",
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#B7C6D4",
    marginBottom: 6,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111821",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  setIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#162029",
    color: "#EAFDFC",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
    textAlignVertical: "center",
    marginRight: 8,
  },
  setLabel: {
    fontSize: 13,
    color: "#EAFDFC",
  },
  setWeight: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EAFDFC",
  },
  volumeLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#B7C6D4",
  },
  volumeValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EAFDFC",
  },
  deletePill: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#162029",
    backgroundColor: "#0F1116",
    marginBottom: 8,
  },
  deletePillText: {
    color: "#EAFDFC",
    fontWeight: "800",
    fontSize: 12,
  },
});
