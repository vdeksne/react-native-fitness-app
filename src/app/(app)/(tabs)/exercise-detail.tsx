import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabaseSafe as supabase } from "../../../lib/supabase";
// @ts-ignore expo-image-picker resolved at runtime
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";

export default function ExerciseDetail() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    description?: string;
    image?: string;
    video?: string;
    muscles?: string;
    days?: string;
    type?: string;
    edit?: string;
  }>();

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

  const router = useRouter();

  const initialMuscles = useMemo(
    () => (params.muscles ? params.muscles : ""),
    [params.muscles]
  );
  const initialDays = useMemo(
    () => (params.days ? params.days : ""),
    [params.days]
  );

  const [editing, setEditing] = useState(params.edit === "1");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(params.name || "");
  const [description, setDescription] = useState(params.description || "");
  const [image, setImage] = useState(params.image || "");
  const [video, setVideo] = useState(params.video || "");
  const [muscles, setMuscles] = useState(initialMuscles);
  const [days, setDays] = useState(initialDays);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>(
    initialMuscles
      ? initialMuscles
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : []
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(
    initialDays
      ? initialDays
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : []
  );
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

  const parseList = (v: string) =>
    v
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const toggleValue = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const supabaseBucket =
    process.env.EXPO_PUBLIC_SUPABASE_BUCKET ||
    Constants.expoConfig?.extra?.supabaseBucket ||
    "exercise-images";
  const uploadImageToSupabase = useCallback(
    async (uri: string): Promise<string | undefined> => {
      if (!uri) return undefined;
      if (!supabase) {
        Alert.alert(
          "Missing Supabase config",
          "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
        );
        return undefined;
      }
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

  const handleSave = async () => {
    if (!params.id) {
      Alert.alert("Missing id", "Cannot update exercise without an id.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a name.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("exercises")
        .update({
          name: name.trim(),
          description: description.trim() || "No description provided.",
          image_url: image.trim() || null,
          video_url: video.trim() || null,
          major_muscle_groups: selectedMuscles,
          training_days: selectedDays,
        })
        .eq("id", params.id);
      if (error) throw error;
      Alert.alert("Saved", "Exercise updated.");
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Update failed", e?.message || "Could not update exercise.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        {params.id ? (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditing((v) => !v)}
          >
            <Text style={styles.editBtnText}>
              {editing ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.metaMuted}>Read-only</Text>
        )}
      </View>

      {editing ? (
        <>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
          />
          <TextInput
            style={[styles.input, styles.inputArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            multiline
          />
          <TextInput
            style={styles.input}
            value={image}
            onChangeText={setImage}
            placeholder="Image URL"
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
                mediaTypes:
                  (ImagePicker as any).MediaType?.IMAGES ??
                  ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                copyToCacheDirectory: true,
              });
              if (!result.canceled && result.assets?.length) {
                const localUri = result.assets[0].uri;
                const uploadedUrl = await uploadImageToSupabase(localUri);
                if (uploadedUrl) {
                  setImage(uploadedUrl);
                }
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
                const localUri = result.assets[0].uri;
                const uploadedUrl = await uploadImageToSupabase(localUri);
                if (uploadedUrl) {
                  setImage(uploadedUrl);
                }
              }
            }}
          >
            <Text style={styles.pickButtonText}>Take photo</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={video}
            onChangeText={setVideo}
            placeholder="Video URL"
            autoCapitalize="none"
          />
          <View style={styles.selectorBox}>
            <Text style={styles.sectionTitle}>Major muscle groups</Text>
            <View style={styles.chipRow}>
              {muscleOptions.map((opt) => {
                const sel = selectedMuscles.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.selectorPill,
                      sel && styles.selectorPillActive,
                    ]}
                    onPress={() => {
                      const next = toggleValue(selectedMuscles, opt.value);
                      setSelectedMuscles(next);
                      setMuscles(next.join(","));
                    }}
                  >
                    <Text
                      style={[
                        styles.selectorPillText,
                        sel && styles.selectorPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.selectorBox}>
            <Text style={styles.sectionTitle}>Training days</Text>
            <View style={styles.chipRow}>
              {dayOptions.map((opt) => {
                const sel = selectedDays.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.selectorPill,
                      sel && styles.selectorPillActive,
                    ]}
                    onPress={() => {
                      const next = toggleValue(selectedDays, opt.value);
                      setSelectedDays(next);
                      setDays(next.join(","));
                    }}
                  >
                    <Text
                      style={[
                        styles.selectorPillText,
                        sel && styles.selectorPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>{name || "Exercise"}</Text>
          {params.type ? <Text style={styles.meta}>{params.type}</Text> : null}

          {image ? (
            <Image
              source={{ uri: image }}
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
              {description || "No description provided."}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Major muscle groups</Text>
            <View style={styles.chipRow}>
              {chips(muscles).length === 0 ? (
                <Text style={styles.metaMuted}>Not specified</Text>
              ) : (
                chips(muscles).map((m) => (
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
              {chips(days).length === 0 ? (
                <Text style={styles.metaMuted}>Not specified</Text>
              ) : (
                chips(days).map((d) => (
                  <View key={d} style={styles.chip}>
                    <Text style={styles.chipText}>{d}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Media</Text>
            {video ? (
              <TouchableOpacity style={styles.button} onPress={openVideo}>
                <Text style={styles.buttonText}>Open video</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.metaMuted}>No video provided</Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { color: "#111", marginBottom: 8, fontWeight: "700" },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#222",
    borderRadius: 8,
  },
  editBtnText: { color: "#fff", fontWeight: "700" },
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
  pickButton: {
    marginTop: 8,
    backgroundColor: "#444",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  pickButtonText: { color: "#fff", fontWeight: "700" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  inputArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  selectorBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 10,
    marginBottom: 10,
  },
  selectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#E8E8E8",
  },
  selectorPillActive: {
    backgroundColor: "#222",
  },
  selectorPillText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  selectorPillTextActive: {
    color: "#fff",
  },
  saveBtn: {
    backgroundColor: "#222",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});
