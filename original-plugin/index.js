const pollingToEvent = require("polling-to-event");
const WifiRadio = require("wifiradio");

// Constants
const DEFAULT_PIN = "1234";
const POLLING_INTERVAL = 300;
const DEFAULT_SERVICE = "Switch";
const DEFAULT_BRIGHTNESS_HANDLING = "no";
const DEFAULT_SWITCH_HANDLING = "yes";

const POWER_STATES = {
  ON: "1",
  OFF: "0",
};

let Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  // Fix the naming inconsistency - but keep old name for compatibility
  homebridge.registerAccessory(
    "homebridge-frontier-silicone",
    "frontier-silicon",
    FrontierSiliconAccessory,
  );
};

class FrontierSiliconAccessory {
  constructor(log, config) {
    this.log = log;
    this.config = config;

    // Validate required configuration
    this.validateConfig();

    // Device configuration
    this.ip = config.ip;
    this.pin = config.pin || DEFAULT_PIN;
    this.name = config.name;

    // Legacy properties for backward compatibility
    this.on_url = this.ip;
    this.off_url = this.ip;
    this.http_method = config.http_method || "GET";
    this.http_brightness_method =
      config.http_brightness_method || this.http_method;

    // Service configuration
    this.service = config.service || DEFAULT_SERVICE;
    this.brightnessHandling =
      config.brightnessHandling || DEFAULT_BRIGHTNESS_HANDLING;
    this.switchHandling = config.switchHandling || DEFAULT_SWITCH_HANDLING;

    // URLs and endpoints
    this.statusUrl = `/fsapi/GET/netRemote.sys.power?pin=${this.pin}`;
    this.status_url = this.statusUrl; // Legacy property for backward compatibility
    this.brightnessUrl = config.brightness_url;
    this.brightnessLevelUrl = config.brightnesslvl_url;

    // State management
    this.state = false;
    this.currentLevel = 0;
    this.enableSet = true;

    // Initialize radio client
    this.radio = new WifiRadio(this.ip, this.pin);

    // Setup polling if required
    this.setupPolling();
  }

  validateConfig() {
    if (!this.config.ip) {
      throw new Error("IP address is required in configuration");
    }
    if (!this.config.name) {
      throw new Error("Device name is required in configuration");
    }
  }

  setupPolling() {
    if (this.switchHandling === "realtime") {
      this.setupPowerPolling();
    }

    if (this.brightnessLevelUrl && this.brightnessHandling === "realtime") {
      this.setupBrightnessPolling();
    }
  }

  setupPowerPolling() {
    const statusEmitter = pollingToEvent(
      (done) => {
        this.getPowerStateInternal()
          .then((state) => done(null, state))
          .catch((error) => done(error));
      },
      {
        longpolling: true,
        interval: POLLING_INTERVAL,
        longpollEventName: "statuspoll",
      },
    );

    statusEmitter.on("statuspoll", (binaryState) => {
      this.state = binaryState > 0;
      this.log(`${this.service} received power state: ${binaryState}`);

      this.enableSet = false;
      this.updateCharacteristic(binaryState);
      this.enableSet = true;
    });
  }

  setupBrightnessPolling() {
    // Note: This would need proper implementation based on device API
    this.log.warn(
      "Brightness polling not fully implemented in modernized version",
    );
  }

  updateCharacteristic(binaryState) {
    const isOn = binaryState > 0;

    switch (this.service) {
      case "Switch":
        if (this.switchService) {
          this.switchService
            .getCharacteristic(Characteristic.On)
            .setValue(isOn);
        }
        break;
      case "Light":
        if (this.lightbulbService) {
          this.lightbulbService
            .getCharacteristic(Characteristic.On)
            .setValue(isOn);
        }
        break;
    }
  }

