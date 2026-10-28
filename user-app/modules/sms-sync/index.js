module.exports = {
  start: async () => {},
  stop: async () => {},
  isRunning: async () => true,
  hasConsented: async () => true,
  setConsented: async () => {},
  getDeviceId: async () => null,
  getDeviceLabel: () => 'Unknown Device',
  getStatus: () => 'Service Active',
  getPermissionsStatus: async () => ({}),
};
