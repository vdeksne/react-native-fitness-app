import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { ExerciseItem } from "../(app)/(tabs)/exercises";

type Props = {
  item: ExerciseItem;
};

export default function ExerciseCard({ item }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>
        {item.muscle ? `Muscle: ${item.muscle}` : ""}{" "}
        {item.type ? `• Type: ${item.type}` : ""}
      </Text>
      {item.targets?.length || item.secondaryTargets?.length ? (
        <Text style={styles.meta}>
          {item.targets?.length ? `Targets: ${item.targets.join(", ")}` : ""}
          {item.targets?.length && item.secondaryTargets?.length ? " | " : ""}
          {item.secondaryTargets?.length
            ? `Secondary: ${item.secondaryTargets.join(", ")}`
            : ""}
        </Text>
      ) : null}
      {item.majorMuscleGroups?.length ? (
        <Text style={styles.meta}>
          Major Muscle Groups: {item.majorMuscleGroups.join(", ")}
        </Text>
      ) : null}
      {item.trainingDays?.length ? (
        <Text style={styles.meta}>
          Training Day: {item.trainingDays.join(", ")}
        </Text>
      ) : null}
      {item.bodyParts?.length ? (
        <Text style={styles.meta}>Body parts: {item.bodyParts.join(", ")}</Text>
      ) : null}
      {item.equipments?.length ? (
        <Text style={styles.meta}>Equipment: {item.equipments.join(", ")}</Text>
      ) : null}
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}
      <Text style={styles.desc}>{item.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  name: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  meta: { fontSize: 13, color: "#666", marginBottom: 6 },
  desc: { fontSize: 14, color: "#333" },
});
