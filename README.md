# homebridge-frontier-silicon-plugin

A Frontier Silicon plugin for homebridge (https://github.com/nfarina/homebridge) which integrates Frontier Silicon enabled devices with Homekit.

Plugin updates the status once you open the app, working on real time status updates. Stay tuned :)

# Installation

1. Install this plugin: `sudo npm i homebridge-frontier-silicon-plugin`
2. Update your `config.json` configuration file

```json
"accessories": [
	{
		"accessory": "frontier-silicon",
		"name": "Radio",
		"ip": "192.168.1.10"
   }
]
```

Code is based on this repo: https://github.com/rudders/homebridge-http

### Todos

- Volume Change
- Status Updates
- Channel Change
- Clean up the code

## License

MIT
