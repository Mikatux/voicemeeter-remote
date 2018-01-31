const ref = require('ref');
const ffi = require('ffi');

const ArrayType = require('ref-array');
const CharArray = ArrayType('char');
const LongArray = ArrayType('long');

const {
  VoicemeeterDefaultConfig,
  VoicemeeterType,
  InterfaceType
} = require('./voicemeeterUtils');

const isEmpty = function (object) {
  for (let key in object) {
    if (object.hasOwnProperty(key))
      return false;
  }
  return true;
}

const libvoicemeeter = ffi.Library(__dirname + '/VoicemeeterRemote64.dll', {
  'VBVMR_Login': ['long', []],
  'VBVMR_Logout': ['long', []],
  'VBVMR_Output_GetDeviceNumber': ['long', []],
  'VBVMR_Output_GetDeviceDescA': ['long', ['long', LongArray, CharArray, CharArray]],
  'VBVMR_Input_GetDeviceNumber': ['long', []],
  'VBVMR_Input_GetDeviceDescA': ['long', ['long', LongArray, CharArray, CharArray]],
  'VBVMR_SetParameters': ['long', [CharArray]],
  'VBVMR_RunVoicemeeter': ['long', ['long']],
  'VBVMR_GetVoicemeeterType': ['long', [LongArray]]
});


const voicemeeter = {
  isConnected: false,
  outputDevices: [],
  inputDevices: [],
  voicemeeterType: 0,
  voicemeeterConfig: {},

  runvoicemeeter(voicemeeterType) {
    if (libvoicemeeter.VBVMR_RunVoicemeeter(voicemeeterType) == 0) {
      return;
    }
    throw "running failed";
  },
  _getVoicemeeterType() {
    var typePtr = new LongArray(1); // creates an integer array of size 10
    if (libvoicemeeter.VBVMR_GetVoicemeeterType(typePtr) !== 0) {
      throw "running failed";
    }
    switch (typePtr[0]) {
      case 1: // Voicemeeter software
        return VoicemeeterType.voicemeeter;
        break;
      case 2: // Voicemeeter Banana software
        return VoicemeeterType.voicemeeterBanana
        break;
      default: // unknow software
        return VoicemeeterType.unknow
    }

  },
  login() {
    if (this.isConnected) {
      return;
    }
    if (libvoicemeeter.VBVMR_Login() == 0) {
      this.isConnected = true;
      this.voicemeeterType = this._getVoicemeeterType();
      this.voicemeeterConfig = VoicemeeterDefaultConfig[this._getVoicemeeterType()];
      return;
    }
    this.isConnected = false;
    throw "Connection failed";
  },
  logout() {
    if (!this.isConnected) {
      throw "Not connected ";
    }
    if (libvoicemeeter.VBVMR_Logout() == 0) {
      this.isConnected = false;
      return;
    }
    throw "Logout failed";
  },
  updateDeviceList() {
    if (!this.isConnected) {
      throw "Not connected ";
    }
    this.outputDevices = [];
    this.inputDevices = [];
    const outputDeviceNumber = libvoicemeeter.VBVMR_Output_GetDeviceNumber();
    for (let i = 0; i < outputDeviceNumber; i++) {

      var hardwareIdPtr = new CharArray(256); // creates an integer array of size 10
      var namePtr = new CharArray(256); // creates an integer array of size 10
      var typePtr = new LongArray(1); // creates an integer array of size 10

      libvoicemeeter.VBVMR_Output_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
      this.outputDevices.push({
        name: String.fromCharCode(...namePtr.toArray()).replace(/\u0000+$/g, ''),
        hardwareId: String.fromCharCode(...hardwareIdPtr.toArray()).replace(/\u0000+$/g, ''),
        type: typePtr.toArray()
      })
    }

    const inputDeviceNumber = libvoicemeeter.VBVMR_Input_GetDeviceNumber();
    for (let i = 0; i < inputDeviceNumber; i++) {

      var hardwareIdPtr = new CharArray(256); // creates an integer array of size 10
      var namePtr = new CharArray(256); // creates an integer array of size 10
      var typePtr = new LongArray(32); // creates an integer array of size 10

      libvoicemeeter.VBVMR_Input_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
      this.inputDevices.push({
        name: String.fromCharCode(...namePtr.toArray()).replace(/\u0000+$/g, ''),
        hardwareId: String.fromCharCode(...hardwareIdPtr.toArray()).replace(/\u0000+$/g, ''),
        type: typePtr.toArray()
      })
    }
  },

  _sendRawParaneterScript(scriptString) {
    const script = new Buffer(scriptString.length + 1);
    script.fill(0);
    script.write(scriptString);
    return libvoicemeeter.VBVMR_SetParameters(script);
  },
  _setParameter(type, name, id, value) {

    if (!this.isConnected) {
      throw "Not connected ";
    }
    if (!this.voicemeeterConfig || isEmpty(this.voicemeeterConfig)) {
      throw "Configuration error  ";
    }
    const interfaceType = type === InterfaceType.strip ? 'Strip' : 'Bus';
    const voicemeeterConfigObject = type === InterfaceType.strip ? 'strips' : 'buses';

    if (this.voicemeeterConfig[voicemeeterConfigObject].findIndex(strip => strip.id === id) === -1) {
      throw `${interfaceType} ${id} not found`;
    }

    return this._sendRawParaneterScript(`${interfaceType}[${id}].${name}=${value};`);
  },
  _setParameters(parameters) {

    if (!this.isConnected) {
      throw "Not connected ";
    }
    if (!this.voicemeeterConfig || isEmpty(this.voicemeeterConfig)) {
      throw "Configuration error  ";
    }

    if (!Array.isArray(parameters)) {
      throw interfaceType + " not found";
    }

    const script = parameters.map(p => {
      const interfaceType = p.type === InterfaceType.strip ? 'Strip' : 'Bus';
      const voicemeeterConfigObject = p.type === InterfaceType.strip ? 'strips' : 'buses';

      if (!this.voicemeeterConfig[voicemeeterConfigObject].find(strip => strip.id === p.id)) {
        throw interfaceType + " not found";
      }
      return `${interfaceType}[${p.id}].${p.name}=${p.value};`;
    }).join('\n')

    return this._sendRawParaneterScript(script);

  },

}
const parameterStripNames = ['mono', 'solo', 'mute', 'gain', 'gate', 'comp'];
const parameterBusNames = ['mono', 'mute' ];

parameterBusNames.forEach(name => {
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

  voicemeeter[`setBus${capitalizedName}`] = function (busNumber, value) {
    if (typeof (value) === 'boolean') {
      voicemeeter._setParameter(InterfaceType.bus, name, busNumber, value ? '1' : '0')
    } else {
      voicemeeter._setParameter(InterfaceType.bus, name, busNumber, value)
    }
  }
});

parameterStripNames.forEach(name => {
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

  voicemeeter[`setStrip${capitalizedName}`] = function (stripNumber, value) {
    if (typeof (value) === 'boolean') {
      voicemeeter._setParameter(InterfaceType.strip, name, stripNumber, value ? '1' : '0')
    } else {
      voicemeeter._setParameter(InterfaceType.strip, name, stripNumber, value)
    }
  }

})
module.exports = voicemeeter;

// For test only
/*

voicemeeter.login();
voicemeeter.updateDeviceList();

voicemeeter.inputDevices.forEach(d => {
  console.log(d)
})

voicemeeter.logout();
// */