// Global shim to ensure PlatformConstants exists even when native modules are missing
// (e.g., web/Hermes builds without native PlatformConstants).

import { Platform, NativeModules } from "react-native";

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

// Legacy NativeModules fallback
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

