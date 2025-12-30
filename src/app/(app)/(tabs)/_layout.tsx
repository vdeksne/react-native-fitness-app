import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../../../context/ThemeContext";

const Logo = ({ color }: { color: string }) => (
  <View style={{ alignItems: "center", justifyContent: "center", height: 36 }}>
    <Svg width={36} height={30} viewBox="0 0 129 109" fill="none">
      <Path
        d="M52.0467 105.63L0 56.8698L52.0467 8.10991L6.55598 56.8698L52.0467 105.63Z"
        fill={color}
      />
      <Path
        d="M114.476 56.7268L65.7064 109L16.9561 56.7268L65.7064 98.7506L114.476 56.7268Z"
        fill={color}
      />
      <Path
        d="M128.737 56.7948L76.9875 105.628L122.747 57.0172L69.8244 9.04739L65.697 73.5416C65.697 73.5416 65.7857 9.87149 65.738 0L128.737 56.7948Z"
        fill={color}
      />
    </Svg>
  </View>
);

export default function Layout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: () => <Logo color={colors.accent} />,
        headerTitleAlign: "center",
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.tabBg,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.headerBg,
        },
        headerTitleStyle: {
          color: colors.text,
        },
        headerTintColor: colors.accent,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "Workout",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: "Exercises",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="body" color={color} size={size} />
          ),
        }}
      />
      {/* Hidden detail screen (accessed via push, not shown in tab bar) */}
      <Tabs.Screen
        name="exercise-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
