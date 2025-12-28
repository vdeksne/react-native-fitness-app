import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from "react-native";
import Constants from "expo-constants";
import ExerciseCard from "../../components/ExerciseCard";
import { useRouter } from "expo-router";
// @ts-ignore expo-image-picker types resolved at runtime
import * as ImagePicker from "expo-image-picker";
import { supabaseSafe as supabase } from "../../../lib/supabase";
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
  id?: string;
  name: string;
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
  // Removed difficulty field wherever declared, as per instruction
};

const muscleOptions = [
  { label: "Glutes (Gluteus Maximus)", value: "gluteusMaximus" },
  { label: "Glutes (Gluteus Medius)", value: "gluteusMedius" },
  { label: "Posterior Chain", value: "posteriorChain" },
  { label: "Hamstrings", value: "hamstrings" },
  { label: "Adductors (Inner Thigh)", value: "adductorsInnerThigh" },
  { label: "Quadriceps (Quads)", value: "quadriceps" },
  { label: "Calves", value: "calves" },
  { label: "Shoulders (Deltoids)", value: "deltoids" },
  { label: "Shoulders (Anterior Deltoid)", value: "anteriorDeltoid" },
  { label: "Arms (Triceps)", value: "triceps" },
  { label: "Arms (Biceps)", value: "biceps" },
  { label: "Chest Upper", value: "pecMajorUpper" },
  { label: "Chest Mid", value: "pecMajorMid" },
  { label: "Chest Lower", value: "pecMajorLower" },
  { label: "Chest Minor", value: "pecMinor" },
  { label: "Back (Lats)", value: "latissimusDorsi" },
  { label: "Back (Rhomboids)", value: "rhomboids" },
  { label: "Back (Lower Back)", value: "lowerBack" },
  { label: "Core (Lower Abs)", value: "lowerAbs" },
  { label: "Core (Upper Abs)", value: "upperAbs" },
  { label: "Core (Obliques)", value: "obliques" },
  { label: "Core (Transverse Abdominis)", value: "transverseAbdominis" },
];

const dayOptions = [
  { label: "Legs & Glutes Day", value: "legsGlutesDay" },
  { label: "Shoulders & Arms Day", value: "shouldersArmsDay" },
  { label: "Back Day", value: "backDay" },
  { label: "Chest & Arms Day", value: "chestArmsDay" },
  { label: "Glutes & Hamstrings Day", value: "glutesHamstringsDay" },
  { label: "Abs / Core Day", value: "absCoreDay" },
];

