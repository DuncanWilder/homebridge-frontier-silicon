> ⚠️ Not yet published to NPM, I'll get there soon!

# homebridge-frontier-silicon-plugin-2025

> Based on the work originally by [Boike Damhuis](https://github.com/boikedamhuis/homebridge-frontier-silicon), this is a fork of the original plugin, modernised and updated for the latest versions of Homebridge.
>
> Rather than trying to rewrite and maintain this manually, I've made extensive use of AI to build this. Less focussed on the code quality, more focused on getting it working (and keeping it working) with the latest versions of Homebridge.

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
