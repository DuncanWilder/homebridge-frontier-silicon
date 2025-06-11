# Homebridge Frontier Silicon Plugin 2025

> Based on the work originally by [Boike Damhuis](https://github.com/boikedamhuis/homebridge-frontier-silicon), this is a fork of the original plugin, modernised and updated for the latest versions of Homebridge.
>
> Rather than trying to rewrite and maintain this manually, I've made extensive use of AI to build this. Less focussed on the code quality, more focused on getting it working (and keeping it working) with the latest versions of Homebridge.

This plugin provides HomeKit integration for Frontier Silicon devices through Homebridge.

## Installation

1. Install the plugin through Homebridge UI or manually:
```bash
npm install -g homebridge-frontier-silicon-plugin-2025
```

2. Add the platform to your Homebridge config.json

## Configuration

Add the following to your Homebridge config.json:

```json
{
  "platforms": [
    {
      "name": "Frontier Silicon Platform",
      "platform": "FrontierSiliconPlatform",
      "devices": [
        {
          "name": "Living Room Radio",
          "ip": "192.168.1.100",
          "pin": "1234",
          "service": "Switch",
          "switchHandling": "yes",
          "brightnessHandling": "no"
        },
        {
          "name": "Kitchen Radio",
          "ip": "192.168.1.101",
          "pin": "1234",
          "service": "Light",
          "switchHandling": "realtime",
          "brightnessHandling": "yes"
        }
      ]
    }
  ]
}
```

## Configuration Options

### Platform Settings
- `name`: Display name for the platform
- `platform`: Must be "FrontierSiliconPlatform"
- `devices`: Array of device configurations

### Device Settings
- `name` (required): Display name for the device in HomeKit
- `ip` (required): IP address of the Frontier Silicon device
- `pin` (optional): PIN for the device (default: "1234")
- `service` (optional): HomeKit service type - "Switch" or "Light" (default: "Switch")
- `switchHandling` (optional): How to handle power state monitoring:
  - `"yes"`: Poll when requested by HomeKit
  - `"realtime"`: Continuous polling for real-time updates
  - `"no"`: Set only, no status monitoring
- `brightnessHandling` (optional): How to handle brightness (only for Light service):
  - `"no"`: No brightness control (default)
  - `"yes"`: Poll when requested by HomeKit
  - `"realtime"`: Continuous polling for real-time updates

## Service Types

### Switch Service
Exposes the device as a simple on/off switch in HomeKit.

### Light Service
Exposes the device as a lightbulb in HomeKit with optional brightness control.

## Polling Options

- **"yes"**: HomeKit will request status when needed. Good for devices that respond quickly.
- **"realtime"**: Continuously polls the device every 5 seconds for status updates. Use this if you want immediate updates when the device state changes externally.
- **"no"**: Only allows setting the state, no status monitoring. Most efficient but no feedback.

## Finding Your Device

1. Make sure your Frontier Silicon device is connected to your network
2. Check your router's admin panel for the device IP address
3. The default PIN is usually "1234" but check your device documentation

## Supported Devices

This plugin should work with any Frontier Silicon-based device that supports the FSAPI interface, including:
- Internet radios
- Smart speakers
- Audio systems with Frontier Silicon chipsets

## Troubleshooting

### Device Not Responding
- Verify the IP address is correct and the device is on the network
- Check that the PIN is correct (try "1234" if unsure)
- Ensure the device supports the FSAPI interface

### Slow Response
- Try changing `switchHandling` from "realtime" to "yes" if polling is too frequent
- Check your network connection between Homebridge and the device

### Brightness Not Working
- Brightness control may not be supported by all devices
- Set `brightnessHandling` to "no" if experiencing issues

## Development

This plugin is based on the modern Homebridge TypeScript template and uses:
- `wifiradio` package for device communication
- `polling-to-event` package for real-time status monitoring

## License

ISC
