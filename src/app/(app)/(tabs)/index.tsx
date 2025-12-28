import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { supabaseSafe as supabase } from "../../../lib/supabase";

type WorkoutDoc = {
  _id: string;
  date?: string;
  durationMin?: number;
  exercises?: {
    name?: string;
    sets?: { reps?: number; weight?: number; weightUnit?: string }[];
  }[];
};

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutDoc[]>([]);
  const [viewMode, setViewMode] = useState<"week" | "month" | "year">("month");

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
        const mapped =
          data?.map((w: any) => ({
            _id: w.id,
            date: w.date,
            durationMin: w.duration_min,
            exercises: w.exercises || [],
          })) || [];
        setWorkouts(mapped);
      } catch (e: any) {
        setError("Could not load workout stats.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    if (!workouts.length) {
      return {
        totalWorkouts: 0,
        totalMinutes: 0,
        avgMinutes: 0,
        weeklySets: 0,
        weeklyVolumeKg: 0,
      };
    }
    const totalWorkouts = workouts.length;
    const totalMinutes = workouts.reduce(
      (acc, w) => acc + (w.durationMin || 0),
      0
    );
    const avgMinutes = totalWorkouts
      ? Math.round(totalMinutes / totalWorkouts)
      : 0;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    let weeklySets = 0;
    let weeklyVolumeKg = 0;
    workouts.forEach((w) => {
      const ts = w.date ? new Date(w.date).getTime() : 0;
      if (ts >= weekAgo) {
        w.exercises?.forEach((ex) => {
          ex.sets?.forEach((s) => {
            const reps = s.reps || 0;
            const weight = s.weight || 0;
            weeklySets += 1;
            // assume kg if not provided
            weeklyVolumeKg += reps * weight;
          });
        });
      }
    });

    return {
      totalWorkouts,
      totalMinutes,
      avgMinutes,
      weeklySets,
      weeklyVolumeKg,
    };
  }, [workouts]);

  const lastWorkouts = useMemo(() => {
    return workouts.slice(0, 3).map((w) => {
      const title = w.date
        ? new Date(w.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "Recent";
      const duration = w.durationMin ? `${w.durationMin} min` : "--";
      const setCount = w.exercises?.reduce(
        (acc, ex) => acc + (ex.sets?.length || 0),
        0
      );
      const volume = w.exercises?.reduce((acc, ex) => {
        return (
          acc +
          (ex.sets || []).reduce((sAcc, s) => {
            const reps = s.reps || 0;
            const weight = s.weight || 0;
            return sAcc + reps * weight;
          }, 0)
        );
      }, 0);
      const summary = `${setCount || 0} sets | ${volume || 0} kg`;
      return { title, duration, summary };
    });
  }, [workouts]);

  const today = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
    const month = now.toLocaleDateString(undefined, { month: "long" });
    const day = now.getDate();
    return `${weekday}, ${month} ${day}`;
  }, []);

  const workoutDateSet = useMemo(() => {
    const set = new Set<string>();
    workouts.forEach((w) => {
      if (w.date) {
        const d = new Date(w.date);
        set.add(d.toDateString());
      }
    });
    return set;
  }, [workouts]);

  const calendarMonthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, []);

  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmpty = start.getDay(); // 0 = Sunday
    const days: {
      key: string;
      label: string;
      isToday: boolean;
      hasWorkout: boolean;
    }[] = [];

    for (let i = 0; i < leadingEmpty; i++) {
      days.push({
        key: `empty-${i}`,
        label: "",
        isToday: false,
        hasWorkout: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const current = new Date(year, month, d);
      const isToday = current.toDateString() === new Date().toDateString();
      const hasWorkout = workoutDateSet.has(current.toDateString());
      days.push({
        key: `day-${d}`,
        label: String(d),
        isToday,
        hasWorkout,
      });
    }
    return days;
  }, [workoutDateSet]);

  const weekDays = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // Sunday start
    const days: {
      key: string;
      label: string;
      isToday: boolean;
      hasWorkout: boolean;
    }[] = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const isToday = current.toDateString() === now.toDateString();
      const hasWorkout = workoutDateSet.has(current.toDateString());
      days.push({
        key: `week-${i}`,
        label: current.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
        }),
        isToday,
        hasWorkout,
      });
    }
    return days;
  }, [workoutDateSet]);

  const yearMonths = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const counts = Array.from({ length: 12 }, () => 0);
    workouts.forEach((w) => {
      if (w.date) {
        const d = new Date(w.date);
        if (d.getFullYear() === year) {
          counts[d.getMonth()] += 1;
        }
      }
    });
    return counts.map((count, idx) => ({
      key: `month-${idx}`,
      label: new Date(year, idx, 1).toLocaleDateString(undefined, {
        month: "short",
      }),
      count,
    }));
  }, [workouts]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Image
              source={{
                uri: "https://media.licdn.com/dms/image/v2/D4E03AQHcrn61J7Kujg/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1690920703856?e=1767830400&v=beta&t=6ybsVAxwOmhRFTV8w-KMmEAwcPAmdFc-9s0se84G3SU",
              }}
              style={styles.avatarImage}
            />
          </View>
          <View>
            <Text style={styles.greeting}>Hello Viktorija!</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
        </View>

        {/* Workout Statistics */}
        <Text style={styles.sectionTitle}>Workout Statistics</Text>
        {loading ? (
          <ActivityIndicator color="#111" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.statsGrid}>
            <View style={[styles.card, styles.cardSmall]}>
              <Text style={styles.cardLabel}>Total Workouts</Text>
              <Text style={styles.cardValue}>{stats.totalWorkouts}</Text>
            </View>
            <View style={[styles.card, styles.cardSmall]}>
              <Text style={styles.cardLabel}>Average Duration</Text>
              <Text style={styles.cardValue}>{stats.avgMinutes} min</Text>
            </View>
            <View style={[styles.card, styles.cardSmall]}>
              <Text style={styles.cardLabel}>Total Time</Text>
              <Text style={styles.cardValue}>
                {Math.round(stats.totalMinutes / 60)} h
              </Text>
            </View>
            <View style={[styles.card, styles.cardSmall]}>
              <Text style={styles.cardLabel}>Weekly Volume</Text>
              <Text style={styles.cardValue}>{stats.weeklySets} sets</Text>
              <Text style={styles.cardSubValue}>
                {stats.weeklyVolumeKg} kg lifted
              </Text>
            </View>
            <View style={[styles.card, styles.cardSmall]}>
              <Text style={styles.cardLabel}>Active Streak</Text>
              <Text style={styles.cardValue}>—</Text>
            </View>
            <View style={[styles.card, styles.cardSmall]}>
              <Text style={styles.cardLabel}>Best Streak</Text>
              <Text style={styles.cardValue}>—</Text>
            </View>
          </View>
        )}

        {/* Calendar */}
        <Text style={styles.sectionTitle}>Workout Calendar</Text>
        <View style={[styles.card, styles.calendarCard]}>
          <View style={styles.viewTabs}>
            {["week", "month", "year"].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.viewTab,
                  viewMode === mode && styles.viewTabActive,
                ]}
                onPress={() => setViewMode(mode as "week" | "month" | "year")}
              >
                <Text
                  style={[
                    styles.viewTabText,
                    viewMode === mode && styles.viewTabTextActive,
                  ]}
                >
                  {mode[0].toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarMonth}>{calendarMonthLabel}</Text>
            <Text style={styles.calendarLegend}>● Workout | ○ Today</Text>
          </View>
          {viewMode === "week" && (
            <View style={styles.weekGrid}>
              {weekDays.map((day) => (
                <View key={day.key} style={styles.weekCell}>
                  <Text style={styles.weekLabel}>{day.label}</Text>
                  <View
                    style={[
                      styles.calendarDot,
                      day.hasWorkout && styles.calendarDotActive,
                      day.isToday && styles.calendarDotToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        (day.hasWorkout || day.isToday) &&
                          styles.calendarDayTextActive,
                      ]}
                    >
                      {day.label.split(" ")[1]}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {viewMode === "month" && (
            <>
              <View style={styles.calendarWeekRow}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                  <Text key={`${d}-${idx}`} style={styles.calendarWeekday}>
                    {d}
                  </Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {calendarDays.map((day) => (
                  <View key={day.key} style={styles.calendarCell}>
                    {day.label ? (
                      <View
                        style={[
                          styles.calendarDot,
                          day.hasWorkout && styles.calendarDotActive,
                          day.isToday && styles.calendarDotToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            (day.hasWorkout || day.isToday) &&
                              styles.calendarDayTextActive,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          )}

          {viewMode === "year" && (
            <View style={styles.yearGrid}>
              {yearMonths.map((m) => (
                <View key={m.key} style={styles.yearCell}>
                  <Text style={styles.yearLabel}>{m.label}</Text>
                  <Text style={styles.yearCount}>{m.count} workouts</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Last Workouts */}
        <Text style={styles.sectionTitle}>Last Workouts</Text>
        {loading ? (
          <ActivityIndicator color="#111" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.list}>
            {lastWorkouts.map((item, idx) => (
              <View key={`${item.title}-${idx}`} style={styles.listItem}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listDuration}>{item.duration}</Text>
                <Text style={styles.listSummary}>{item.summary}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F4F4",
  },
  scroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFEFEF",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  greeting: {
    fontSize: 16,
    color: "#555",
    marginBottom: 2,
  },
  date: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCDCDC",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  cardSmall: {
    width: "48%",
    minHeight: 110,
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  cardSubValue: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },
  calendarCard: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  calendarLegend: {
    fontSize: 12,
    color: "#666",
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  calendarWeekday: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    color: "#777",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    width: "14.28%",
    paddingVertical: 6,
    alignItems: "center",
  },
  calendarDot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#D1D1D1",
  },
  calendarDotActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  calendarDotToday: {
    borderColor: "#111",
  },
  calendarDayText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "600",
  },
  calendarDayTextActive: {
    color: "#F5F5F5",
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  weekCell: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekLabel: {
    fontSize: 12,
    color: "#555",
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  yearCell: {
    width: "30%",
    backgroundColor: "#F3F3F3",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#DADADA",
  },
  yearLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  yearCount: {
    fontSize: 12,
    color: "#555",
  },
  viewTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  viewTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8D8D8",
    backgroundColor: "#F2F2F2",
  },
  viewTabActive: {
    backgroundColor: "#DCDCDC",
    borderColor: "#BDBDBD",
  },
  viewTabText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "600",
  },
  viewTabTextActive: {
    color: "#111",
  },
  placeholderChart: {
    marginTop: 8,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E5E5E5",
  },
  list: {
    gap: 12,
  },
  listItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  listTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  listDuration: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  listSummary: {
    marginTop: 4,
    fontSize: 13,
    color: "#777",
  },
  errorText: {
    color: "#C83737",
    fontSize: 13,
    marginBottom: 12,
  },
});
