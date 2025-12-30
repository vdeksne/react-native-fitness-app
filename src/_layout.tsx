import "./shims/platform-constants"; // ensure PlatformConstants exists before anything else
import { Slot } from "expo-router";
import { Platform, NativeModules } from "react-native";
import { ThemeProvider } from "./context/ThemeContext";

// Shim: ensure PlatformConstants exists for any platform to avoid TurboModuleRegistry crashes
// when bundling/running on web or mismatched native deps.
const existingProxy = (global as any).__turboModuleProxy;
(global as any).__turboModuleProxy = (name: string) => {
  if (name === "PlatformConstants") {
    const defaults =
      Platform.OS === "ios"
        ? {
            forceTouchAvailable: false,
            interfaceIdiom: "handset",
            isTesting: false,
            osVersion: "web-ios",
            systemName: "iOS",
            reactNativeVersion: { major: 0, minor: 0, patch: 0, prerelease: null },
          }
        : {
            forceTouchAvailable: false,
            interfaceIdiom: Platform.OS,
            isTesting: false,
            osVersion: "web",
            systemName: Platform.OS,
            reactNativeVersion: { major: 0, minor: 0, patch: 0, prerelease: null },
          };
    return {
      getConstants: () => defaults,
    };
  }
  return existingProxy ? existingProxy(name) : null;
};

// Also provide legacy NativeModules fallback for PlatformConstants (used if turbo proxy missing).
(NativeModules as any).PlatformConstants =
  (NativeModules as any).PlatformConstants || {
    getConstants: () => ({
      forceTouchAvailable: false,
      interfaceIdiom: Platform.OS === "ios" ? "handset" : Platform.OS,
      isTesting: false,
      osVersion: Platform.OS === "ios" ? "web-ios" : "web",
      systemName: Platform.OS,
      reactNativeVersion: { major: 0, minor: 0, patch: 0, prerelease: null },
    }),
  };

export default function Layout() {
  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}
