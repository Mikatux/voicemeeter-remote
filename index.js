const ffi = require('ffi-napi');
const Registry = require('winreg');

const ArrayType = require('ref-array-napi');
const CharArray = ArrayType('char');
const LongArray = ArrayType('long');
const FloatArray = ArrayType('float');

async function getDLLPath() {
  const regKey = new Registry({
    hive: Registry.HKLM,
    key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VB:Voicemeeter {17359A74-1236-5467}'
  });
  return new Promise(resolve => {
    regKey.values((err, items) => {
      const unistallerPath = items.find(i => i.name === 'UninstallString').value;
      const fileNameIndex = unistallerPath.lastIndexOf('\\')
      resolve(unistallerPath.slice(0, fileNameIndex));
    });
  });
}


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

let libvoicemeeter;

const voicemeeter = {
  isConnected: false,
  isInitialised: false,
  outputDevices: [],
  inputDevices: [],
  type: 0,
  version: null,
  voicemeeterConfig: {},
  async init() {

    libvoicemeeter = ffi.Library(await getDLLPath() + '/VoicemeeterRemote64.dll', {
      'VBVMR_Login': ['long', []],
      'VBVMR_Logout': ['long', []],
      'VBVMR_RunVoicemeeter': ['long', ['long']],

      'VBVMR_GetVoicemeeterType': ['long', [LongArray]],
      'VBVMR_GetVoicemeeterVersion': ['long', [LongArray]],

      'VBVMR_IsParametersDirty': ['long', []],
      'VBVMR_GetParameterFloat': ['long', [CharArray, FloatArray]],
      'VBVMR_GetParameterStringA': ['long', [CharArray, CharArray]],

      'VBVMR_SetParameters': ['long', [CharArray]],
      'VBVMR_Output_GetDeviceNumber': ['long', []],
      'VBVMR_Output_GetDeviceDescA': ['long', ['long', LongArray, CharArray, CharArray]],
      'VBVMR_Input_GetDeviceNumber': ['long', []],
      'VBVMR_Input_GetDeviceDescA': ['long', ['long', LongArray, CharArray, CharArray]],
    });
    this.isInitialised = true;
  },

  runvoicemeeter(voicemeeterType) {
    if (libvoicemeeter.VBVMR_RunVoicemeeter(voicemeeterType) == 0) {
      return;
    }
    throw "running failed";
  },
  isParametersDirty() {
    return libvoicemeeter.VBVMR_IsParametersDirty();
  },
  getParameter(parameterName) {
    if (!this.isConnected) {
      throw "Not connected ";
    }
    var hardwareIdPtr = new Buffer(parameterName.length + 1);;
    hardwareIdPtr.write(parameterName)
    var namePtr = new FloatArray(1);
    libvoicemeeter.VBVMR_GetParameterFloat(hardwareIdPtr, namePtr);
    return namePtr[0]
  },
  _getVoicemeeterType() {
    var typePtr = new LongArray(1);
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
      case 3: // Voicemeeter Potato software
        return VoicemeeterType.voicemeeterPotato
        break;
      default: // unknow software
        return VoicemeeterType.unknow
    }

  },
  _getVoicemeeterVersion() {
    const versionPtr = new LongArray(1);
    if (libvoicemeeter.VBVMR_GetVoicemeeterVersion(versionPtr) !== 0) {
      throw "running failed";
    }
    const v4 = versionPtr[0] % (2 ^ 8)
    const v3 = parseInt((versionPtr[0] - v4) % Math.pow(2, 16) / Math.pow(2, 8))
    const v2 = parseInt(((versionPtr[0] - v3 * 256 - v4) % Math.pow(2, 24)) / Math.pow(2, 16))
    const v1 = parseInt((versionPtr[0] - v2 * 512 - v3 * 256 - v4) / Math.pow(2, 24))
    const version = `${v1}.${v2}.${v3}.${v4}`
    return version;
  },
  login() {
    if (!this.isInitialised) {
      throw "await the initialisation before login";
    }
    if (this.isConnected) {
      return;
    }
    if (libvoicemeeter.VBVMR_Login() == 0) {
      this.isConnected = true;
      this.type = this._getVoicemeeterType();
      this.version = this._getVoicemeeterVersion();
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

      var hardwareIdPtr = new CharArray(256);
      var namePtr = new CharArray(256);
      var typePtr = new LongArray(1);

      libvoicemeeter.VBVMR_Output_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
      this.outputDevices.push({
        name: String.fromCharCode(...namePtr.toArray()).replace(/\u0000+$/g, ''),
        hardwareId: String.fromCharCode(...hardwareIdPtr.toArray()).replace(/\u0000+$/g, ''),
        type: typePtr[0]
      })
    }

    const inputDeviceNumber = libvoicemeeter.VBVMR_Input_GetDeviceNumber();
    for (let i = 0; i < inputDeviceNumber; i++) {

      var hardwareIdPtr = new CharArray(256);
      var namePtr = new CharArray(256);
      var typePtr = new LongArray(1);

      libvoicemeeter.VBVMR_Input_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
      this.inputDevices.push({
        name: String.fromCharCode(...namePtr.toArray()).replace(/\u0000+$/g, ''),
        hardwareId: String.fromCharCode(...hardwareIdPtr.toArray()).replace(/\u0000+$/g, ''),
        type: typePtr[0]
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

//Create setter function
const parameterStripNames = ['mono', 'solo', 'mute', 'gain', 'gate', 'comp'];
const parameterBusNames = ['mono', 'mute', 'gain'];

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
async function start(){
  try{
    await voicemeeter.init();
    voicemeeter.login();
    voicemeeter.updateDeviceList();

    voicemeeter.inputDevices.forEach(d => {
      console.log(d)
    })
    console.log('voicemeeter version',voicemeeter.version);
    console.log(voicemeeter.getParameter('Strip[1].gain'));
    
    setInterval(()=>{
      if(voicemeeter.isParametersDirty()){
        console.log(voicemeeter.getParameter('Strip[1].gain'));
      }
    },10)
    //voicemeeter.logout();
  }
  catch(e){
    console.log(e)
  }
}
start();
// */