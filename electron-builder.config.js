/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: "io.zaks.blackhole-visualizer",
  productName: "Blackhole Audio Visualizer",
  directories: {
    output: "release",
    buildResources: "build-resources",
  },
  files: ["dist-electron/**/*", "out/**/*"],
  mac: {
    icon: "build-resources/icon.icns",
    category: "public.app-category.music",
    target: ["dmg", "zip"],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build-resources/entitlements.mac.plist",
    entitlementsInherit: "build-resources/entitlements.mac.plist",
    extendInfo: {
      NSAudioCaptureUsageDescription:
        "This app needs access to system audio for music visualization.",
      NSMicrophoneUsageDescription: "This app needs microphone access for audio visualization.",
    },
  },
  dmg: {
    contents: [
      {
        x: 130,
        y: 220,
      },
      {
        x: 410,
        y: 220,
        type: "link",
        path: "/Applications",
      },
    ],
  },
  win: {
    target: ["nsis"],
    icon: "build-resources/icon.ico",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: "build-resources/icon.ico",
    uninstallerIcon: "build-resources/icon.ico",
  },
};
