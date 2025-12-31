import React, { useMemo, useState, useCallback, useEffect } from "react";
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
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabaseSafe as supabase } from "../../../lib/supabase";
// @ts-ignore expo-image-picker resolved at runtime
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { useTheme } from "../../../context/ThemeContext";

export default function ExerciseDetail() {
  const { colors } = useTheme();
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
  const [zoomVisible, setZoomVisible] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Fetch latest exercise from Supabase when an id is provided
  useEffect(() => {
    const load = async () => {
      if (!params.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("exercises")
          .select(
            "id,name,description,image_url,video_url,major_muscle_groups,training_days"
          )
          .eq("id", params.id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setName(data.name || "");
          setDescription(data.description || "");
          setImage(data.image_url || "");
          setVideo(data.video_url || "");
          const mg = Array.isArray(data.major_muscle_groups)
            ? data.major_muscle_groups
            : [];
          const td = Array.isArray(data.training_days) ? data.training_days : [];
          setSelectedMuscles(mg);
          setSelectedDays(td);
          setMuscles(mg.join(","));
          setDays(td.join(","));
        }
      } catch (e) {
        console.warn("[exercise-detail] load failed", e);
      } finally {
        setLoading(false);
      }
    };
    load();
    // only on id change
  }, [params.id]);

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
      const payload = {
        name: name.trim(),
        description: description.trim() || "No description provided.",
        image_url: image.trim() || null,
        video_url: video.trim() || null,
        major_muscle_groups: selectedMuscles,
        training_days: selectedDays,
      };

      const { error } = await supabase
        .from("exercises")
        .update(payload)
        .eq("id", params.id);
      if (error) throw error;
      Alert.alert("Saved", "Exercise updated.");
      setEditing(false);
      // Re-fetch latest from Supabase to ensure the image/fields are in sync
      if (params.id) {
        const { data } = await supabase
          .from("exercises")
          .select(
            "id,name,description,image_url,video_url,major_muscle_groups,training_days"
          )
          .eq("id", params.id)
          .maybeSingle();
        if (data) {
          setName(data.name || "");
          setDescription(data.description || "");
          setImage(data.image_url || "");
          setVideo(data.video_url || "");
          const mg = Array.isArray(data.major_muscle_groups)
            ? data.major_muscle_groups
            : [];
          const td = Array.isArray(data.training_days)
            ? data.training_days
            : [];
          setSelectedMuscles(mg);
          setSelectedDays(td);
          setMuscles(mg.join(","));
          setDays(td.join(","));
        }
      }
    } catch (e: any) {
      Alert.alert("Update failed", e?.message || "Could not update exercise.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.back, { color: colors.text }]}>← Back</Text>
        </TouchableOpacity>
        {params.id ? (
          <TouchableOpacity
            style={[
              styles.editBtn,
              { backgroundColor: colors.accentDark, borderColor: colors.accent },
            ]}
            onPress={() => setEditing((v) => !v)}
          >
            <Text style={[styles.editBtnText, { color: colors.text }]}>
              {editing ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.metaMuted, { color: colors.muted }]}>
            Read-only
          </Text>
        )}
      </View>

      {editing ? (
        <>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={colors.muted}
          />
          <TextInput
            style={[
              styles.input,
              styles.inputArea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            placeholderTextColor={colors.muted}
            multiline
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={image}
            onChangeText={setImage}
            placeholder="Image URL"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[
              styles.pickButton,
              { backgroundColor: colors.card, borderColor: colors.accent },
            ]}
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
            <Text style={[styles.pickButtonText, { color: colors.text }]}>
              Pick image from device
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pickButton,
              { backgroundColor: colors.card, borderColor: colors.accent },
            ]}
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
            <Text style={[styles.pickButtonText, { color: colors.text }]}>
              Take photo
            </Text>
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={video}
            onChangeText={setVideo}
            placeholder="Video URL"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
          />
          <View style={styles.selectorBox}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Major muscle groups
            </Text>
            <View style={styles.chipRow}>
              {muscleOptions.map((opt) => {
                const sel = selectedMuscles.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.selectorPill,
                      sel && styles.selectorPillActive,
                      {
                        backgroundColor: sel ? colors.accent : colors.card,
                        borderColor: sel ? colors.accent : colors.border,
                      },
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
                          { color: sel ? "#0B0C0F" : colors.text },
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Training days
            </Text>
            <View style={styles.chipRow}>
              {dayOptions.map((opt) => {
                const sel = selectedDays.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.selectorPill,
                      sel && styles.selectorPillActive,
                      {
                        backgroundColor: sel ? colors.accent : colors.card,
                        borderColor: sel ? colors.accent : colors.border,
                      },
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
                          { color: sel ? "#0B0C0F" : colors.text },
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
            style={[
              styles.saveBtn,
              { backgroundColor: colors.accentDark, borderColor: colors.accent },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={[styles.saveBtnText, { color: colors.text }]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: colors.text }]}>
            {name || "Exercise"}
          </Text>
          {params.type ? (
            <Text style={[styles.meta, { color: colors.muted }]}>{params.type}</Text>
          ) : null}

          {image ? (
            <>
              <TouchableOpacity onPress={() => setZoomVisible(true)} activeOpacity={0.9}>
                <Image
                  source={{ uri: image }}
                  style={styles.hero}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <Modal visible={zoomVisible} transparent animationType="fade">
                <View style={styles.zoomBackdrop}>
                  <TouchableOpacity
                    style={styles.zoomClose}
                    onPress={() => setZoomVisible(false)}
                  >
                    <Text style={styles.zoomCloseText}>Close</Text>
                  </TouchableOpacity>
                  <Image
                    source={{ uri: image }}
                    style={styles.zoomImage}
                    resizeMode="contain"
                  />
                </View>
              </Modal>
            </>
          ) : (
            <View
              style={[
                styles.hero,
                styles.heroPlaceholder,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.placeholderText, { color: colors.muted }]}>
                No image
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Description
            </Text>
            <Text style={[styles.body, { color: colors.text }]}>
              {description || "No description provided."}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Major muscle groups
            </Text>
            <View style={styles.chipRow}>
              {chips(muscles).length === 0 ? (
                <Text style={[styles.metaMuted, { color: colors.muted }]}>
                  Not specified
                </Text>
              ) : (
                chips(muscles).map((m) => (
                  <View
                    key={m}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>{m}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Training days
            </Text>
            <View style={styles.chipRow}>
              {chips(days).length === 0 ? (
                <Text style={[styles.metaMuted, { color: colors.muted }]}>
                  Not specified
                </Text>
              ) : (
                chips(days).map((d) => (
                  <View
                    key={d}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>{d}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Media</Text>
            {video ? (
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.accentDark, borderColor: colors.accent },
                ]}
                onPress={openVideo}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  Open video
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.metaMuted, { color: colors.muted }]}>
                No video provided
              </Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0C0F", padding: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { color: "#EAFDFC", marginBottom: 8, fontWeight: "700" },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#222",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  editBtnText: { color: "#EAFDFC", fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "800", color: "#EAFDFC", marginBottom: 4 },
  meta: { fontSize: 14, color: "#B7C6D4", marginBottom: 4, fontWeight: "700" },
  metaMuted: { fontSize: 13, color: "#B7C6D4" },
  hero: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#0F1116",
    borderWidth: 1,
    borderColor: "#162029",
    marginVertical: 12,
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#B7C6D4", fontWeight: "700" },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EAFDFC",
    marginBottom: 6,
  },
  body: { fontSize: 14, color: "#EAFDFC", lineHeight: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#0F1116",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#162029",
  },
  chipText: { fontSize: 13, color: "#EAFDFC", fontWeight: "700" },
  button: {
    marginTop: 8,
    backgroundColor: "#222",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  buttonText: { color: "#EAFDFC", fontWeight: "700" },
  pickButton: {
    marginTop: 8,
    backgroundColor: "#0F1116",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#162029",
  },
  pickButtonText: { color: "#EAFDFC", fontWeight: "700" },
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
    backgroundColor: "#0F1116",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#162029",
    padding: 10,
    marginBottom: 10,
  },
  selectorPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0F1116",
    borderWidth: 1,
    borderColor: "#162029",
  },
  selectorPillActive: {
    backgroundColor: "#08E8DE",
  },
  selectorPillText: {
    fontSize: 12,
    color: "#EAFDFC",
    fontWeight: "600",
  },
  selectorPillTextActive: {
    color: "#0B0C0F",
  },
  saveBtn: {
    backgroundColor: "#222",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#222",
  },
  saveBtnText: { color: "#EAFDFC", fontWeight: "700" },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  zoomImage: {
    width: "100%",
    height: "80%",
    borderRadius: 12,
  },
  zoomClose: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "#08E8DE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  zoomCloseText: { color: "#0B0C0F", fontWeight: "800" },
});
