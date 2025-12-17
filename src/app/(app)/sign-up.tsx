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
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import { useAuthContext } from "../../context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { setEmail: setAuthEmail } = useAuthContext();

  const redirectUri = makeRedirectUri({ useProxy: true } as any);

  // Google OAuth (expo-auth-session)
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: Constants.expoConfig?.extra?.googleClientIdIos ?? "",
    androidClientId: Constants.expoConfig?.extra?.googleClientIdAndroid ?? "",
    webClientId: Constants.expoConfig?.extra?.googleClientIdWeb ?? "",
    redirectUri,
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

  const handleGoogleSignUp = async () => {
    try {
      await promptAsync({ useProxy: true, redirectUri } as any);
    } catch (err: any) {
      Alert.alert("Google Sign-up failed", err?.message || "Please try again");
      console.error("Google sign-up error:", err);
    }
  };

  const handleSignUp = () => {
    if (password !== confirm) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    setAuthEmail(email || "user@example.com");
    router.replace("/(app)/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>

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

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleSignUp}
          disabled={!request}
        >
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push("/sign-in")}
        >
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
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
