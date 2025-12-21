// Ensure PlatformConstants exists for native (iOS/Android) and web bundles.
import { NativeModules, Platform } from "react-native";

function getNativeConstants() {
  try {
    if (Platform.OS === "android") {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("react-native/Libraries/Utilities/NativePlatformConstantsAndroid");
    }
    // default to iOS implementation (also works for simulators)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native/Libraries/Utilities/NativePlatformConstantsIOS");
  } catch (e) {
    // Fallback minimal constants
    return {
      getConstants: () => ({
        forceTouchAvailable: false,
        interfaceIdiom: Platform.OS,
        isTesting: false,
        osVersion: "unknown",
        systemName: Platform.OS,
        reactNativeVersion: { major: 0, minor: 0, patch: 0, prerelease: null },
      }),
    };
  }
}

const nativePlatformConstants = getNativeConstants();

const existingProxy = (global as any).__turboModuleProxy;
(global as any).__turboModuleProxy = (name: string) => {
  if (name === "PlatformConstants") {
    return nativePlatformConstants;
  }
  return existingProxy ? existingProxy(name) : null;
};

(NativeModules as any).PlatformConstants =
  (NativeModules as any).PlatformConstants || nativePlatformConstants;

