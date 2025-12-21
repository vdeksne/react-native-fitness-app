import "react-native-reanimated";
import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../../context/AuthContext";

// Align React.version with react-native-renderer to avoid version mismatch crashes.
// ReactNativeRenderer expects 19.1.0 (from RN 0.81), so we ensure React reports the same.
(React as any).version = "19.1.0";

export default function Layout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
