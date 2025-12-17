import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function History() {
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
          <Text style={styles.summaryTitle}>Workout Summary</Text>

          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={16} color="#777" />
            <Text style={styles.summaryText}>Tuesday, July 1, 2025 at 6:04 PM</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={16} color="#777" />
            <Text style={styles.summaryText}>2m 4s</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="barbell-outline" size={16} color="#777" />
            <Text style={styles.summaryText}>2 exercises</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="stats-chart-outline" size={16} color="#777" />
            <Text style={styles.summaryText}>3 total sets</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="fitness-outline" size={16} color="#777" />
            <Text style={styles.summaryText}>14 kg total volume</Text>
          </View>

          <TouchableOpacity style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>

        <ExerciseCard
          name="Bench Press"
          setsCompleted={1}
          sets={[
            { label: "1 reps", weight: "1 kg" },
          ]}
          volume="1 kg"
        />

        <ExerciseCard
          name="Lat Pulldown"
          setsCompleted={2}
          sets={[
            { label: "2 reps", weight: "2 kg" },
            { label: "3 reps", weight: "3 kg" },
          ]}
          volume="13 kg"
        />
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
  link: {
    color: "#1E3DF0",
    fontSize: 14,
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
    borderColor: "#E8E8E8",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    color: "#555",
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
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
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
    color: "#777",
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#1E3DF0",
    fontWeight: "700",
    fontSize: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 6,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8FB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  setIndex: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E1E8F7",
    color: "#1E3DF0",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
    textAlignVertical: "center",
    marginRight: 8,
  },
  setLabel: {
    fontSize: 13,
    color: "#444",
  },
  setWeight: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  volumeLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#777",
  },
  volumeValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
});
