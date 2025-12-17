import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const dayLabels = ["5", "6", "7", "Now, July 8", "9", "10", "11"];

export default function Profile() {
  return (
    <SafeAreaView style={styles.container}>
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
          <TouchableOpacity style={styles.iconCircle}>
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
            <Text style={styles.metricValue}>246</Text>
            <Text style={styles.metricLabel}>Total workouts</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="person-outline" size={22} color="#111" />
            <Text style={styles.metricValue}>682h</Text>
            <Text style={styles.metricLabel}>Total Time</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Timeline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, styles.tabActive]}>
            <Text style={[styles.tabText, styles.tabTextActive]}>Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, styles.tabMuted]}>
            <Text style={styles.tabText}>Duels</Text>
          </TouchableOpacity>
        </View>

        {/* Day strip */}
        <View style={styles.dayStrip}>
          {dayLabels.map((d, idx) => {
            const isNow = d.startsWith("Now");
            return (
              <TouchableOpacity
                key={d}
                style={[styles.dayItem, isNow && styles.dayItemActive]}
              >
                <Text style={[styles.dayText, isNow && styles.dayTextActive]}>
                  {isNow ? d : d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Activity cards */}
        <ActivityCard
          color="#FDE9EA"
          icon="run"
          title="Indoor Run"
          distance="5.56 km"
          duration="24 min"
          calories="348 kcal"
        />
        <ActivityCard
          color="#E7E7E7"
          icon="bike"
          title="Outdoor Cycle"
          distance="4.22 km"
          duration="24 min"
          calories="248 kcal"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityCard({
  color,
  icon,
  title,
  distance,
  duration,
  calories,
}: {
  color: string;
  icon: "run" | "bike";
  title: string;
  distance: string;
  duration: string;
  calories: string;
}) {
  const iconName =
    icon === "run"
      ? "run"
      : "bike-fast";

  return (
    <View style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons
          name={iconName as any}
          size={22}
          color="#111"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardMeta}>{duration}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardPrimary}>{distance}</Text>
        <View style={styles.cardCaloriesRow}>
          <Ionicons name="flame-outline" size={14} color="#777" />
          <Text style={styles.cardCalories}>{calories}</Text>
        </View>
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
