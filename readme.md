
# Voicemeeter-remote

Voicemeeter-remote is a Node.js wrapper for the official voicemeeterRemote DLL available in the installation directory of [Voicemeeter][voicemeeter] ( or [Voicemeeter banana][voicemeeter-banana] ). More informations about the DLL is available [here](https://forum.vb-audio.com/viewtopic.php?f=8&t=346)

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

After the login methods is successful you can use all the methods to interact with the instance of Voicemeeter

### You can :
   - Connect and disconnect with the Voicemeeter software
```js
// Connect
voicemeeter.login();
// Diconnect
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
// They will store into an array in the voicemeeter-remote instance
voicemeeter.updateDeviceList();
// Get input devices
console.log(voicemeeter.inputDevices)
// Get output devices
console.log(voicemeeter.outputDevices)
```

# Todos
- Parametters Getters
- Stream Getters
- Implement all methods available in the DLL

# Development

Want to contribute? Great!

Fork the project make your change then do a pull request.

#### Dependencies

[`ffi`][ffi] => Read and execute the VoicemeeterRemote DLL

[`ref-array`][ref-array] => Create array (*pointer) for `ffi` to return string from the DLL

[`winreg`][winreg] => Read the windows registery to find Voicemeeter installation folder and the DLL

# Usage
[`voicemeeter-api`][voicemeeter-api] => A RESTfull API to control voicemeeter with HTTP request

###### Make yours and send me the link

----
# License

MIT

   [voicemeeter]: <https://www.vb-audio.com/Voicemeeter/index.htm>
   [voicemeeter-banana]: <https://www.vb-audio.com/Voicemeeter/banana.htm>
   [voicemeeter-api]: <https://github.com/Mikatux/voicemeeter-api>
   [ffi]: <https://www.npmjs.com/package/ffi>
   [ref-array]: <https://www.npmjs.com/package/ref-array>
   [winreg]: <https://www.npmjs.com/package/winreg>