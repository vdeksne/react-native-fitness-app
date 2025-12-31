import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabaseSafe as supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";
import { useAuthContext } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import * as SecureStore from "expo-secure-store";

const dayLabels = ["5", "6", "7", "Now, July 8", "9", "10", "11"];

export default function Profile() {
  const router = useRouter();
  const { email, setEmail } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<
    {
      _id: string;
      date?: string;
      durationMin?: number;
      exercises?: {
        name?: string;
        sets?: { reps?: number; weight?: number; weightUnit?: string }[];
      }[];
    }[]
  >([]);
  const [weightKg, setWeightKg] = useState("62");
  const [chestCm, setChestCm] = useState("90");
  const [waistCm, setWaistCm] = useState("70");
  const [hipsCm, setHipsCm] = useState("96");
  const [thighCm, setThighCm] = useState("54");
  const [armCm, setArmCm] = useState("29");
  const [calfCm, setCalfCm] = useState("34");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [savingMeasure, setSavingMeasure] = useState(false);
  const [measureHistory, setMeasureHistory] = useState<
    {
      id: string;
      label: string;
      weight: string;
      chest: string;
      waist: string;
      hips: string;
      thigh: string;
      arm: string;
      calf: string;
    }[]
  >([]);
  const MEASURE_KEY = "profile_measurements_v1";
  const userId = email || "demo-user";
  const measureUserColumn =
    process.env.EXPO_PUBLIC_MEASURE_USER_COL ||
    (Constants.expoConfig?.extra as any)?.measureUserCol ||
    "user_ref";
  const userCol =
    measureUserColumn && measureUserColumn.toLowerCase() === "userid"
      ? "user_ref"
      : measureUserColumn;
  const GOAL_KEY = "profile_goal_v1";
  const [goalWeight, setGoalWeight] = useState<string>("");
  const [goalChest, setGoalChest] = useState<string>("");
  const [goalWaist, setGoalWaist] = useState<string>("");
  const [goalHips, setGoalHips] = useState<string>("");
  const [goalThigh, setGoalThigh] = useState<string>("");
  const [goalArm, setGoalArm] = useState<string>("");
  const [goalCalf, setGoalCalf] = useState<string>("");
  const [goalSavedAt, setGoalSavedAt] = useState<string | null>(null);
  const { theme, setTheme, toggle, colors } = useTheme();
  const canSyncMeasurements =
    !!(
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      Constants.expoConfig?.extra?.supabaseUrl
    ) &&
    !!(
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      Constants.expoConfig?.extra?.supabaseAnonKey
    );
  const summary = useMemo(() => {
    if (measureHistory.length < 2) return null;
    const newest = measureHistory[0];
    const oldest = measureHistory[measureHistory.length - 1];

    const makeDelta = (latest: string, first: string, unit: string) => {
      const diff = Number(latest || 0) - Number(first || 0);
      const sign = diff > 0 ? "↑" : diff < 0 ? "↓" : "—";
      const formatted = `${sign} ${Math.abs(diff).toFixed(1)} ${unit}`;
      const tone: "up" | "down" | "flat" =
        diff > 0 ? "up" : diff < 0 ? "down" : "flat";
      return { formatted, tone };
    };

    return {
      weight: makeDelta(newest.weight, oldest.weight, "kg"),
      chest: makeDelta(newest.chest, oldest.chest, "cm"),
      waist: makeDelta(newest.waist, oldest.waist, "cm"),
      hips: makeDelta(newest.hips, oldest.hips, "cm"),
      thigh: makeDelta(newest.thigh, oldest.thigh, "cm"),
      arm: makeDelta(newest.arm, oldest.arm, "cm"),
      calf: makeDelta(newest.calf, oldest.calf, "cm"),
      from: oldest.label,
      to: newest.label,
    };
  }, [measureHistory]);


  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from("workouts")
          .select("id,date,duration_min,exercises")
          .order("date", { ascending: false })
          .limit(3);
        if (error) throw error;
        const arr =
          Array.isArray(data) && data.length
            ? data.map((w: any) => ({
                _id: w.id,
                date: w.date,
                durationMin: w.duration_min,
                exercises: w.exercises || [],
              }))
            : [];
        setWorkouts(arr);
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
      return { totalWorkouts: 0, totalMinutes: 0, totalVolume: 0 };
    }
    const totalWorkouts = workouts.length;
    const totalMinutes = workouts.reduce(
      (acc, w) => acc + (w.durationMin || 0),
      0
    );
    const totalVolume = workouts.reduce((acc, w) => {
      const vol = (w.exercises || []).reduce((exAcc, ex) => {
        return (
          exAcc +
          (ex.sets || []).reduce((sAcc, s) => {
            const reps = s.reps || 0;
            const weight = s.weight || 0;
            return sAcc + reps * weight;
          }, 0)
        );
      }, 0);
      return acc + vol;
    }, 0);
    return { totalWorkouts, totalMinutes, totalVolume };
  }, [workouts]);

  const cards = useMemo(() => {
    if (!workouts.length) return [];
    return workouts.map((w) => {
      const setCount = (w.exercises || []).reduce(
        (acc, ex) => acc + (ex.sets?.length || 0),
        0
      );
      const volume = (w.exercises || []).reduce((acc, ex) => {
        return (
          acc +
          (ex.sets || []).reduce((sAcc, s) => {
            const reps = s.reps || 0;
            const weight = s.weight || 0;
            return sAcc + reps * weight;
          }, 0)
        );
      }, 0);

      const title = w.exercises?.[0]?.name || "Workout";
      const dateLabel = w.date
        ? new Date(w.date).toLocaleDateString()
        : "Recent";

      return {
        key: w._id,
        title,
        dateLabel,
        duration: w.durationMin ? `${w.durationMin} min` : "—",
        volume: `${volume} kg`,
        sets: `${setCount} sets`,
      };
    });
  }, [workouts]);

  const formattedTime = useMemo(() => {
    const hours = Math.floor(stats.totalMinutes / 60);
    const minutes = stats.totalMinutes % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }, [stats]);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsMode, setSettingsMode] = useState<"menu" | "set" | "reset">(
    "menu"
  );
  const [formEmail, setFormEmail] = useState(email || "");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const fakeNetwork = (message: string) =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        Alert.alert("Success", message, [{ text: "OK" }], {
          cancelable: true,
        });
        resolve();
      }, 600);
    });

  const persistMeasurements = async (
    nextHistory: typeof measureHistory,
    opts?: { lastSavedAt?: string }
  ) => {
    try {
      const payload = {
        weightKg,
        chestCm,
        waistCm,
        hipsCm,
        thighCm,
        armCm,
        calfCm,
        lastSaved: opts?.lastSavedAt ?? lastSaved,
        history: nextHistory,
      };
      await SecureStore.setItemAsync(MEASURE_KEY, JSON.stringify(payload));
    } catch {
      // ignore persistence failures
    }
  };

  const persistGoal = async (savedAt?: string) => {
    try {
      const payload = {
        goalWeight,
        goalChest,
        goalWaist,
        goalHips,
        goalThigh,
        goalArm,
        goalCalf,
        goalSavedAt: savedAt ?? goalSavedAt,
      };
      await SecureStore.setItemAsync(GOAL_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  };

  const loadRemoteMeasurements = async () => {
    if (!canSyncMeasurements) return false;
    try {
      const { data, error } = await supabase
        .from("measurements")
        .select(
          "id,taken_at,weight_kg,chest_cm,waist_cm,hips_cm,thigh_cm,arm_cm,calf_cm"
        )
        .eq(userCol, userId)
        .order("taken_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows: any[] = Array.isArray(data) ? data : [];
      const mapped = rows.map((r) => ({
        id: r.id,
        label: r.taken_at
          ? new Date(r.taken_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Entry",
        weight: r.weight_kg?.toString() || "",
        chest: r.chest_cm?.toString() || "",
        waist: r.waist_cm?.toString() || "",
        hips: r.hips_cm?.toString() || "",
        thigh: r.thigh_cm?.toString() || "",
        arm: r.arm_cm?.toString() || "",
        calf: r.calf_cm?.toString() || "",
      }));
      if (mapped.length) {
        setMeasureHistory(mapped);
        setLastSaved(
          rows[0]?.taken_at
            ? new Date(rows[0].taken_at).toLocaleString()
            : null
        );
        const newest = mapped[0];
        setWeightKg(newest.weight || weightKg);
        setChestCm(newest.chest || chestCm);
        setWaistCm(newest.waist || waistCm);
        setHipsCm(newest.hips || hipsCm);
        setThighCm(newest.thigh || thighCm);
        setArmCm(newest.arm || armCm);
        setCalfCm(newest.calf || calfCm);
        persistMeasurements(mapped, {
          lastSavedAt: rows[0]?.taken_at
            ? new Date(rows[0].taken_at).toLocaleString()
            : undefined,
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const raw = await SecureStore.getItemAsync(MEASURE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed) {
          setWeightKg(parsed.weightKg || "62");
          setChestCm(parsed.chestCm || "90");
          setWaistCm(parsed.waistCm || "70");
          setHipsCm(parsed.hipsCm || "96");
          setThighCm(parsed.thighCm || "54");
          setArmCm(parsed.armCm || "29");
          setCalfCm(parsed.calfCm || "34");
          if (Array.isArray(parsed.history)) setMeasureHistory(parsed.history);
          if (parsed.lastSaved) setLastSaved(parsed.lastSaved);
        }
      } catch {
        // ignore load errors
      }
    };
    const loadGoal = async () => {
      try {
        const raw = await SecureStore.getItemAsync(GOAL_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed) {
          setGoalWeight(parsed.goalWeight || "");
          setGoalChest(parsed.goalChest || "");
          setGoalWaist(parsed.goalWaist || "");
          setGoalHips(parsed.goalHips || "");
          setGoalThigh(parsed.goalThigh || "");
          setGoalArm(parsed.goalArm || "");
          setGoalCalf(parsed.goalCalf || "");
          setGoalSavedAt(parsed.goalSavedAt || null);
        }
      } catch {
        // ignore goal load errors
      }
    };
    const loadRemoteGoal = async () => {
      if (!canSyncMeasurements) return false;
      try {
        const { data, error } = await supabase
          .from("goals")
          .select(
            "goal_weight,goal_chest,goal_waist,goal_hips,goal_thigh,goal_arm,goal_calf"
          )
          .eq(userCol, userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setGoalWeight(data.goal_weight?.toString() || "");
          setGoalChest(data.goal_chest?.toString() || "");
          setGoalWaist(data.goal_waist?.toString() || "");
          setGoalHips(data.goal_hips?.toString() || "");
          setGoalThigh(data.goal_thigh?.toString() || "");
          setGoalArm(data.goal_arm?.toString() || "");
          setGoalCalf(data.goal_calf?.toString() || "");
          const stamp = new Date().toLocaleString();
          setGoalSavedAt(stamp);
          await persistGoal(stamp);
          return true;
        }
      } catch {
        return false;
      }
      return false;
    };
    const loadAll = async () => {
      const remoteOk = await loadRemoteMeasurements();
      if (!remoteOk) {
        await loadSaved();
      }
      const goalRemoteOk = await loadRemoteGoal();
      if (!goalRemoteOk) {
        await loadGoal();
      }
    };
    loadAll();
  }, []);

  const saveMeasurements = async () => {
    const fields = [
      weightKg,
      chestCm,
      waistCm,
      hipsCm,
      thighCm,
      armCm,
      calfCm,
    ];
    const anyInvalid = fields.some(
      (v) => v.trim() !== "" && Number.isNaN(Number(v.trim()))
    );
    if (anyInvalid) {
      Alert.alert("Invalid number", "Please enter numbers only (use . for decimals).");
      return;
    }
    const now = new Date();
    const stamp = now.toLocaleString();
    setLastSaved(stamp);
    let entry = {
      id: editingEntryId || `${now.getTime()}`,
      label: now.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      weight: weightKg,
      chest: chestCm,
      waist: waistCm,
      hips: hipsCm,
      thigh: thighCm,
      arm: armCm,
      calf: calfCm,
    };

    setSavingMeasure(true);
    try {
      if (canSyncMeasurements) {
        const payload: any = {
          [userCol]: userId,
          taken_at: new Date().toISOString(),
          weight_kg: weightKg.trim() ? Number(weightKg) : null,
          chest_cm: chestCm.trim() ? Number(chestCm) : null,
          waist_cm: waistCm.trim() ? Number(waistCm) : null,
          hips_cm: hipsCm.trim() ? Number(hipsCm) : null,
          thigh_cm: thighCm.trim() ? Number(thighCm) : null,
          arm_cm: armCm.trim() ? Number(armCm) : null,
          calf_cm: calfCm.trim() ? Number(calfCm) : null,
        };
        if (editingEntryId) {
          const { error } = await supabase
            .from("measurements")
            .update(payload)
            .eq("id", editingEntryId)
              .eq(userCol, userId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("measurements")
            .insert([payload])
            .select()
            .single();
          if (error) throw error;
          if (data?.id) {
            entry = {
              ...entry,
              id: data.id,
              label: data.taken_at
                ? new Date(data.taken_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : entry.label,
            };
          }
        }
      }

      setMeasureHistory((prev) => {
        const next = editingEntryId
          ? prev.map((p) => (p.id === editingEntryId ? entry : p))
          : [entry, ...prev];
        const trimmed = next.slice(0, 20);
        persistMeasurements(trimmed, { lastSavedAt: stamp });
        return trimmed;
      });
      setEditingEntryId(null);
      Alert.alert("Saved", "Measurements updated.", [{ text: "OK" }]);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Could not save measurements.");
    } finally {
      setSavingMeasure(false);
    }
  };

  const handleEditHistory = (entryId: string) => {
    const entry = measureHistory.find((m) => m.id === entryId);
    if (!entry) return;
    setWeightKg(entry.weight);
    setChestCm(entry.chest);
    setWaistCm(entry.waist);
    setHipsCm(entry.hips);
    setThighCm(entry.thigh);
    setArmCm(entry.arm);
    setCalfCm(entry.calf);
    setEditingEntryId(entry.id);
  };

  const handleDeleteHistory = (entryId: string) => {
    Alert.alert("Delete entry", "Remove this measurement entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (canSyncMeasurements) {
            try {
              await supabase
                .from("measurements")
                .delete()
                .eq("id", entryId)
                .eq(userCol, userId);
            } catch (e: any) {
              Alert.alert(
                "Delete failed",
                e?.message || "Could not delete entry in cloud."
              );
            }
          }
          setMeasureHistory((prev) => {
            const next = prev.filter((m) => m.id !== entryId);
            persistMeasurements(next);
            return next;
          });
        },
      },
    ]);
  };

  const handleClearHistory = () => {
    Alert.alert("Clear history", "Remove all saved measurements?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          if (canSyncMeasurements) {
            try {
              await supabase.from("measurements").delete().eq(userCol, userId);
            } catch (e: any) {
              Alert.alert(
                "Clear failed",
                e?.message || "Could not clear history in cloud."
              );
            }
          }
          setMeasureHistory([]);
          persistMeasurements([]);
        },
      },
    ]);
  };

  const saveGoal = async () => {
    const goalFields = [
      goalWeight,
      goalChest,
      goalWaist,
      goalHips,
      goalThigh,
      goalArm,
      goalCalf,
    ];
    const anyInvalid = goalFields.some(
      (v) => v.trim() !== "" && Number.isNaN(Number(v.trim()))
    );
    if (anyInvalid) {
      Alert.alert("Invalid number", "Goal values must be numbers (use . for decimals).");
      return;
    }
    const stamp = new Date().toLocaleString();
    if (canSyncMeasurements) {
      try {
        const payload: any = {
          [userCol]: userId,
          goal_weight: goalWeight.trim() ? Number(goalWeight) : null,
          goal_chest: goalChest.trim() ? Number(goalChest) : null,
          goal_waist: goalWaist.trim() ? Number(goalWaist) : null,
          goal_hips: goalHips.trim() ? Number(goalHips) : null,
          goal_thigh: goalThigh.trim() ? Number(goalThigh) : null,
          goal_arm: goalArm.trim() ? Number(goalArm) : null,
          goal_calf: goalCalf.trim() ? Number(goalCalf) : null,
        };

        const { data: existing, error: fetchErr } = await supabase
          .from("goals")
          .select("id")
          .eq(userCol, userId)
          .limit(1)
          .maybeSingle();
        if (fetchErr) throw fetchErr;

        if (existing?.id) {
          const { error: updErr } = await supabase
            .from("goals")
            .update(payload)
            .eq("id", existing.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from("goals").insert([payload]);
          if (insErr) throw insErr;
        }
      } catch (e: any) {
        Alert.alert("Save failed", e?.message || "Could not save goal to cloud.");
      }
    }
    setGoalSavedAt(stamp);
    await persistGoal(stamp);
    Alert.alert("Saved", "Goal updated.", [{ text: "OK" }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {showSettings ? (
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.settingsOverlay,
            { backgroundColor: theme === "dark" ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)" },
          ]}
          onPress={() => setShowSettings(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.settingsSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.settingsGrabber,
                { backgroundColor: colors.muted, opacity: 0.6 },
              ]}
            />
            <Text style={[styles.settingsTitle, { color: colors.text }]}>Settings</Text>

            {settingsMode === "menu" && (
              <>
                <View
                  style={[
                    styles.themeRow,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View>
                    <Text style={[styles.sectionTitle, { marginBottom: 4, color: colors.text }]}>
                      Theme
                    </Text>
                    <Text style={[styles.sectionSub, { color: colors.muted }]}>
                      Switch between light and dark
                    </Text>
                  </View>
                  <Switch
                    value={theme === "dark"}
                    onValueChange={(v) => setTheme(v ? "dark" : "light")}
                    thumbColor={theme === "dark" ? colors.accentDark : "#fff"}
                    trackColor={{ false: "#d4d4d4", true: colors.accent }}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.settingsActionSecondary,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    setFormEmail(email || "");
                    setNewPass("");
                    setConfirmPass("");
                    setSettingsMode("set");
                  }}
                >
                  <Ionicons name="key-outline" size={18} color={colors.text} />
                  <Text style={[styles.settingsActionSecondaryText, { color: colors.text }]}>
                    Set password
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsActionSecondary,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    setFormEmail(email || "");
                    setSettingsMode("reset");
                  }}
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.text} />
                  <Text style={[styles.settingsActionSecondaryText, { color: colors.text }]}>
                    Reset password
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsAction,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    setEmail(null);
                    setShowSettings(false);
                    router.replace("/sign-in");
                  }}
                >
                  <Ionicons name="log-out-outline" size={18} color="#C83737" />
                  <Text style={[styles.settingsActionText, { color: colors.text }]}>
                    Log out
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {settingsMode === "set" && (
              <View style={[styles.formBlock, { backgroundColor: colors.card }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
                  ]}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  editable={!email}
                  selectTextOnFocus={!email}
                />
                <Text style={[styles.formLabel, { color: colors.text }]}>New password</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
                  ]}
                  value={newPass}
                  onChangeText={setNewPass}
                  secureTextEntry
                  placeholder="Enter new password"
                />
                <Text style={[styles.formLabel, { color: colors.text }]}>Confirm password</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
                  ]}
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                  secureTextEntry
                  placeholder="Confirm password"
                />
                <TouchableOpacity
                  style={[
                    styles.primaryAction,
                    { backgroundColor: colors.accent, borderColor: colors.accentDark },
                  ]}
                  onPress={() => {
                    if (!formEmail) {
                      Alert.alert("Missing email", "Please enter your email.");
                      return;
                    }
                    if (!newPass || newPass !== confirmPass) {
                      Alert.alert(
                        "Password mismatch",
                        "Please ensure passwords match."
                      );
                      return;
                    }
                    fakeNetwork(
                      `Password set for ${formEmail}. (Replace with real endpoint when ready.)`
                    );
                    setSettingsMode("menu");
                  }}
                >
                  <Text style={styles.primaryActionText}>Save password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsCancel,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setSettingsMode("menu")}
                >
                  <Text style={[styles.settingsCancelText, { color: colors.text }]}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {settingsMode === "reset" && (
              <View style={[styles.formBlock, { backgroundColor: colors.card }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
                  ]}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  editable={!email}
                  selectTextOnFocus={!email}
                />
                <TouchableOpacity
                  style={[
                    styles.primaryAction,
                    { backgroundColor: colors.accent, borderColor: colors.accentDark },
                  ]}
                  onPress={() => {
                    if (!formEmail) {
                      Alert.alert("Missing email", "Please enter your email.");
                      return;
                    }
                    fakeNetwork(
                      `Reset link sent to ${formEmail}. (Replace with real endpoint when ready.)`
                    );
                    setSettingsMode("menu");
                  }}
                >
                  <Text style={styles.primaryActionText}>Send reset link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsCancel,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setSettingsMode("menu")}
                >
                  <Text style={[styles.settingsCancelText, { color: colors.text }]}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {settingsMode === "menu" && (
              <TouchableOpacity
                style={[
                  styles.settingsCancel,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => {
                  setShowSettings(false);
                  setSettingsMode("menu");
                }}
              >
                <Text style={[styles.settingsCancelText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
            )}

            {settingsMode !== "menu" && (
              <TouchableOpacity
                style={[
                  styles.settingsCancel,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setSettingsMode("menu")}
              >
                <Text style={[styles.settingsCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.iconCircle, { backgroundColor: colors.card }]}>
            <Ionicons name="close" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: colors.text }]}>Your Profile</Text>
          <TouchableOpacity
            style={[styles.iconCircle, { backgroundColor: colors.card }]}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Avatar and name */}
        <View style={styles.avatarWrap}>
          <Image
            source={{
              uri: "https://media.licdn.com/dms/image/v2/D4E03AQHcrn61J7Kujg/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1690920703856?e=1767830400&v=beta&t=6ybsVAxwOmhRFTV8w-KMmEAwcPAmdFc-9s0se84G3SU",
            }}
            style={styles.avatar}
          />
        </View>
        <Text style={[styles.name, { color: colors.text }]}>Viktorija Deksne</Text>

        {/* Goal setting */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Goal</Text>
          <Text style={[styles.sectionSub, { color: colors.muted }]}>
            {goalSavedAt ? `Last saved: ${goalSavedAt}` : "Set ideal measurements to keep on track"}
          </Text>
        </View>
        <View
          style={[
            styles.goalCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.measureRow}>
            <Text style={[styles.measureLabel, { color: colors.text }]}>Goal weight (kg)</Text>
            <TextInput
              style={[
                styles.measureInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
              ]}
              keyboardType="decimal-pad"
              value={goalWeight}
              onChangeText={setGoalWeight}
              placeholder="e.g. 58"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
            <Text style={[styles.measureLabel, { color: colors.text }]}>Chest (cm)</Text>
            <TextInput
              style={[
                styles.measureInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
              ]}
              keyboardType="decimal-pad"
              value={goalChest}
              onChangeText={setGoalChest}
              placeholder="cm"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
            <Text style={[styles.measureLabel, { color: colors.text }]}>Waist (cm)</Text>
            <TextInput
              style={[
                styles.measureInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
              ]}
              keyboardType="decimal-pad"
              value={goalWaist}
              onChangeText={setGoalWaist}
              placeholder="cm"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
            <Text style={[styles.measureLabel, { color: colors.text }]}>Hips (cm)</Text>
            <TextInput
              style={[
                styles.measureInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
              ]}
              keyboardType="decimal-pad"
              value={goalHips}
              onChangeText={setGoalHips}
              placeholder="cm"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
            <Text style={[styles.measureLabel, { color: colors.text }]}>Thigh (cm)</Text>
            <TextInput
              style={[
                styles.measureInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
              ]}
              keyboardType="decimal-pad"
              value={goalThigh}
              onChangeText={setGoalThigh}
              placeholder="cm"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
            <Text style={[styles.measureLabel, { color: colors.text }]}>Upper Arm (cm)</Text>
            <TextInput
              style={[
                styles.measureInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
              ]}
              keyboardType="decimal-pad"
              value={goalArm}
              onChangeText={setGoalArm}
              placeholder="cm"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
            <Text style={[styles.measureLabel, { color: colors.text }]}>Calf (cm)</Text>
            <TextInput
              style={[
                styles.measureInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
              ]}
              keyboardType="decimal-pad"
              value={goalCalf}
              onChangeText={setGoalCalf}
              placeholder="cm"
              placeholderTextColor={colors.muted}
            />
          </View>
          <TouchableOpacity style={styles.primaryAction} onPress={saveGoal}>
            <Text style={styles.primaryActionText}>Save goal</Text>
          </TouchableOpacity>
        </View>

        {/* Stats summary */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Ionicons name="flash-outline" size={22} color={colors.accent} />
            <Text style={styles.metricValue}>
              {loading ? "…" : stats.totalWorkouts}
            </Text>
            <Text style={styles.metricLabel}>
              {error ? "Error" : "Total workouts"}
            </Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="person-outline" size={22} color={colors.accent} />
            <Text style={styles.metricValue}>
              {loading ? "…" : formattedTime}
            </Text>
            <Text style={styles.metricLabel}>Total Time</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="fitness-outline" size={22} color={colors.accent} />
            <Text style={styles.metricValue}>
              {loading ? "…" : `${stats.totalVolume} kg`}
            </Text>
            <Text style={styles.metricLabel}>Total Volume</Text>
          </View>
        </View>

        {/* Progress measurements */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress</Text>
          {lastSaved ? (
            <Text style={styles.sectionSub}>Last saved: {lastSaved}</Text>
          ) : (
            <Text style={styles.sectionSub}>Track weight and key measurements</Text>
          )}
        </View>

        <View
          style={[
            styles.measureCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {editingEntryId ? (
            <View style={styles.editBanner}>
              <Text style={styles.editBannerText}>Editing saved entry</Text>
              <TouchableOpacity
                onPress={() => setEditingEntryId(null)}
                style={styles.editBannerBtn}
              >
                <Text style={styles.editBannerBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.measureRow}>
          <Text style={[styles.measureLabel, { color: colors.text }]}>Weight (kg)</Text>
            <TextInput
            style={[
              styles.measureInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
              keyboardType="decimal-pad"
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="kg"
            placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
          <Text style={[styles.measureLabel, { color: colors.text }]}>Chest (cm)</Text>
            <TextInput
            style={[
              styles.measureInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
              keyboardType="decimal-pad"
              value={chestCm}
              onChangeText={setChestCm}
              placeholder="cm"
            placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
          <Text style={[styles.measureLabel, { color: colors.text }]}>Waist (cm)</Text>
            <TextInput
            style={[
              styles.measureInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
              keyboardType="decimal-pad"
              value={waistCm}
              onChangeText={setWaistCm}
              placeholder="cm"
            placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
          <Text style={[styles.measureLabel, { color: colors.text }]}>Hips (cm)</Text>
            <TextInput
            style={[
              styles.measureInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
              keyboardType="decimal-pad"
              value={hipsCm}
              onChangeText={setHipsCm}
              placeholder="cm"
            placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
          <Text style={[styles.measureLabel, { color: colors.text }]}>Thigh (cm)</Text>
            <TextInput
            style={[
              styles.measureInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
              keyboardType="decimal-pad"
              value={thighCm}
              onChangeText={setThighCm}
              placeholder="cm"
            placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
          <Text style={[styles.measureLabel, { color: colors.text }]}>Upper Arm (cm)</Text>
            <TextInput
            style={[
              styles.measureInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
              keyboardType="decimal-pad"
              value={armCm}
              onChangeText={setArmCm}
              placeholder="cm"
            placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.measureRow}>
          <Text style={[styles.measureLabel, { color: colors.text }]}>Calf (cm)</Text>
            <TextInput
            style={[
              styles.measureInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg },
            ]}
              keyboardType="decimal-pad"
              value={calfCm}
              onChangeText={setCalfCm}
              placeholder="cm"
            placeholderTextColor={colors.muted}
            />
          </View>
          <TouchableOpacity style={styles.primaryAction} onPress={saveMeasurements}>
            <Text style={styles.primaryActionText}>Save measurements</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Measurement history</Text>
            <Text style={styles.sectionSub}>
              Latest entries (local + cloud, up to 20)
            </Text>
          </View>
          {measureHistory.length > 0 ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearHistory}
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {summary ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Change summary</Text>
              <Text style={styles.summaryRange}>
                {summary.from} → {summary.to}
              </Text>
            </View>
            <View style={styles.summaryGrid}>
              <Text
                style={[
                  styles.summaryMetric,
                  summary.weight.tone === "up" && styles.summaryMetricUp,
                  summary.weight.tone === "down" && styles.summaryMetricDown,
                ]}
              >
                Weight: {summary.weight.formatted}
              </Text>
              <Text
                style={[
                  styles.summaryMetric,
                  summary.chest.tone === "up" && styles.summaryMetricUp,
                  summary.chest.tone === "down" && styles.summaryMetricDown,
                ]}
              >
                Chest: {summary.chest.formatted}
              </Text>
              <Text
                style={[
                  styles.summaryMetric,
                  summary.waist.tone === "up" && styles.summaryMetricUp,
                  summary.waist.tone === "down" && styles.summaryMetricDown,
                ]}
              >
                Waist: {summary.waist.formatted}
              </Text>
              <Text
                style={[
                  styles.summaryMetric,
                  summary.hips.tone === "up" && styles.summaryMetricUp,
                  summary.hips.tone === "down" && styles.summaryMetricDown,
                ]}
              >
                Hips: {summary.hips.formatted}
              </Text>
              <Text
                style={[
                  styles.summaryMetric,
                  summary.thigh.tone === "up" && styles.summaryMetricUp,
                  summary.thigh.tone === "down" && styles.summaryMetricDown,
                ]}
              >
                Thigh: {summary.thigh.formatted}
              </Text>
              <Text
                style={[
                  styles.summaryMetric,
                  summary.arm.tone === "up" && styles.summaryMetricUp,
                  summary.arm.tone === "down" && styles.summaryMetricDown,
                ]}
              >
                Arm: {summary.arm.formatted}
              </Text>
              <Text
                style={[
                  styles.summaryMetric,
                  summary.calf.tone === "up" && styles.summaryMetricUp,
                  summary.calf.tone === "down" && styles.summaryMetricDown,
                ]}
              >
                Calf: {summary.calf.formatted}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Add at least two entries to see changes.
          </Text>
        )}
        {measureHistory.length === 0 ? (
          <Text style={styles.emptyText}>No measurements saved yet.</Text>
        ) : (
          measureHistory.map((m) => (
            <View
              key={m.id}
              style={[
                styles.historyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.historyHeader}>
                <Text style={[styles.historyLabel, { color: colors.text }]}>{m.label}</Text>
                <Text style={[styles.historyWeight, { color: colors.text }]}>
                  {m.weight} kg
                </Text>
                <View style={styles.historyActions}>
                  <TouchableOpacity
                    onPress={() => handleEditHistory(m.id)}
                    style={[
                      styles.historyActionBtn,
                      { backgroundColor: colors.bg, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.historyActionText, { color: colors.text }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteHistory(m.id)}
                    style={[
                      styles.historyActionBtn,
                      { backgroundColor: colors.bg, borderColor: colors.border },
                    ]}
                  >
                    <Text style={styles.historyDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.historyGrid}>
                <Text style={[styles.historyMetric, { color: colors.muted }]}>
                  Chest: {m.chest} cm
                </Text>
                <Text style={[styles.historyMetric, { color: colors.muted }]}>
                  Waist: {m.waist} cm
                </Text>
                <Text style={[styles.historyMetric, { color: colors.muted }]}>
                  Hips: {m.hips} cm
                </Text>
                <Text style={[styles.historyMetric, { color: colors.muted }]}>
                  Thigh: {m.thigh} cm
                </Text>
                <Text style={[styles.historyMetric, { color: colors.muted }]}>
                  Arm: {m.arm} cm
                </Text>
                <Text style={[styles.historyMetric, { color: colors.muted }]}>
                  Calf: {m.calf} cm
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityCard({
  color,
  icon,
  title,
  subtitle,
  duration,
  volume,
  sets,
}: {
  color: string;
  icon: "run" | "bike";
  title: string;
  subtitle: string;
  duration: string;
  volume: string;
  sets: string;
}) {
  const iconName = icon === "run" ? "run" : "bike-fast";

  return (
    <View style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={iconName as any} size={22} color="#111" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMeta}>{subtitle}</Text>
        <Text style={styles.cardMeta}>{duration}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardPrimary}>{volume}</Text>
        <Text style={styles.cardCalories}>{sets}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  avatarWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginBottom: 20,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  metric: {
    alignItems: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#EAFDFC",
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: "#B7C6D4",
    marginTop: 2,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#f2f2f2",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  tabActive: {
    backgroundColor: "#dedede",
  },
  tabTextActive: {
    color: "#111",
  },
  tabMuted: {
    backgroundColor: "#f7f7f7",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    marginVertical: 8,
  },
  errorText: {
    textAlign: "center",
    color: "#222",
    marginVertical: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#444",
    marginVertical: 8,
  },
  settingsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
    justifyContent: "flex-end",
    zIndex: 10,
  },
  settingsSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderColor: "#E5E5E5",
  },
  settingsGrabber: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D7D7D7",
    alignSelf: "center",
    marginBottom: 12,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
    textAlign: "center",
  },
  settingsAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
  },
  settingsActionText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 15,
  },
  settingsActionSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
    marginBottom: 6,
  },
  settingsActionSecondaryText: {
    color: "#111",
    fontWeight: "600",
    fontSize: 14,
  },
  settingsCancel: {
    marginTop: 14,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F4F4F4",
    borderRadius: 12,
  },
  settingsCancelText: {
    color: "#111",
    fontWeight: "700",
    fontSize: 14,
  },
  formBlock: {
    marginTop: 12,
    gap: 10,
  },
  formLabel: {
    fontSize: 12,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E6EE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  primaryAction: {
    marginTop: 8,
    backgroundColor: "#0F1116",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#08E8DE",
  },
  primaryActionText: {
    color: "#EAFDFC",
    fontWeight: "700",
    fontSize: 14,
  },
  dayStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dayItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dayItemActive: {
    backgroundColor: "#e0e0e0",
  },
  dayText: {
    fontSize: 12,
    color: "#777",
  },
  dayTextActive: {
    fontWeight: "700",
    color: "#111",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 12,
    shadowColor: "transparent",
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#e6e6e6",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#777",
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  cardPrimary: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  cardCaloriesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardCalories: {
    fontSize: 12,
    color: "#777",
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EAFDFC",
  },
  sectionSub: {
    marginTop: 4,
    color: "#B7C6D4",
    fontSize: 12,
  },
  measureCard: {
    backgroundColor: "#0F1116",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#162029",
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  measureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  measureLabel: {
    fontSize: 14,
    color: "#EAFDFC",
    flex: 1,
  },
  measureInput: {
    borderWidth: 1,
    borderColor: "#162029",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 120,
    backgroundColor: "#0B0C0F",
    color: "#EAFDFC",
  },
  historyCard: {
    backgroundColor: "#0F1116",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#162029",
    padding: 12,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EAFDFC",
  },
  historyWeight: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EAFDFC",
  },
  historyActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  historyActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#0B0C0F",
    borderWidth: 1,
    borderColor: "#162029",
  },
  historyActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EAFDFC",
  },
  historyDeleteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#08E8DE",
  },
  historyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  historyMetric: {
    fontSize: 12,
    color: "#EAFDFC",
    backgroundColor: "#0B0C0F",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#162029",
  },
  editBanner: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  editBannerText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  editBannerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  editBannerBtnText: {
    fontWeight: "800",
    fontSize: 12,
    color: "#111",
  },
  summaryCard: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  summaryRange: {
    color: "#ccc",
    fontSize: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryMetric: {
    color: "#fff",
    backgroundColor: "#1f1f1f",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 12,
    borderWidth: 1,
    borderColor: "#2c2c2c",
  },
  summaryMetricUp: {
    borderColor: "#4ade80",
    color: "#d1fae5",
  },
  summaryMetricDown: {
    borderColor: "#f87171",
    color: "#fee2e2",
  },
  goalCard: {
    backgroundColor: "#F7F7F7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 16,
    gap: 10,
    marginBottom: 12,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#162029",
    backgroundColor: "#0F1116",
  },
  clearBtnText: {
    color: "#08E8DE",
    fontWeight: "800",
    fontSize: 12,
  },
});
