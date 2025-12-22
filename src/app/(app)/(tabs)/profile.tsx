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
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabaseSafe as supabase } from "../../../lib/supabase";
import { useRouter } from "expo-router";
import { useAuthContext } from "../../../context/AuthContext";

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

  return (
    <SafeAreaView style={styles.container}>
      {showSettings ? (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.settingsOverlay}
          onPress={() => setShowSettings(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.settingsSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.settingsGrabber} />
            <Text style={styles.settingsTitle}>Settings</Text>

            {settingsMode === "menu" && (
              <>
                <TouchableOpacity
                  style={styles.settingsActionSecondary}
                  onPress={() => {
                    setFormEmail(email || "");
                    setNewPass("");
                    setConfirmPass("");
                    setSettingsMode("set");
                  }}
                >
                  <Ionicons name="key-outline" size={18} color="#111" />
                  <Text style={styles.settingsActionSecondaryText}>
                    Set password
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsActionSecondary}
                  onPress={() => {
                    setFormEmail(email || "");
                    setSettingsMode("reset");
                  }}
                >
                  <Ionicons name="refresh-outline" size={18} color="#111" />
                  <Text style={styles.settingsActionSecondaryText}>
                    Reset password
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingsAction}
                  onPress={() => {
                    setEmail(null);
                    setShowSettings(false);
                    router.replace("/sign-in");
                  }}
                >
                  <Ionicons name="log-out-outline" size={18} color="#C83737" />
                  <Text style={styles.settingsActionText}>Log out</Text>
                </TouchableOpacity>
              </>
            )}

            {settingsMode === "set" && (
              <View style={styles.formBlock}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  editable={!email}
                  selectTextOnFocus={!email}
                />
                <Text style={styles.formLabel}>New password</Text>
                <TextInput
                  style={styles.input}
                  value={newPass}
                  onChangeText={setNewPass}
                  secureTextEntry
                  placeholder="Enter new password"
                />
                <Text style={styles.formLabel}>Confirm password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                  secureTextEntry
                  placeholder="Confirm password"
                />
                <TouchableOpacity
                  style={styles.primaryAction}
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
                  style={styles.settingsCancel}
                  onPress={() => setSettingsMode("menu")}
                >
                  <Text style={styles.settingsCancelText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {settingsMode === "reset" && (
              <View style={styles.formBlock}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email"
                  editable={!email}
                  selectTextOnFocus={!email}
                />
                <TouchableOpacity
                  style={styles.primaryAction}
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
                  style={styles.settingsCancel}
                  onPress={() => setSettingsMode("menu")}
                >
                  <Text style={styles.settingsCancelText}>Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {settingsMode === "menu" && (
              <TouchableOpacity
                style={styles.settingsCancel}
                onPress={() => {
                  setShowSettings(false);
                  setSettingsMode("menu");
                }}
              >
                <Text style={styles.settingsCancelText}>Close</Text>
              </TouchableOpacity>
            )}

            {settingsMode !== "menu" && (
              <TouchableOpacity
                style={styles.settingsCancel}
                onPress={() => setSettingsMode("menu")}
              >
                <Text style={styles.settingsCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconCircle}>
            <Ionicons name="close" size={18} color="#111" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Your Profile</Text>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings-outline" size={18} color="#111" />
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
        <Text style={styles.name}>Viktorija Deksne</Text>

        {/* Stats summary */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Ionicons name="flash-outline" size={22} color="#111" />
            <Text style={styles.metricValue}>
              {loading ? "…" : stats.totalWorkouts}
            </Text>
            <Text style={styles.metricLabel}>
              {error ? "Error" : "Total workouts"}
            </Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="person-outline" size={22} color="#111" />
            <Text style={styles.metricValue}>
              {loading ? "…" : formattedTime}
            </Text>
            <Text style={styles.metricLabel}>Total Time</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="fitness-outline" size={22} color="#111" />
            <Text style={styles.metricValue}>
              {loading ? "…" : `${stats.totalVolume} kg`}
            </Text>
            <Text style={styles.metricLabel}>Total Volume</Text>
          </View>
        </View>

        {/* Latest workouts */}
        {loading ? (
          <Text style={styles.loadingText}>Loading workouts…</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : cards.length === 0 ? (
          <Text style={styles.emptyText}>No workouts yet.</Text>
        ) : (
          cards.map((c, idx) => (
            <ActivityCard
              key={c.key}
              color={idx === 0 ? "#FDE9EA" : "#E7E7E7"}
              icon="run"
              title={c.title}
              subtitle={c.dateLabel}
              duration={c.duration}
              volume={c.volume}
              sets={c.sets}
            />
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
    backgroundColor: "#F7F7F7",
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
    backgroundColor: "#F1F1F1",
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
    color: "#111",
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F3F3F3",
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
    backgroundColor: "#FBEDF1",
  },
  tabTextActive: {
    color: "#111",
  },
  tabMuted: {
    backgroundColor: "#F7F7F7",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    marginVertical: 8,
  },
  errorText: {
    textAlign: "center",
    color: "#C83737",
    marginVertical: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginVertical: 8,
  },
  settingsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
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
    backgroundColor: "#FFF4F4",
  },
  settingsActionText: {
    color: "#C83737",
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
    backgroundColor: "#F6F7FB",
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
    backgroundColor: "#1E3DF0",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryActionText: {
    color: "#fff",
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
    backgroundColor: "#FBE9EF",
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
    borderColor: "#E8E8E8",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
});
