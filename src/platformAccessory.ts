import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import pollingToEvent from 'polling-to-event';
import WifiRadio from 'wifiradio';

import type { FrontierSiliconPlatform } from './platform.js';

// Constants
const DEFAULT_PIN = '1234';
const POLLING_INTERVAL = 300;
const DEFAULT_SERVICE = 'Switch';
const DEFAULT_BRIGHTNESS_HANDLING = 'no';
const DEFAULT_SWITCH_HANDLING = 'yes';

const POWER_STATES = {
  ON: '1',
  OFF: '0',
};

export interface FrontierSiliconDevice {
  name: string;
  ip: string;
  pin?: string;
  service?: string;
  brightnessHandling?: string;
  switchHandling?: string;
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class FrontierSiliconAccessory {
  private service!: Service;
  private radio: WifiRadio;

  // Device configuration
  private readonly ip: string;
  private readonly pin: string;
  private readonly deviceName: string;
  private readonly serviceType: string;
  private readonly brightnessHandling: string;
  private readonly switchHandling: string;

  // State management
  private state = false;
  private currentLevel = 0;
  private enableSet = true;

  constructor(
    private readonly platform: FrontierSiliconPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    const device = accessory.context.device as FrontierSiliconDevice;

    // Validate configuration
    this.validateConfig(device);

    // Device configuration
    this.ip = device.ip;
    this.pin = device.pin || DEFAULT_PIN;
    this.deviceName = device.name;
    this.serviceType = device.service || DEFAULT_SERVICE;
    this.brightnessHandling = device.brightnessHandling || DEFAULT_BRIGHTNESS_HANDLING;
    this.switchHandling = device.switchHandling || DEFAULT_SWITCH_HANDLING;

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Duncan Wilder')
      .setCharacteristic(this.platform.Characteristic.Model, 'Frontier Silicon Device')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `FS-${this.ip.replace(/\./g, '')}`);

    // Initialize radio client
    this.radio = new WifiRadio(this.ip, this.pin);

    // Create the appropriate service
    this.createService();

    // Setup polling if required
    this.setupPolling();
  }

  private validateConfig(device: FrontierSiliconDevice) {
    if (!device.ip) {
      throw new Error('IP address is required in configuration');
    }
    if (!device.name) {
      throw new Error('Device name is required in configuration');
    }
  }

