module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-linear-gradient|react-native-screens|react-native-gesture-handler|react-native-safe-area-context|react-native-image-picker|react-native-video|react-native-image-marker|react-native-config)/)',
  ],
};
