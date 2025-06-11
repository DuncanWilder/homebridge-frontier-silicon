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

// Simple integration test without complex mocking
describe('Basic Plugin Functionality', () => {
  test('should export a function', () => {
    const plugin = require('../index.js');
    assert.strictEqual(typeof plugin, 'function');
  });

  test('should register accessory when called with homebridge object', () => {
    const registerCalls = [];
    const mockHomebridge = {
      hap: {
        Service: {
          Switch: function() {},
          AccessoryInformation: function() {
            this.setCharacteristic = function() { return this; };
          }
        },
        Characteristic: {
          On: 'On',
          Manufacturer: 'Manufacturer',
          Model: 'Model',
          SerialNumber: 'SerialNumber'
        }
      },
      registerAccessory: function(platform, name, constructor) {
        registerCalls.push({ platform, name, constructor });
      }
    };

    const plugin = require('../index.js');
    plugin(mockHomebridge);

    assert.strictEqual(registerCalls.length, 1);
    assert.strictEqual(registerCalls[0].platform, 'homebridge-frontier-silicone');
    assert.strictEqual(registerCalls[0].name, 'frontier-silicon');
    assert.strictEqual(typeof registerCalls[0].constructor, 'function');
  });
});

describe('Configuration Parsing', () => {
  let HttpAccessory;
  let mockLog;

  beforeEach(() => {
    // Reset mocks
    mockWifiRadio.getPower.mock.resetCalls();
    mockWifiRadio.setPower.mock.resetCalls();

    const registerCalls = [];
    const mockHomebridge = {
      hap: {
        Service: {
          Switch: function() {},
          AccessoryInformation: function() {
            this.setCharacteristic = function() { return this; };
          }
        },
        Characteristic: {
          On: 'On',
          Manufacturer: 'Manufacturer',
          Model: 'Model',
          SerialNumber: 'SerialNumber'
        }
      },
      registerAccessory: function(platform, name, constructor) {
        registerCalls.push({ platform, name, constructor });
      }
    };

    mockLog = function() {};
    mockLog.warn = function() {};

    delete require.cache[require.resolve('../index.js')];
    const plugin = require('../index.js');
    plugin(mockHomebridge);

    HttpAccessory = registerCalls[0].constructor;
  });

  test('should handle basic accessory creation', () => {
    const config = {
      ip: '192.168.1.100',
      name: 'Test Radio'
    };

    const accessory = new HttpAccessory(mockLog, config);

    assert.strictEqual(accessory.ip, '192.168.1.100');
    assert.strictEqual(accessory.name, 'Test Radio');
    assert.strictEqual(accessory.service, 'Switch');
    assert.strictEqual(accessory.switchHandling, 'yes');
  });

  test('should use default values for missing config', () => {
    const config = {
      ip: '192.168.1.100',
      name: 'Test Radio'
      // Missing optional config values
    };

    const accessory = new HttpAccessory(mockLog, config);

    assert.strictEqual(accessory.service, 'Switch');
    assert.strictEqual(accessory.brightnessHandling, 'no');
    assert.strictEqual(accessory.switchHandling, 'yes');
    assert.strictEqual(accessory.http_method, 'GET');
  });
});
