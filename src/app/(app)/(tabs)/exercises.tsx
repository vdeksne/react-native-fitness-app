import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import Constants from "expo-constants";
import ExerciseCard from "../../components/ExerciseCard";
import { client } from "../../../../sanity/client";

type ApiExercise = {
  exerciseId: string;
  name: string;
  imageUrl?: string;
  videoUrl?: string;
  equipments?: string[];
  bodyParts?: string[];
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  exerciseType?: string;
  instructions?: string | string[];
};

export type ExerciseItem = {
  name: string;
  difficulty: string;
  description: string;
  muscle?: string;
  type?: string;
  image?: string;
  targets?: string[];
  secondaryTargets?: string[];
  bodyParts?: string[];
  equipments?: string[];
  video?: string;
  majorMuscleGroups?: string[];
  trainingDays?: string[];
};

export default function Exercises() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"api" | "local">("api");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ExerciseItem[]>([]);

  const apiKey =
    process.env.EXPO_PUBLIC_EXERCISEDB_KEY ||
    Constants.expoConfig?.extra?.exerciseDbApiKey ||
    "";

  const baseUrl =
    process.env.EXPO_PUBLIC_EXERCISEDB_BASE_URL ||
    Constants.expoConfig?.extra?.exerciseDbBaseUrl ||
    "https://exercisedb-api1.p.rapidapi.com/api/v1";

  const hostHeader =
    process.env.EXPO_PUBLIC_EXERCISEDB_HOST ||
    Constants.expoConfig?.extra?.exerciseDbHost ||
    "exercisedb-api1.p.rapidapi.com";

  const sanityProjectId =
    process.env.EXPO_PUBLIC_SANITY_PROJECT_ID ||
    Constants.expoConfig?.extra?.sanityProjectId ||
    "";
  const sanityDataset =
    process.env.EXPO_PUBLIC_SANITY_DATASET ||
    Constants.expoConfig?.extra?.sanityDataset ||
    "production";
  const sanityApiVersion =
    process.env.EXPO_PUBLIC_SANITY_API_VERSION ||
    Constants.expoConfig?.extra?.sanityApiVersion ||
    "2023-10-12";
  const sanityToken =
    process.env.EXPO_PUBLIC_SANITY_TOKEN ||
    Constants.expoConfig?.extra?.sanityToken ||
    "";

  const fetchLocalExercises = useCallback(async (q: string) => {
    // Use Sanity JS client to avoid manual fetch/CORS issues
    if (!q.trim()) return [];
    const data = await client.fetch(
      `*[_type == "exercise" && isActive != false && name match $q]{
        name,
        description,
        difficulty,
        "image": image.asset->url,
        majorMuscleGroups,
        trainingDays,
        videoUrl
      }`,
      { q: `${q}*` }
    );
    const arr: any[] = Array.isArray(data) ? data : [];
    return arr.map(
      (ex): ExerciseItem => ({
        name: ex.name,
        difficulty: ex.difficulty || "unknown",
        description: ex.description || "No description provided.",
        muscle: undefined,
        type: undefined,
        image: ex.image,
        majorMuscleGroups: ex.majorMuscleGroups,
        trainingDays: ex.trainingDays,
        video: ex.videoUrl,
      })
    );
  }, []);

  const fetchExercises = useCallback(async () => {
    if (!query.trim()) {
      setItems([]);
      setError(null);
      return;
    }
    if (source === "api" && !apiKey) {
      setError(
        "Missing API key. Set EXPO_PUBLIC_EXERCISEDB_KEY (or exerciseDbApiKey in app config)."
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = query.trim();
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/385971b8-cc31-45e9-9e03-082c407e98ee",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "pre-fix-1",
            hypothesisId: "H1",
            location: "exercises.tsx:fetchExercises:start",
            message: "fetchExercises start",
            data: { source, query: q },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => {});
      // #endregion
      if (source === "api") {
        const url = `${baseUrl}/exercises/search?search=${encodeURIComponent(
          q
        )}`;
        const res = await fetch(url, {
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": hostHeader,
          },
        });
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const json = await res.json();
        const data: ApiExercise[] = Array.isArray(json)
          ? json
          : Array.isArray((json as any)?.data)
          ? (json as any).data
          : [];
        if (!Array.isArray(data)) {
          throw new Error("Unexpected API response shape");
        }

        // #region agent log
        const sampleRaw = data?.[0];
        fetch(
          "http://127.0.0.1:7242/ingest/385971b8-cc31-45e9-9e03-082c407e98ee",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "pre-fix-1",
              hypothesisId: "H2",
              location: "exercises.tsx:fetchExercises:apiRaw",
              message: "API raw sample",
              data: sampleRaw
                ? {
                    name: sampleRaw.name,
                    target: (sampleRaw as any).target,
                    targetMuscles: sampleRaw.targetMuscles,
                    secondaryMuscle: (sampleRaw as any).secondaryMuscle,
                    secondaryMuscles: sampleRaw.secondaryMuscles,
                    bodyPart: (sampleRaw as any).bodyPart,
                    bodyParts: sampleRaw.bodyParts,
                    equipment: (sampleRaw as any).equipment,
                    equipments: sampleRaw.equipments,
                    imageUrl: sampleRaw.imageUrl,
                  }
                : null,
              timestamp: Date.now(),
            }),
          }
        ).catch(() => {});
        // #endregion

        const mapped: ExerciseItem[] = data.map((ex) => ({
          name: ex.name,
          difficulty: "unknown",
          description: Array.isArray(ex.instructions)
            ? ex.instructions.join(" ")
            : ex.instructions || "No description provided.",
          muscle:
            ex.targetMuscles?.[0] || (ex as any).target || ex.bodyParts?.[0],
          type: ex.exerciseType || ex.bodyParts?.[0] || (ex as any).target,
          image: ex.imageUrl || (ex as any).gifUrl,
          targets: ex.targetMuscles?.length
            ? ex.targetMuscles
            : (ex as any).target
            ? [(ex as any).target]
            : undefined,
          secondaryTargets: ex.secondaryMuscles?.length
            ? ex.secondaryMuscles
            : (ex as any).secondaryMuscle
            ? [(ex as any).secondaryMuscle]
            : undefined,
          bodyParts: ex.bodyParts?.length ? ex.bodyParts : undefined,
          equipments: ex.equipments?.length
            ? ex.equipments
            : (ex as any).equipment
            ? [(ex as any).equipment]
            : undefined,
          video: ex.videoUrl,
        }));
        // #region agent log
        const sampleMapped = mapped?.[0];
        fetch(
          "http://127.0.0.1:7242/ingest/385971b8-cc31-45e9-9e03-082c407e98ee",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "pre-fix-1",
              hypothesisId: "H3",
              location: "exercises.tsx:fetchExercises:mappedSample",
              message: "Mapped sample after processing",
              data: sampleMapped
                ? {
                    name: sampleMapped.name,
                    muscle: sampleMapped.muscle,
                    type: sampleMapped.type,
                    targets: sampleMapped.targets,
                    secondaryTargets: sampleMapped.secondaryTargets,
                    bodyParts: sampleMapped.bodyParts,
                    equipments: sampleMapped.equipments,
                  }
                : null,
              timestamp: Date.now(),
            }),
          }
        ).catch(() => {});
        // #endregion
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/385971b8-cc31-45e9-9e03-082c407e98ee",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "pre-fix-1",
              hypothesisId: "H1",
              location: "exercises.tsx:fetchExercises:setItems",
              message: "Setting items from API",
              data: { count: mapped.length },
              timestamp: Date.now(),
            }),
          }
        ).catch(() => {});
        // #endregion
        setItems(mapped);
      } else {
        const local = await fetchLocalExercises(q);
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/385971b8-cc31-45e9-9e03-082c407e98ee",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "pre-fix-1",
              hypothesisId: "H1",
              location: "exercises.tsx:fetchExercises:setItemsLocal",
              message: "Setting items from local",
              data: { count: local.length },
              timestamp: Date.now(),
            }),
          }
        ).catch(() => {});
        // #endregion
        setItems(local);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  }, [apiKey, baseUrl, fetchLocalExercises, hostHeader, query, source]);

  const renderItem = ({ item }: { item: ExerciseItem }) => (
    <ExerciseCard item={item} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exercises</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search by name or muscle (e.g., biceps, chest, curl...)"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={fetchExercises}
        />
        <Text style={styles.searchHint}>Press enter to search</Text>
      </View>

      <View style={styles.toggleRow}>
        <Text
          style={[styles.toggle, source === "api" && styles.toggleActive]}
          onPress={() => setSource("api")}
        >
          API
        </Text>
        <Text
          style={[styles.toggle, source === "local" && styles.toggleActive]}
          onPress={() => setSource("local")}
        >
          Local DB
        </Text>
      </View>

      {loading && <ActivityIndicator size="small" color="#000" />}
      {error && (
        <Text style={styles.error} onPress={() => Alert.alert("Error", error)}>
          {error}
        </Text>
      )}

      <FlatList
        data={items}
        keyExtractor={(item, idx) => `${item.name}-${idx}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={styles.empty}>No exercises found.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  searchRow: { marginBottom: 12 },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    color: "#333",
  },
  toggleActive: {
    backgroundColor: "#000",
    color: "#fff",
    borderColor: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  searchHint: { marginTop: 4, fontSize: 12, color: "#666" },
  empty: { textAlign: "center", color: "#777", marginTop: 20 },
  error: { color: "#b00020", marginVertical: 8 },
});
