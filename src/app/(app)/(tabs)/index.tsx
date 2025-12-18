import React from "react";
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";

const lastWorkouts = [
  { title: "Today", duration: "90 min", summary: "4 exercises | 20 sets" },
  { title: "Yesterday", duration: "75 min", summary: "5 exercises | 18 sets" },
];

export default function Page() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop",
              }}
              style={styles.avatarImage}
            />
          </View>
          <View>
            <Text style={styles.greeting}>Hello Viktorija!</Text>
            <Text style={styles.date}>Thursday, January 1</Text>
          </View>
        </View>

        {/* Workout Statistics */}
        <Text style={styles.sectionTitle}>Workout Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.card, styles.cardSmall]}>
            <Text style={styles.cardLabel}>Total Workouts</Text>
            <Text style={styles.cardValue}>1000</Text>
          </View>
          <View style={[styles.card, styles.cardSmall]}>
            <Text style={styles.cardLabel}>Average Duration</Text>
            <Text style={styles.cardValue}>90 min</Text>
            <View style={styles.placeholderChart} />
          </View>
          <View style={[styles.card, styles.cardSmall]}>
            <Text style={styles.cardLabel}>Total Time</Text>
            <Text style={styles.cardValue}>10,000 h</Text>
          </View>
          <View style={[styles.card, styles.cardSmall]}>
            <Text style={styles.cardLabel}>Weekly Volume</Text>
            <Text style={styles.cardValue}>120 sets</Text>
            <Text style={styles.cardSubValue}>8,390 kg lifted</Text>
          </View>
          <View style={[styles.card, styles.cardSmall]}>
            <Text style={styles.cardLabel}>Active Streak</Text>
            <Text style={styles.cardValue}>12 days</Text>
          </View>
          <View style={[styles.card, styles.cardSmall]}>
            <Text style={styles.cardLabel}>Best Streak</Text>
            <Text style={styles.cardValue}>30 days</Text>
          </View>
        </View>

        {/* Last Workouts */}
        <Text style={styles.sectionTitle}>Last Workouts</Text>
        <View style={styles.list}>
          {lastWorkouts.map((item, idx) => (
            <View key={`${item.title}-${idx}`} style={styles.listItem}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listDuration}>{item.duration}</Text>
              <Text style={styles.listSummary}>{item.summary}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  scroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFEFEF",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  greeting: {
    fontSize: 16,
    color: "#666",
    marginBottom: 2,
  },
  date: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  cardSmall: {
    width: "48%",
    minHeight: 110,
    justifyContent: "space-between",
  },
  cardLabel: {
    fontSize: 13,
    color: "#777",
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },
  cardSubValue: {
    marginTop: 4,
    fontSize: 12,
    color: "#777",
  },
  placeholderChart: {
    marginTop: 8,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#FDE7EB",
  },
  list: {
    gap: 12,
  },
  listItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  listTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  listDuration: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  listSummary: {
    marginTop: 4,
    fontSize: 13,
    color: "#777",
  },
});
