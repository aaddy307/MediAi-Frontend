export default {
  expo: {
    name: "MediAI",
    slug: "mediai-app",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "mediai",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/logo.png",
      resizeMode: "contain",
      backgroundColor: "#060D1A"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    // EXPO_PUBLIC_* / extra values ship inside the compiled app — never put secrets here,
    // only the public backend URL.
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://your-backend-url.example.com"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: "MediAI needs camera access to scan prescriptions and for Emergency Scan face identification.",
        NSLocationWhenInUseUsageDescription: "MediAI needs your location to dispatch emergency help."
      }
    },
    android: {
      softwareKeyboardLayoutMode: "resize",
      permissions: ["CAMERA", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"]
    },
    plugins: ["expo-secure-store", "expo-camera", "expo-notifications"]
  }
};
