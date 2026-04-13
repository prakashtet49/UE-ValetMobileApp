jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('./src/api/fcm', () => ({
  registerFCMToken: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('@react-native-firebase/messaging', () => {
  const noop = () => jest.fn(() => {});
  const AuthorizationStatus = {AUTHORIZED: 1, PROVISIONAL: 2, DENIED: 0};
  const factory = () => ({
    onNotificationOpenedApp: noop,
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    onMessage: noop,
    onTokenRefresh: noop,
    requestPermission: jest.fn(() => Promise.resolve(AuthorizationStatus.AUTHORIZED)),
    getToken: jest.fn(() => Promise.resolve('test-fcm-token')),
    deleteToken: jest.fn(() => Promise.resolve()),
    setBackgroundMessageHandler: jest.fn(),
  });
  factory.AuthorizationStatus = AuthorizationStatus;
  return factory;
});

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    getChannels: jest.fn(() => Promise.resolve([])),
    deleteChannel: jest.fn(() => Promise.resolve()),
    createChannel: jest.fn(() => Promise.resolve()),
    displayNotification: jest.fn(() => Promise.resolve('mock-notification-id')),
    onForegroundEvent: jest.fn(() => jest.fn()),
  },
  AndroidImportance: {HIGH: 4, DEFAULT: 3},
}));
