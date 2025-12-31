import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { ExerciseItem } from "../(app)/(tabs)/exercises";

type Props = {
  item: ExerciseItem;
  themeColors?: {
    card: string;
    border: string;
    text: string;
    muted: string;
  };
};

export default function ExerciseCard({ item, themeColors }: Props) {
  const cardColor = themeColors?.card || "#fff";
  const borderColor = themeColors?.border || "#eee";
  const textColor = themeColors?.text || "#111";
  const mutedColor = themeColors?.muted || "#666";
  const imageUri = item.image?.trim();
  const safeImage =
    imageUri && imageUri !== "{}" && imageUri.toLowerCase() !== "undefined"
      ? imageUri
      : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: cardColor, borderColor: borderColor },
      ]}
    >
      <Text style={[styles.name, { color: textColor }]}>{item.name}</Text>
      <Text style={[styles.meta, { color: mutedColor }]}>
        {item.muscle ? `Muscle: ${item.muscle}` : ""}{" "}
        {item.type ? `• Type: ${item.type}` : ""}
      </Text>
      {item.targets?.length || item.secondaryTargets?.length ? (
        <Text style={[styles.meta, { color: mutedColor }]}>
          {item.targets?.length ? `Targets: ${item.targets.join(", ")}` : ""}
          {item.targets?.length && item.secondaryTargets?.length ? " | " : ""}
          {item.secondaryTargets?.length
            ? `Secondary: ${item.secondaryTargets.join(", ")}`
            : ""}
        </Text>
      ) : null}
      {item.majorMuscleGroups?.length ? (
        <Text style={[styles.meta, { color: mutedColor }]}>
          Major Muscle Groups: {item.majorMuscleGroups.join(", ")}
        </Text>
      ) : null}
      {item.trainingDays?.length ? (
        <Text style={[styles.meta, { color: mutedColor }]}>
          Training Day: {item.trainingDays.join(", ")}
        </Text>
      ) : null}
      {item.bodyParts?.length ? (
        <Text style={[styles.meta, { color: mutedColor }]}>
          Body parts: {item.bodyParts.join(", ")}
        </Text>
      ) : null}
      {item.equipments?.length ? (
        <Text style={[styles.meta, { color: mutedColor }]}>
          Equipment: {item.equipments.join(", ")}
        </Text>
      ) : null}
      {safeImage ? (
        <Image
          source={{ uri: safeImage }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}
      <Text style={[styles.desc, { color: textColor }]}>
        {item.description}
      </Text>
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
