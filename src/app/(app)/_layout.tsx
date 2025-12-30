import "react-native-reanimated";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts, Ubuntu_400Regular, Ubuntu_500Medium, Ubuntu_700Bold } from "@expo-google-fonts/ubuntu";
import { Text, TextInput } from "react-native";
import { ThemeProvider, useTheme } from "../../context/ThemeContext";
import { AuthProvider } from "../../context/AuthContext";

// Align React.version with react-native-renderer to avoid version mismatch crashes.
// ReactNativeRenderer expects 19.1.0 (from RN 0.81), so we ensure React reports the same.
(React as any).version = "19.1.0";

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Ubuntu_400Regular,
    Ubuntu_500Medium,
    Ubuntu_700Bold,
  });
  const { colors } = useTheme();

  useEffect(() => {
    if (!fontsLoaded) return;
    const baseStyle = {
      fontFamily: "Ubuntu_400Regular",
      fontWeight: "400" as const,
      color: colors.text,
    };
    const mergeStyle = (current?: any) => (current ? [current, baseStyle] : baseStyle);
    Text.defaultProps = {
      ...(Text.defaultProps || {}),
      style: mergeStyle(Text.defaultProps?.style),
    };
    TextInput.defaultProps = {
      ...(TextInput.defaultProps || {}),
      style: mergeStyle(TextInput.defaultProps?.style),
      placeholderTextColor: colors.muted,
    };
  }, [fontsLoaded, colors]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
