import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { client, config as sanityConfig } from "../../../../sanity/client";

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

  const dataset = sanityConfig.dataset || "fitness-app";
  const apiVersion = sanityConfig.apiVersion || "2023-10-12";
  const readClient = client.withConfig({ dataset, apiVersion });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
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
    const avgMinutes = totalWorkouts ? Math.round(totalMinutes / totalWorkouts) : 0;

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

    return { totalWorkouts, totalMinutes, avgMinutes, weeklySets, weeklyVolumeKg };
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
          <ActivityIndicator color="#1E3DF0" />
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
              <View style={styles.placeholderChart} />
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

        {/* Last Workouts */}
        <Text style={styles.sectionTitle}>Last Workouts</Text>
        {loading ? (
          <ActivityIndicator color="#1E3DF0" />
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
    backgroundColor: "#F7F7F7",
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
    color: "#666",
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
    borderColor: "#EAEAEA",
    shadowColor: "#000",
    shadowOpacity: 0.04,
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
    color: "#777",
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
    color: "#777",
  },
  placeholderChart: {
    marginTop: 8,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FDE7EB",
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
