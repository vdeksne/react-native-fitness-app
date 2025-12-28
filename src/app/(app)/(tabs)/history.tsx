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

type WorkoutSet = { reps?: number; weight?: number; weightUnit?: string };
type WorkoutExercise = { name: string; sets: WorkoutSet[] };
type WorkoutDoc = {
  _id: string;
  date?: string;
  durationMin?: number;
  exercises: WorkoutExercise[];
};

export default function History() {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.link}>History</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Record</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryTitle}>Latest Workout</Text>
            {workouts.length ? (
              <TouchableOpacity
                style={[styles.clearBtn, saving && { opacity: 0.6 }]}
                onPress={clearWorkouts}
                disabled={saving}
              >
                <Text style={styles.clearBtnText}>
                  {saving ? "Clearing..." : "Clear"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator color="#1E3DF0" />
              <Text style={styles.loaderText}>Loading...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={16} color="#777" />
                <Text style={styles.summaryText}>{summary.date}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={16} color="#777" />
                <Text style={styles.summaryText}>{summary.duration}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="barbell-outline" size={16} color="#777" />
                <Text style={styles.summaryText}>
                  {summary.exerciseCount} exercises
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="stats-chart-outline" size={16} color="#777" />
                <Text style={styles.summaryText}>{summary.setCount} total sets</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="fitness-outline" size={16} color="#777" />
                <Text style={styles.summaryText}>{summary.volume} total volume</Text>
              </View>
            </>
          )}
        </View>

        {loading ? null : workouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts saved yet.</Text>
        ) : (
          workouts.map((w) => (
            <View key={w._id} style={{ marginBottom: 16 }}>
              <Text style={styles.workoutDate}>
                {w.date ? new Date(w.date).toLocaleString() : "Unknown date"}
              </Text>
              <TouchableOpacity
                style={styles.deletePill}
                onPress={() => deleteWorkout(w._id)}
              >
                <Text style={styles.deletePillText}>Delete</Text>
              </TouchableOpacity>
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
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: {
    color: "#111",
    fontSize: 14,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 12,
    shadowColor: "transparent",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
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
    color: "#444",
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
    color: "#222",
    fontSize: 13,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F5F5F5",
  },
  clearBtnText: {
    color: "#C83737",
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
    color: "#444",
    marginTop: 12,
  },
  workoutDate: {
    fontSize: 13,
    color: "#444",
    marginBottom: 8,
    marginLeft: 4,
  },
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
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
    color: "#111",
  },
  exerciseMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#555",
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#555",
    marginBottom: 6,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f6f6f6",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  setIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e6e6e6",
    color: "#111",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
    textAlignVertical: "center",
    marginRight: 8,
  },
  setLabel: {
    fontSize: 13,
    color: "#222",
  },
  setWeight: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  volumeLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#555",
  },
  volumeValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  deletePill: {
    alignSelf: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F5F5F5",
    marginBottom: 8,
  },
  deletePillText: {
    color: "#C83737",
    fontWeight: "800",
    fontSize: 12,
  },
});
