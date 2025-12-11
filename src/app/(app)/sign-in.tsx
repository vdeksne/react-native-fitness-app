import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Alert,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import { useAuthContext } from "../../context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setEmail: setAuthEmail } = useAuthContext();

  // Google OAuth (expo-auth-session)
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: Constants.expoConfig?.extra?.googleClientIdIos ?? "",
    androidClientId: Constants.expoConfig?.extra?.googleClientIdAndroid ?? "",
    webClientId: Constants.expoConfig?.extra?.googleClientIdWeb ?? "",
  });

  useEffect(() => {
    const handleAuth = async () => {
      if (
        response?.type === "success" &&
        response.authentication?.accessToken
      ) {
        try {
          const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
            headers: {
              Authorization: `Bearer ${response.authentication.accessToken}`,
            },
          });
          const profile = await res.json();
          const emailFromGoogle = profile?.email ?? "google-user";
          setAuthEmail(emailFromGoogle);
          router.replace("/(app)/(tabs)");
        } catch (err) {
          console.warn("Google profile fetch failed", err);
          setAuthEmail("google-user");
          router.replace("/(app)/(tabs)");
        }
      }
    };
    handleAuth();
  }, [response, router, setAuthEmail]);

  const handleGoogleSignIn = async () => {
    try {
      await promptAsync();
    } catch (err: any) {
      Alert.alert("Google Sign-in failed", err?.message || "Please try again");
      console.error("Google sign-in error:", err);
    }
  };

  const handleSignIn = () => {
    // Simple placeholder email/password sign-in
    setAuthEmail(email || "user@example.com");
    router.replace("/(app)/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign In</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSignIn}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={!request}
        >
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push("/sign-up")}
        >
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
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
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#F9F9F9",
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  googleButton: {
    backgroundColor: "#4285F4",
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    color: "#666",
    fontSize: 14,
  },
});
