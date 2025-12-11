import React from "react";
import { SafeAreaView, Text, View, StyleSheet } from "react-native";
import { useAuthContext } from "../../../context/AuthContext";

export default function Page() {
  const { email } = useAuthContext();
  const displayEmail = email || "Not signed in";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.label}>Signed in as:</Text>
        <Text style={styles.value}>{displayEmail}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
  },
});
