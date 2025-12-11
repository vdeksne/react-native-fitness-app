import React from "react";
import { SafeAreaView, Text, View, StyleSheet } from "react-native";

export default function Page() {
  return (
    <SafeAreaView style={styles.container}>
      <Text>Profile</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
