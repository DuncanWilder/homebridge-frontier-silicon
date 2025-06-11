const { test, describe, beforeEach, mock } = require('node:test');
const assert = require('node:assert');

// Mock the wifiradio module
const mockWifiRadio = {
  getPower: mock.fn(),
  setPower: mock.fn()
};

// Mock modules using the experimental feature
mock.module('wifiradio', () => mockWifiRadio);
mock.module('request', () => mock.fn());
mock.module('polling-to-event', () => mock.fn());

describe('Power State Management', () => {
  let HttpAccessory;
  let mockLog;
  let accessory;

  beforeEach(() => {
    // Reset mocks
    mockWifiRadio.getPower.mock.resetCalls();
    mockWifiRadio.setPower.mock.resetCalls();

    // Setup mock implementations
    mockWifiRadio.getPower.mock.mockImplementation(() => Promise.resolve('1'));
    mockWifiRadio.setPower.mock.mockImplementation(() => Promise.resolve());

    // Setup mock globals
    global.Service = {
      Switch: function(name) {
        this.name = name;
        this.getCharacteristic = function() {
          return { on: function() { return this; } };
        };
      },
      AccessoryInformation: function() {
        this.setCharacteristic = function() { return this; };
      }
    };

    global.Characteristic = {
      On: 'On',
      Manufacturer: 'Manufacturer',
      Model: 'Model',
      SerialNumber: 'SerialNumber'
    };

    // Setup mock log
    mockLog = function() {};
    mockLog.warn = function() {};

    // Get fresh accessory constructor
    const registerCalls = [];
    const mockHomebridge = {
      hap: {
        Service: global.Service,
        Characteristic: global.Characteristic
      },
      registerAccessory: function(platform, name, constructor) {
        registerCalls.push({ platform, name, constructor });
      }
    };

    delete require.cache[require.resolve('../index.js')];
    const plugin = require('../index.js');
    plugin(mockHomebridge);

    HttpAccessory = registerCalls[0].constructor;

    const config = {
      ip: '192.168.1.100',
      name: 'Test Radio'
    };

    accessory = new HttpAccessory(mockLog, config);
  });

  test('should handle setPowerState callback', (t, done) => {
    let callbackExecuted = false;

    accessory.setPowerState(true, function(error) {
      callbackExecuted = true;
      assert.strictEqual(error, undefined);
      done();
    });

    // Verify callback was called
    setTimeout(() => {
      if (!callbackExecuted) {
        done(new Error('Callback was not executed'));
      }
    }, 100);
  });

  test('should handle setPowerState for off state', (t, done) => {
    accessory.setPowerState(false, function(error) {
      assert.strictEqual(error, undefined);
      done();
    });
  });

  test('should return error when IP is not configured for setPowerState', (t, done) => {
    // Remove IP configuration to trigger error
    accessory.on_url = null;
    accessory.off_url = null;

    const logWarnings = [];
    accessory.log.warn = function(message) {
      logWarnings.push(message);
    };

    accessory.setPowerState(true, function(error) {
      assert(error instanceof Error);
      assert.strictEqual(error.message, 'No power IP defined.');
      assert.strictEqual(logWarnings.length, 1);
      assert.strictEqual(logWarnings[0], 'No IP adress defined');
      done();
    });
  });

  test('should return error when status URL is not configured for getPowerState', (t, done) => {
    // Remove status URL configuration to trigger error
    accessory.status_url = null;

    const logWarnings = [];
    accessory.log.warn = function(message) {
      logWarnings.push(message);
    };

    accessory.getPowerState(function(error, state) {
      assert(error instanceof Error);
      assert.strictEqual(error.message, 'No status url defined.');
      assert.strictEqual(logWarnings.length, 1);
      assert.strictEqual(logWarnings[0], 'Ignoring request; No status url defined.');
      done();
    });
  });

  test('should not set power state when enableSet is false', (t, done) => {
    accessory.enableSet = false;

    accessory.setPowerState(true, function(error) {
      // Should not call callback when enableSet is false
      done(new Error('Callback should not be called when enableSet is false'));
    });

    // Give it time to potentially call the callback
    setTimeout(() => {
      done(); // Test passes if callback wasn't called
    }, 50);
  });
});

describe('Service Creation', () => {
  test('should create Switch service by default', () => {
    global.Service = {
      Switch: function(name) {
        this.name = name;
        this.getCharacteristic = function() {
          return { on: function() { return this; } };
        };
      },
      AccessoryInformation: function() {
        this.setCharacteristic = function() {
          return this;
        };
      }
    };

    global.Characteristic = {
      On: 'On',
      Manufacturer: 'Manufacturer',
      Model: 'Model',
      SerialNumber: 'SerialNumber'
    };

    const registerCalls = [];
    const mockHomebridge = {
      hap: {
        Service: global.Service,
        Characteristic: global.Characteristic
      },
      registerAccessory: function(platform, name, constructor) {
        registerCalls.push({ platform, name, constructor });
      }
    };

    const mockLog = function() {};
    mockLog.warn = function() {};

    delete require.cache[require.resolve('../index.js')];
    const plugin = require('../index.js');
    plugin(mockHomebridge);

    const HttpAccessory = registerCalls[0].constructor;

    const config = {
      ip: '192.168.1.100',
      name: 'Test Radio'
      // No service specified - should default to 'Switch'
    };

    const accessory = new HttpAccessory(mockLog, config);
    const services = accessory.getServices();

    assert.strictEqual(Array.isArray(services), true);
    assert.strictEqual(services.length, 1);
    assert.strictEqual(services[0].name, 'Test Radio');
  });

  test('should create Light service when configured', () => {
    global.Service = {
      Lightbulb: function(name) {
        this.name = name;
        this.getCharacteristic = function() {
          return { on: function() { return this; } };
        };
        this.addCharacteristic = function() {
          return { on: function() { return this; } };
        };
      },
      AccessoryInformation: function() {
        this.setCharacteristic = function() { return this; };
      }
    };

    global.Characteristic = {
      On: 'On',
      Brightness: 'Brightness',
      Manufacturer: 'Manufacturer',
      Model: 'Model',
      SerialNumber: 'SerialNumber'
    };

    const registerCalls = [];
    const mockHomebridge = {
      hap: {
        Service: global.Service,
        Characteristic: global.Characteristic
      },
      registerAccessory: function(platform, name, constructor) {
        registerCalls.push({ platform, name, constructor });
      }
    };

    const mockLog = function() {};
    mockLog.warn = function() {};

    delete require.cache[require.resolve('../index.js')];
    const plugin = require('../index.js');
    plugin(mockHomebridge);

    const HttpAccessory = registerCalls[0].constructor;

    const config = {
      ip: '192.168.1.100',
      name: 'Test Light',
      service: 'Light'
    };

    const accessory = new HttpAccessory(mockLog, config);
    const services = accessory.getServices();

    assert.strictEqual(Array.isArray(services), true);
    assert.strictEqual(services.length, 2); // Information + Light service
  });
});