export default function Exercises() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"api" | "local">("api");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMuscles, setNewMuscles] = useState<string[]>([]);
  const [newDays, setNewDays] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageUri, setNewImageUri] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<ExerciseItem | null>(null);
  // Removed difficulty state, as per instruction (no useState for newDifficulty)

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

  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    Constants.expoConfig?.extra?.supabaseUrl ||
    "";
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    Constants.expoConfig?.extra?.supabaseAnonKey ||
    "";
  const supabaseBucket =
    process.env.EXPO_PUBLIC_SUPABASE_BUCKET ||
    Constants.expoConfig?.extra?.supabaseBucket ||
    "exercise-images";

  const fetchLocalExercises = useCallback(async (q: string) => {
    if (!q.trim()) return [];
    const { data, error } = await supabase
      .from("exercises")
      .select(
        "id,name,description,image_url,video_url,major_muscle_groups,training_days,is_active"
      )
      .ilike("name", `%${q}%`)
      .or("is_active.is.null,is_active.eq.true")
      .limit(50);

    if (error) {
      console.warn("[supabase] fetchLocalExercises failed", error);
      return [];
    }
    const arr: any[] = Array.isArray(data) ? data : [];
    return arr.map(
      (ex): ExerciseItem => ({
        id: ex.id,
        name: ex.name,
        description: ex.description || "No description provided.",
        muscle: undefined,
        type: undefined,
        image: ex.image_url || undefined,
        majorMuscleGroups: ex.major_muscle_groups || [],
        trainingDays: ex.training_days || [],
        video: ex.video_url || undefined,
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

        const mapped: ExerciseItem[] = data.map((ex) => ({
          name: ex.name,
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
        setItems(mapped);
      } else {
        const local = await fetchLocalExercises(q);
        setItems(local);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load exercises");
    } finally {
      setLoading(false);
    }
  }, [apiKey, baseUrl, fetchLocalExercises, hostHeader, query, source]);

  const deleteExercise = async (item: ExerciseItem) => {
    if (!item.id) {
      Alert.alert("Cannot delete", "This exercise has no id.");
      return;
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      Alert.alert(
        "Missing Supabase config",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }
    Alert.alert("Delete exercise", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("exercises")
              .delete()
              .eq("id", item.id);
            if (error) throw error;
            setItems((prev) => prev.filter((ex) => ex.id !== item.id));
            setLastDeleted(item);
          } catch (e: any) {
            Alert.alert(
              "Delete failed",
              e?.message || "Could not delete exercise."
            );
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ExerciseItem }) => (
    <View style={styles.cardRow}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() =>
          router.push({
            pathname: "exercise-detail",
            params: {
              id: item.id,
              name: item.name,
              description: item.description,
              image: item.image || "",
              video: item.video || "",
              muscles: (item.majorMuscleGroups || item.targets || []).join(","),
              days: (item.trainingDays || item.bodyParts || []).join(","),
              type: item.type || item.muscle || "",
              edit: "0",
            },
          })
        }
        activeOpacity={0.8}
      >
        <ExerciseCard item={item} />
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editPill}
          onPress={() =>
            router.push({
              pathname: "exercise-detail",
              params: {
                id: item.id,
                name: item.name,
                description: item.description,
                image: item.image || "",
                video: item.video || "",
                muscles: (item.majorMuscleGroups || item.targets || []).join(
                  ","
                ),
                days: (item.trainingDays || item.bodyParts || []).join(","),
                type: item.type || item.muscle || "",
                edit: "1",
              },
            })
          }
          disabled={!item.id}
        >
          <Text style={styles.editPillText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deletePill}
          onPress={() => deleteExercise(item)}
          disabled={!item.id}
        >
          <Text style={styles.deletePillText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const undoDelete = async () => {
    if (!lastDeleted) return;
    if (!supabaseUrl || !supabaseAnonKey) {
      Alert.alert(
        "Missing Supabase config",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }
    try {
      setSaving(true);
      const doc: any = {
        id: lastDeleted.id,
        name: lastDeleted.name,
        description: lastDeleted.description || "No description provided.",
        major_muscle_groups: lastDeleted.majorMuscleGroups || [],
        training_days: lastDeleted.trainingDays || [],
        is_active: true,
      };
      if (lastDeleted.image) doc.image_url = lastDeleted.image;
      if (lastDeleted.video) doc.video_url = lastDeleted.video;

      const { error } = await supabase.from("exercises").insert([doc]);
      if (error) throw error;
      setItems((prev) => [lastDeleted, ...prev]);
      setLastDeleted(null);
      Alert.alert("Restored", `"${lastDeleted.name}" was restored.`);
    } catch (e: any) {
      Alert.alert(
        "Restore failed",
        e?.message || "Could not restore exercise."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleFromList = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const uploadImageToSupabase = useCallback(
    async (uri: string): Promise<string | undefined> => {
      if (!uri) return undefined;
      try {
        const res = await fetch(uri);
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          Alert.alert(
            "Upload failed",
            `Could not read file (${res.status}). ${msg || ""}`
          );
          return undefined;
        }
        const blob = await res.blob();
        const ext = blob.type?.split("/")[1] || "jpg";
        const path = `exercise-${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(supabaseBucket)
          .upload(path, blob, {
            contentType: blob.type || "image/jpeg",
            upsert: true,
          });
        if (uploadError) {
          console.warn("[supabase] image upload failed", uploadError);
          Alert.alert("Upload failed", uploadError.message || "Storage error");
          return undefined;
        }

        const { data: publicData } = supabase.storage
          .from(supabaseBucket)
          .getPublicUrl(path);
        if (!publicData?.publicUrl) {
          Alert.alert("Upload failed", "Could not get public URL");
          return undefined;
        }
        return publicData.publicUrl;
      } catch (e) {
        console.warn("[supabase] image upload threw", e);
        Alert.alert("Upload failed", "Unexpected error uploading image.");
        return undefined;
      }
    },
    [supabaseBucket]
  );

  const addExercise = async () => {
    if (!newName.trim()) {
      Alert.alert("Missing name", "Please enter a name for the exercise.");
      return;
    }
    if (!newMuscles.length) {
      Alert.alert(
        "Pick muscle groups",
        "Select at least one major muscle group."
      );
      return;
    }
    if (!newDays.length) {
      Alert.alert("Pick training days", "Select at least one training day.");
      return;
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      Alert.alert(
        "Missing Supabase config",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }
    try {
      setSaving(true);
      setError(null);
      let imageUrl: string | undefined;
      const targetImage = newImageUri.trim() || newImageUrl.trim();

      if (targetImage) {
        imageUrl = await uploadImageToSupabase(targetImage);
        if (!imageUrl) return;
      }

      const doc: any = {
        name: newName.trim(),
        description: newDescription.trim() || "No description provided.",
        // Remove 'difficulty' field: difficulty: newDifficulty.trim() || "unknown",
        major_muscle_groups: newMuscles,
        training_days: newDays,
        is_active: newIsActive,
        image_url: imageUrl,
      };
      if (newVideoUrl.trim()) doc.video_url = newVideoUrl.trim();

      const { error: insertError } = await supabase
        .from("exercises")
        .insert([doc]);
      if (insertError) {
        console.warn("[supabase] insert exercise failed", insertError);
        throw insertError;
      }

      Alert.alert("Saved", "Exercise added to your database.", [
        { text: "OK", onPress: () => {} },
      ]);
      setNewName("");
      setNewDescription("");
      setNewMuscles([]);
      setNewDays([]);
      setNewImageUrl("");
      setNewImageUri("");
      setNewVideoUrl("");
      setNewIsActive(true);
      setShowAddForm(false);

      if (source === "local") {
        const refreshed = await fetchLocalExercises(query || newName);
        setItems(refreshed);
      }
    } catch (e: any) {
      setError("Could not add exercise.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 140 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Exercises</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search by name or muscle (e.g., biceps, chest, curl...)"
          placeholderTextColor="#111"
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

      <View style={styles.addBox}>
        {!showAddForm ? (
          <TouchableOpacity onPress={() => setShowAddForm(true)}>
            <Text style={styles.addButton}>+ Add new exercise</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.addTitle}>New Exercise</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#111"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Description"
              placeholderTextColor="#111"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
            />
            {/* Removed Difficulty input field */}
            {/* 
            <TextInput
              style={styles.input}
              placeholder="Difficulty (optional)"
              value=""
              editable={false}
            />
            */}

            <TextInput
              style={styles.input}
              placeholder="Image URL (optional)"
              placeholderTextColor="#111"
              value={newImageUrl}
              onChangeText={setNewImageUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.pickButton}
              onPress={async () => {
                const perm =
                  await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (perm.status !== "granted") {
                  Alert.alert(
                    "Permission needed",
                    "Please allow photo access to pick an image."
                  );
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  // Use new MediaType enum when available; fall back for older types.
                  mediaTypes:
                    (ImagePicker as any).MediaType?.IMAGES ??
                    ImagePicker.MediaTypeOptions.Images,
                  quality: 0.8,
                  copyToCacheDirectory: true,
                });
                if (!result.canceled && result.assets?.length) {
                  setNewImageUri(result.assets[0].uri);
                  setNewImageUrl("");
                }
              }}
            >
              <Text style={styles.pickButtonText}>Pick image from device</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickButton}
              onPress={async () => {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (perm.status !== "granted") {
                  Alert.alert(
                    "Permission needed",
                    "Please allow camera access to take a photo."
                  );
                  return;
                }
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes:
                    (ImagePicker as any).MediaType?.IMAGES ??
                    ImagePicker.MediaTypeOptions.Images,
                  quality: 0.8,
                });
                if (!result.canceled && result.assets?.length) {
                  setNewImageUri(result.assets[0].uri);
                  setNewImageUrl("");
                }
              }}
            >
              <Text style={styles.pickButtonText}>Take photo</Text>
            </TouchableOpacity>
            {newImageUrl.trim() ? (
              <Image
                source={{ uri: newImageUrl.trim() }}
                style={styles.preview}
                resizeMode="cover"
              />
            ) : newImageUri.trim() ? (
              <Image
                source={{ uri: newImageUri.trim() }}
                style={styles.preview}
                resizeMode="cover"
              />
            ) : null}

            <View style={styles.pickerBox}>
              <Text style={styles.pickerLabel}>Major muscle groups</Text>
              {muscleOptions.map((opt) => {
                const sel = newMuscles.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.pickerRow}
                    onPress={() =>
                      setNewMuscles((prev) => toggleFromList(prev, opt.value))
                    }
                  >
                    <Text
                      style={[
                        styles.pickerCheck,
                        sel && styles.pickerCheckActive,
                      ]}
                    >
                      {sel ? "☑" : "☐"}
                    </Text>
                    <Text style={styles.pickerText}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.pickerBox}>
              <Text style={styles.pickerLabel}>Training days</Text>
              {dayOptions.map((opt) => {
                const sel = newDays.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.pickerRow}
                    onPress={() =>
                      setNewDays((prev) => toggleFromList(prev, opt.value))
                    }
                  >
                    <Text
                      style={[
                        styles.pickerCheck,
                        sel && styles.pickerCheckActive,
                      ]}
                    >
                      {sel ? "☑" : "☐"}
                    </Text>
                    <Text style={styles.pickerText}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Video URL (optional)"
              placeholderTextColor="#111"
              value={newVideoUrl}
              onChangeText={setNewVideoUrl}
            />

            <View
              style={[styles.toggleRow, { justifyContent: "space-between" }]}
            >
              <Text style={styles.addLabel}>Is Active</Text>
              <TouchableOpacity onPress={() => setNewIsActive((v) => !v)}>
                <Text style={styles.addButtonGhost}>
                  {newIsActive ? "Yes" : "No"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.addHint}>
              Saves to your Sanity DB (requires write token).
            </Text>
            <View style={styles.addActions}>
              <TouchableOpacity
                style={[
                  styles.addButtonPrimary,
                  (!supabaseUrl || !supabaseAnonKey || saving) && {
                    opacity: 0.5,
                  },
                ]}
                onPress={saving ? undefined : addExercise}
              >
                <Text style={styles.addButtonPrimaryText}>
                  {saving ? "Saving..." : "Save exercise"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButtonGhostBox}
                onPress={() => {
                  setShowAddForm(false);
                  setNewName("");
                  setNewDescription("");
                  // setNewDifficulty(""); // removed, since no longer needed
                  setNewMuscles([]);
                  setNewDays([]);
                  setNewVideoUrl("");
                  setNewIsActive(true);
                }}
              >
                <Text style={styles.addButtonGhostText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
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
        scrollEnabled={false}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={styles.empty}>No exercises found.</Text>
          ) : null
        }
      />
      {lastDeleted ? (
        <View style={[styles.undoBar, { marginTop: 12, marginBottom: 8 }]}>
          <Text style={styles.undoText}>
            Deleted "{lastDeleted.name}". Undo?
          </Text>
          <TouchableOpacity
            style={[styles.undoBtn, saving && { opacity: 0.6 }]}
            onPress={undoDelete}
            disabled={saving}
          >
            <Text style={styles.undoBtnText}>Undo</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F5F5F5" },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
  },
  cardActions: {
    flexDirection: "column",
    gap: 6,
  },
  editPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#222",
    borderRadius: 10,
  },
  editPillText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  deletePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#222",
    borderRadius: 10,
  },
  deletePillText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  undoBar: {
    marginBottom: 12,
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
  title: { fontSize: 22, fontWeight: "800", marginBottom: 12, color: "#111" },
  searchRow: { marginBottom: 12 },
  toggleRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CFCFCF",
    color: "#333",
  },
  toggleActive: {
    backgroundColor: "#222",
    color: "#fff",
    borderColor: "#222",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#111",
    marginBottom: 10,
  },
  searchHint: { marginTop: 4, fontSize: 12, color: "#666" },
  empty: { textAlign: "center", color: "#777", marginTop: 20 },
  error: { color: "#555", marginVertical: 8 },
  addBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  addTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  addHint: { fontSize: 12, color: "#666", marginBottom: 10 },
  addButton: {
    backgroundColor: "#E0E0E0",
    color: "#111",
    textAlign: "center",
    paddingVertical: 12,
    borderRadius: 10,
    fontWeight: "700",
    marginTop: 8,
  },
  addLabel: { fontSize: 13, color: "#444" },
  pickerBox: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  pickerLabel: {
    fontSize: 13,
    color: "#444",
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 8,
  },
  pickerCheck: { fontSize: 14, color: "#666" },
  pickerCheckActive: { color: "#111", fontWeight: "700" },
  pickerText: { fontSize: 14, color: "#222" },
  addActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  addButtonPrimary: {
    flex: 1,
    backgroundColor: "#222",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  addButtonPrimaryText: { color: "#fff", fontWeight: "700" },
  addButtonGhostBox: {
    flex: 1,
    backgroundColor: "#E6E6E6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  addButtonGhostText: { color: "#111", fontWeight: "700" },
  addButtonGhost: {
    backgroundColor: "#E6E6E6",
    color: "#111",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickButton: {
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  pickButtonText: {
    color: "#111",
    fontWeight: "700",
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  preview: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#EEE",
  },
});