  private createService() {
    switch (this.serviceType) {
    case 'Switch':
      this.service = this.accessory.getService(this.platform.Service.Switch) ||
        this.accessory.addService(this.platform.Service.Switch);
      this.setupSwitchCharacteristics();
      break;

    case 'Light':
      this.service = this.accessory.getService(this.platform.Service.Lightbulb) ||
        this.accessory.addService(this.platform.Service.Lightbulb);
      this.setupLightCharacteristics();
      break;

    default:
      this.platform.log.warn(`Unknown service type: ${this.serviceType}, defaulting to Switch`);
      this.service = this.accessory.getService(this.platform.Service.Switch) ||
        this.accessory.addService(this.platform.Service.Switch);
      this.setupSwitchCharacteristics();
    }

    // Set the service name
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.deviceName);
  }

  private setupSwitchCharacteristics() {
    const onCharacteristic = this.service.getCharacteristic(this.platform.Characteristic.On);

    switch (this.switchHandling) {
    case 'yes':
      onCharacteristic
        .onGet(this.getPowerState.bind(this))
        .onSet(this.setPowerState.bind(this));
      break;

    case 'realtime':
      onCharacteristic
        .onGet(() => this.state)
        .onSet(this.setPowerState.bind(this));
      break;

    default:
      onCharacteristic.onSet(this.setPowerState.bind(this));
    }
  }

  private setupLightCharacteristics() {
    // Setup power characteristics same as switch
    this.setupSwitchCharacteristics();

    // Setup brightness if configured
    if (this.brightnessHandling !== 'no') {
      const brightnessCharacteristic = this.service.getCharacteristic(this.platform.Characteristic.Brightness);

      if (this.brightnessHandling === 'realtime') {
        brightnessCharacteristic
          .onGet(() => this.currentLevel)
          .onSet(this.setBrightness.bind(this));
      } else if (this.brightnessHandling === 'yes') {
        brightnessCharacteristic
          .onGet(this.getBrightness.bind(this))
          .onSet(this.setBrightness.bind(this));
      }
    }
  }

  private setupPolling() {
    if (this.switchHandling === 'realtime') {
      this.setupPowerPolling();
    }

    // Note: Brightness polling would be implemented here if the device supports it
    if (this.brightnessHandling === 'realtime') {
      this.platform.log.warn('Brightness polling not fully implemented yet');
    }
  }

  private setupPowerPolling() {
    const statusEmitter = pollingToEvent(
      (done: (error: Error | null, result?: number) => void) => {
        this.getPowerStateInternal()
          .then((state) => done(null, state))
          .catch((error) => done(error));
      },
      {
        longpolling: true,
        interval: POLLING_INTERVAL,
        longpollEventName: 'statuspoll',
      },
    );

    statusEmitter.on('statuspoll', (binaryState: number) => {
      this.state = binaryState > 0;
      this.platform.log.debug(`${this.serviceType} received power state: ${binaryState}`);

      this.enableSet = false;
      this.updateCharacteristic(binaryState);
      this.enableSet = true;
    });
  }

  private updateCharacteristic(binaryState: number) {
    const isOn = binaryState > 0;

    if (this.service) {
      this.service
        .getCharacteristic(this.platform.Characteristic.On)
        .updateValue(isOn);
    }
  }

  private async getPowerStateInternal(): Promise<number> {
    try {
      const response = await this.radio.getPower();
      return response === POWER_STATES.ON ? 1 : 0;
    } catch (error) {
      this.platform.log.warn(`Failed to get power state for ${this.deviceName}:`, (error as Error).message);
      throw error;
    }
  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  async getPowerState(): Promise<CharacteristicValue> {
    this.platform.log.debug(`Getting power state for ${this.deviceName}`);

    try {
      const binaryState = await this.getPowerStateInternal();
      this.platform.log.debug(`Power state for ${this.deviceName} is currently: ${binaryState}`);
      return binaryState > 0;
    } catch (error) {
      this.platform.log.error(`Failed to get power state for ${this.deviceName}:`, (error as Error).message);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  async setPowerState(value: CharacteristicValue): Promise<void> {
    const powerState = value as boolean;
    this.platform.log.debug(`Setting power state for ${this.deviceName} to: ${powerState ? 'ON' : 'OFF'}`);

    if (!this.enableSet) {
      return;
    }

    try {
      const targetState = powerState ? 1 : 0;
      await this.radio.setPower(targetState);
      this.platform.log.debug(`Power state for ${this.deviceName} set to ${powerState ? 'ON' : 'OFF'}`);
    } catch (error) {
      this.platform.log.error(`Failed to set power state for ${this.deviceName}:`, (error as Error).message);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   /**
   * Handle requests to get the current value of the "Brightness" characteristic
   */
  async getBrightness(): Promise<CharacteristicValue> {
    this.platform.log.debug(`Getting brightness for ${this.deviceName}`);

    // Note: This would need proper implementation based on device API
    this.platform.log.warn(`Brightness getting not implemented for ${this.deviceName}`);
    return 100;
  }

  /**
   * Handle requests to set the "Brightness" characteristic
   */
  async setBrightness(value: CharacteristicValue): Promise<void> {
    const level = value as number;
    this.platform.log.debug(`Setting brightness for ${this.deviceName} to: ${level}`);

    // Note: This would need proper implementation based on device API
    this.platform.log.warn(`Brightness setting not implemented for ${this.deviceName}`);
    this.currentLevel = level;
  }
}