  async getPowerStateInternal() {
    try {
      const response = await this.radio.getPower();
      return response === POWER_STATES.ON ? 1 : 0;
    } catch (error) {
      this.log.warn("Failed to get power state:", error.message);
      throw error;
    }
  }
  async setPowerState(powerState, callback) {
    this.log(`Setting power state to: ${powerState ? "ON" : "OFF"}`);

    if (!this.enableSet) {
      return;
    }

    try {
      if (!this.on_url || !this.off_url) {
        this.log.warn("No IP adress defined");
        throw new Error("No power IP defined.");
      }

      const targetState = powerState ? 1 : 0;
      await this.radio.setPower(targetState);

      this.log(`Power state set to ${powerState ? "ON" : "OFF"}`);
      callback();
    } catch (error) {
      callback(error);
    }
  }

  async getPowerState(callback) {
    if (!this.status_url) {
      const error = new Error("No status url defined.");
      this.log.warn("Ignoring request; No status url defined.");
      callback(error);
      return;
    }

    this.log("Getting power state");

    try {
      const binaryState = await this.getPowerStateInternal();
      this.log(`Power state is currently: ${binaryState}`);
      callback(null, binaryState);
    } catch (error) {
      this.log.warn("Failed to get power state:", error.message);
      callback(error);
    }
  }

  identify(callback) {
    this.log("Identify requested!");
    callback();
  }
  getServices() {
    const services = [];

    // Information service
    const informationService = new Service.AccessoryInformation();
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Duncan Wilder")
      .setCharacteristic(Characteristic.Model, "Frontier Silicon Device")
      .setCharacteristic(
        Characteristic.SerialNumber,
        `FS-${this.ip.replace(/\./g, "")}`,
      );

    // Main service based on configuration
    switch (this.service) {
      case "Switch":
        this.switchService = new Service.Switch(this.name);
        this.setupSwitchCharacteristics(this.switchService);
        return [this.switchService];

      case "Light":
        this.lightbulbService = new Service.Lightbulb(this.name);
        this.setupLightCharacteristics(this.lightbulbService);
        services.push(informationService);
        services.push(this.lightbulbService);
        return services;

      default:
        this.log.warn(
          `Unknown service type: ${this.service}, defaulting to Switch`,
        );
        this.switchService = new Service.Switch(this.name);
        this.setupSwitchCharacteristics(this.switchService);
        return [this.switchService];
    }
  }

  setupSwitchCharacteristics(service) {
    const onCharacteristic = service.getCharacteristic(Characteristic.On);

    switch (this.switchHandling) {
      case "yes":
        onCharacteristic
          .on("get", this.getPowerState.bind(this))
          .on("set", this.setPowerState.bind(this));
        break;

      case "realtime":
        onCharacteristic
          .on("get", (callback) => callback(null, this.state))
          .on("set", this.setPowerState.bind(this));
        break;

      default:
        onCharacteristic.on("set", this.setPowerState.bind(this));
    }
  }

  setupLightCharacteristics(service) {
    // Setup power characteristics same as switch
    this.setupSwitchCharacteristics(service);

    // Setup brightness if configured
    if (this.brightnessHandling !== "no") {
      const brightnessCharacteristic = service.addCharacteristic(
        new Characteristic.Brightness(),
      );

      if (this.brightnessHandling === "realtime") {
        brightnessCharacteristic
          .on("get", (callback) => callback(null, this.currentLevel))
          .on(
            "set",
            this.setBrightness?.bind(this) ||
              ((level, callback) => {
                this.log.warn("Brightness setting not implemented");
                callback();
              }),
          );
      } else if (this.brightnessHandling === "yes") {
        brightnessCharacteristic
          .on(
            "get",
            this.getBrightness?.bind(this) ||
              ((callback) => {
                this.log.warn("Brightness getting not implemented");
                callback(null, 100);
              }),
          )
          .on(
            "set",
            this.setBrightness?.bind(this) ||
              ((level, callback) => {
                this.log.warn("Brightness setting not implemented");
                callback();
              }),
          );
      }
    }
  }
}
