// app.config.js
export default ({ config }) => ({
  name: "SmartSpendApp",            // display name (can be pretty)
  slug: "smartspend",               // MUST match the existing EAS project slug (lowercase, no spaces)
  version: "1.0.0",
  owner: "bazlinamar",

  icon: "./screens/images/App_Logo_imresizer.png",
  orientation: "portrait",
  platforms: ["ios", "android"],
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],

  web: { output: "static", bundler: "metro" },

  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: "34.0.0"
        },
        ios: {
          deploymentTarget: "13.4"
        }
      }
    ]
  ],

  ios: {
    bundleIdentifier: "com.bazlinamar.smartspend", // valid reverse-DNS id
    infoPlist: { ITSAppUsesNonExemptEncryption: false }
  },

  android: {
    package: "com.bazlinamar.smartspend"           // all lowercase
  },

  extra: {
    eas: { projectId: "45cbf1a9-fad6-4779-963b-1592e4a1e630" }, // keep this ID
    apiUrl: process.env.API_URL || "https://0da41aa167cb.ngrok-free.app"
  },

  runtimeVersion: { policy: "appVersion" }
});
