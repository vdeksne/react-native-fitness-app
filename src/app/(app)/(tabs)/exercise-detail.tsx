import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function ExerciseDetail() {
  const params = useLocalSearchParams<{
    name?: string;
    description?: string;
    difficulty?: string;
    image?: string;
    video?: string;
    muscles?: string;
    days?: string;
    type?: string;
  }>();

  const router = useRouter();
  const chips = (value?: string) =>
    value
      ?.split(",")
      .map((v) => v.trim())
      .filter(Boolean) || [];

  const openVideo = () => {
    if (params.video) {
      Linking.openURL(params.video).catch(() => {});
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{params.name || "Exercise"}</Text>
      <Text style={styles.meta}>
        {params.difficulty || "Unknown difficulty"}
      </Text>
      {params.type ? <Text style={styles.metaMuted}>{params.type}</Text> : null}

      {params.image ? (
        <Image
          source={{ uri: params.image }}
          style={styles.hero}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.body}>
          {params.description || "No description provided."}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Major muscle groups</Text>
        <View style={styles.chipRow}>
          {chips(params.muscles).length === 0 ? (
            <Text style={styles.metaMuted}>Not specified</Text>
          ) : (
            chips(params.muscles).map((m) => (
              <View key={m} style={styles.chip}>
                <Text style={styles.chipText}>{m}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training days</Text>
        <View style={styles.chipRow}>
          {chips(params.days).length === 0 ? (
            <Text style={styles.metaMuted}>Not specified</Text>
          ) : (
            chips(params.days).map((d) => (
              <View key={d} style={styles.chip}>
                <Text style={styles.chipText}>{d}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Media</Text>
        {params.video ? (
          <TouchableOpacity style={styles.button} onPress={openVideo}>
            <Text style={styles.buttonText}>Open video</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.metaMuted}>No video provided</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16 },
  back: { color: "#111", marginBottom: 8, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 4 },
  meta: { fontSize: 14, color: "#333", marginBottom: 4, fontWeight: "700" },
  metaMuted: { fontSize: 13, color: "#666" },
  hero: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#E6E6E6",
    marginVertical: 12,
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#666", fontWeight: "700" },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },
  body: { fontSize: 14, color: "#222", lineHeight: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EAEAEA",
    borderRadius: 10,
  },
  chipText: { fontSize: 13, color: "#111", fontWeight: "700" },
  button: {
    marginTop: 8,
    backgroundColor: "#222",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
