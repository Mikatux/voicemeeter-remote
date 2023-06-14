# Voicemeeter-remote

Voicemeeter-remote is a Node.js wrapper for the official voicemeeterRemote DLL available in the installation directory of [Voicemeeter][voicemeeter] ( or [Voicemeeter banana][voicemeeter-banana] or [Voicemeeter potato][voicemeeter-potato] ). More informations about the DLL is available [here](https://forum.vb-audio.com/viewtopic.php?f=8&t=346)

# How to use it ?
### First install it

```sh
$ npm i voicemeeter-remote --save
```
### Then use it in your own program

```js
const voicemeeter = require('voicemeeter-remote');

voicemeeter.init().then(()=>{
    voicemeeter.login();
})
```

After the login method is successful you can use all the methods to interact with the instance of Voicemeeter

### You can :
   - Connect and disconnect with the Voicemeeter software
```js
// Connect
voicemeeter.login();
// Disconnect
voicemeeter.logout();
```

  - Set all the parameters like : 'mono', 'solo', 'mute', 'gain', 'gate', 'comp' for each Strip and Bus
```js
// Set the gain of the first Strip to -10db
voicemeeter.setStripGain(0,-10);
// Mute the second Bus
voicemeeter.setBusMute(1,true);
```
   - Get all input/output devices
```js
// Get all devices from the DLL
// They will be stored into an array in the voicemeeter-remote instance
voicemeeter.updateDeviceList();
// Get input devices
console.log(voicemeeter.inputDevices)
// Get output devices
console.log(voicemeeter.outputDevices)
```

# Todos
- Parameters Getters
- Stream Getters
- 32bit compatibility
- Implement all methods available in the DLL

# Development

Want to contribute? Great!

Fork the project make your change then do a pull request.

#### Dependencies

[`ffi-napi`][ffi-napi] => Read and execute the VoicemeeterRemote DLL

[`ref-array-napi`][ref-array-napi] => Create array (*pointer) for `ffi-napi` to return string from the DLL

[`winreg`][winreg] => Read the windows registery to find Voicemeeter installation folder and the DLL

# Usage
[`voicemeeter-api`][voicemeeter-api] => A RESTfull API to control voicemeeter with HTTP request

###### Make yours and send me the link

----
# License

MIT

   [voicemeeter]: <https://www.vb-audio.com/Voicemeeter/index.htm>
   [voicemeeter-banana]: <https://www.vb-audio.com/Voicemeeter/banana.htm>
   [voicemeeter-potato]: <https://www.vb-audio.com/Voicemeeter/potato.htm>
   [voicemeeter-api]: <https://github.com/Mikatux/voicemeeter-api>
   [ffi-napi]: <https://www.npmjs.com/package/ffi-napi>
   [ref-array-napi]: <https://www.npmjs.com/package/ref-array-napi>
   [winreg]: <https://www.npmjs.com/package/winreg>