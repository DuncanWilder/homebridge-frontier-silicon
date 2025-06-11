const { test, describe, mock } = require("node:test");
const assert = require("node:assert");

// Mock the wifiradio module
const mockWifiRadio = {
  getPower: mock.fn(),
  setPower: mock.fn(),
};

// Mock modules using the experimental feature
mock.module("wifiradio", {
  defaultExport: function MockWifiRadio() {
    return mockWifiRadio;
  },
});
mock.module("polling-to-event", {
  defaultExport: mock.fn(),
});

describe("Homebridge Frontier Silicon Plugin", () => {
  describe("Module Export", () => {
    test("should export a function", () => {
      const plugin = require("../index.js");
      assert.strictEqual(typeof plugin, "function");
    });
  });

  describe("Plugin Registration", () => {
    test("should register the correct accessory", () => {
      const registerCalls = [];
      const mockHomebridge = {
        hap: {
          Service: {
            Switch() {},
            AccessoryInformation() {
              this.setCharacteristic = function () {
                return this;
              };
            },
          },
          Characteristic: {
            On: "On",
            Manufacturer: "Manufacturer",
            Model: "Model",
            SerialNumber: "SerialNumber",
          },
        },
        registerAccessory(platform, name, constructor) {
          registerCalls.push({ platform, name, constructor });
        },
      };

      const plugin = require("../index.js");
      plugin(mockHomebridge);

      assert.strictEqual(registerCalls.length, 1);
      const call = registerCalls[0];
      assert.strictEqual(call.platform, "homebridge-frontier-silicone");
      assert.strictEqual(call.name, "frontier-silicon");
      assert.strictEqual(typeof call.constructor, "function");
    });
  });

  describe("HttpAccessory", () => {
    let HttpAccessory;
    let mockLog;

    test("should have required prototype methods", () => {
      const registerCalls = [];
      const mockHomebridge = {
        hap: {
          Service: {
            Switch() {},
            AccessoryInformation() {
              this.setCharacteristic = function () {
                return this;
              };
            },
          },
          Characteristic: {
            On: "On",
            Manufacturer: "Manufacturer",
            Model: "Model",
            SerialNumber: "SerialNumber",
          },
        },
        registerAccessory(platform, name, constructor) {
          registerCalls.push({ platform, name, constructor });
        },
      };

      const plugin = require("../index.js");
      plugin(mockHomebridge);

      HttpAccessory = registerCalls[0].constructor;

      assert.strictEqual(
        typeof HttpAccessory.prototype.setPowerState,
        "function",
      );
      assert.strictEqual(
        typeof HttpAccessory.prototype.getPowerState,
        "function",
      );
      assert.strictEqual(typeof HttpAccessory.prototype.identify, "function");
      assert.strictEqual(
        typeof HttpAccessory.prototype.getServices,
        "function",
      );
    });

    test("should create accessory with valid config", () => {
      const registerCalls = [];
      const mockHomebridge = {
        hap: {
          Service: {
            Switch() {},
            AccessoryInformation() {
              this.setCharacteristic = function () {
                return this;
              };
            },
          },
          Characteristic: {
            On: "On",
            Manufacturer: "Manufacturer",
            Model: "Model",
            SerialNumber: "SerialNumber",
          },
        },
        registerAccessory(platform, name, constructor) {
          registerCalls.push({ platform, name, constructor });
        },
      };

      mockLog = function () {};
      mockLog.warn = function () {};

      const plugin = require("../index.js");
      plugin(mockHomebridge);

      HttpAccessory = registerCalls[0].constructor;

      const config = {
        ip: "192.168.1.100",
        name: "Test Radio",
      };

      const accessory = new HttpAccessory(mockLog, config);

      assert.strictEqual(accessory.ip, "192.168.1.100");
      assert.strictEqual(accessory.name, "Test Radio");
      assert.strictEqual(accessory.service, "Switch");
      assert.strictEqual(accessory.switchHandling, "yes");
    });

    test("should create accessory with custom service", () => {
      const registerCalls = [];
      const mockHomebridge = {
        hap: {
          Service: {
            Switch() {},
            Lightbulb() {},
            AccessoryInformation() {
              this.setCharacteristic = function () {
                return this;
              };
            },
          },
          Characteristic: {
            On: "On",
            Brightness: "Brightness",
            Manufacturer: "Manufacturer",
            Model: "Model",
            SerialNumber: "SerialNumber",
          },
        },
        registerAccessory(platform, name, constructor) {
          registerCalls.push({ platform, name, constructor });
        },
      };

      mockLog = function () {};
      mockLog.warn = function () {};

      const plugin = require("../index.js");
      plugin(mockHomebridge);

      HttpAccessory = registerCalls[0].constructor;

      const config = {
        ip: "192.168.1.100",
        name: "Test Light",
        service: "Light",
        brightnessHandling: "yes",
      };

      const accessory = new HttpAccessory(mockLog, config);

      assert.strictEqual(accessory.service, "Light");
      assert.strictEqual(accessory.brightnessHandling, "yes");
    });
  });
});
