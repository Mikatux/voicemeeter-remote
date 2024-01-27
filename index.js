const { dirname, join } = require("path");
const Registry = require("winreg");
const koffi = require("koffi");

const { VoicemeeterDefaultConfig, VoicemeeterType, RunVoicemeeterType, InterfaceType, LevelType, DeviceType, MacroButtonState, MacroButtonTrigger, MacroButtonColor } = require("./voicemeeterEnums");

const getDLLPath = () => {
    const regKey = new Registry({
        hive: Registry.HKLM,
        key: "\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VB:Voicemeeter {17359A74-1236-5467}"
    });
    return new Promise((resolve) => {
        regKey.values((error, items) => {
            const uninstallerPath = items.find((item) => item.name === "UninstallString").value;
            resolve(join(dirname(uninstallerPath), "VoicemeeterRemote64.dll"));
        });
    });
}

let libvoicemeeter;

const voicemeeter = {

    isInitialised: false,
    isConnected: false,
    outputDevices: [],
    inputDevices: [],
    type: 0,
    version: null,
    voicemeeterConfig: null,

    async init() {

        const dll = koffi.load(await getDLLPath());

        libvoicemeeter = {
            // Login
            VBVMR_Login: dll.func("long __stdcall VBVMR_Login(void)"),
            VBVMR_Logout: dll.func("long __stdcall VBVMR_Logout(void)"),
            VBVMR_RunVoicemeeter: dll.func("long __stdcall VBVMR_RunVoicemeeter(long vType)"),

            // General informations
            VBVMR_GetVoicemeeterType: dll.func("long __stdcall VBVMR_GetVoicemeeterType(_Out_ long * pType)"),
            VBVMR_GetVoicemeeterVersion: dll.func("long __stdcall VBVMR_GetVoicemeeterVersion(_Out_ long * pVersion)"),

            // Get parameters
            VBVMR_IsParametersDirty: dll.func("long __stdcall VBVMR_IsParametersDirty(void)"),
            VBVMR_GetParameterFloat: dll.func("long __stdcall VBVMR_GetParameterFloat(char * szParamName, _Out_ float * pValue)"),
            VBVMR_GetParameterStringA: dll.func("long __stdcall VBVMR_GetParameterStringA(char * szParamName, _Out_ void * szString)"),
            VBVMR_GetParameterStringW: dll.func("long __stdcall VBVMR_GetParameterStringW(char * szParamName, _Out_ unsigned short * wszString)"), // Not tested

            // Get levels
            VBVMR_GetLevel: dll.func("long __stdcall VBVMR_GetLevel(long nType, long nuChannel, _Out_ float * pValue)"),
            VBVMR_GetMidiMessage: dll.func("long __stdcall VBVMR_GetMidiMessage(_Out_ unsigned char *pMIDIBuffer, long nbByteMax)"), // Not tested
            VBVMR_SendMidiMessage: dll.func("long __stdcall VBVMR_SendMidiMessage(_Out_ unsigned char *pMIDIBuffer, long nbByte)"), // Not tested

            // Set parameters
            VBVMR_SetParameterFloat: dll.func("long __stdcall VBVMR_SetParameterFloat(char * szParamName, float Value)"),
            VBVMR_SetParameterStringA: dll.func("long __stdcall VBVMR_SetParameterStringA(char * szParamName, char * szString)"), // Not tested
            VBVMR_SetParameterStringW: dll.func("long __stdcall VBVMR_SetParameterStringW(char * szParamName, unsigned short * wszString)"), // Not tested
            VBVMR_SetParameters: dll.func("long __stdcall VBVMR_SetParameters(char * szParamScript)"),
            VBVMR_SetParametersW: dll.func("long __stdcall VBVMR_SetParametersW(unsigned short * szParamScript)"), // Not tested

            // Devices enumerator
            VBVMR_Output_GetDeviceNumber: dll.func("long __stdcall VBVMR_Output_GetDeviceNumber(void)"),
            VBVMR_Output_GetDeviceDescA: dll.func("long __stdcall VBVMR_Output_GetDeviceDescA(long zindex, _Out_ long * nType, _Out_ void * szDeviceName, _Out_ void * szHardwareId)"),
            VBVMR_Output_GetDeviceDescW: dll.func("long __stdcall VBVMR_Output_GetDeviceDescW(long zindex, _Out_ long * nType, _Out_ unsigned short * wszDeviceName, _Out_ unsigned short * wszHardwareId)"), // Not tested
            VBVMR_Input_GetDeviceNumber: dll.func("long __stdcall VBVMR_Input_GetDeviceNumber(void)"),
            VBVMR_Input_GetDeviceDescA: dll.func("long __stdcall VBVMR_Input_GetDeviceDescA(long zindex, _Out_ long * nType, _Out_ void * szDeviceName, _Out_ void * szHardwareId)"),
            VBVMR_Input_GetDeviceDescW: dll.func("long __stdcall VBVMR_Input_GetDeviceDescW(long zindex, _Out_ long * nType, _Out_ unsigned short * wszDeviceName, _Out_ unsigned short * wszHardwareId)"), // Not tested

            // TODO Implement callback

            // Macro buttons
            VBVMR_MacroButton_IsDirty: dll.func("long __stdcall VBVMR_MacroButton_IsDirty(void)"),
            VBVMR_MacroButton_GetStatus: dll.func("long __stdcall VBVMR_MacroButton_GetStatus(long nuLogicalButton, _Out_ float * pValue, long bitmode)"),
            VBVMR_MacroButton_SetStatus: dll.func("long __stdcall VBVMR_MacroButton_SetStatus(long nuLogicalButton, float fValue, long bitmode)")
        };

        this.isInitialised = true;
    },

    runVoicemeeter(runVoicemeeterType) {
        if (libvoicemeeter.VBVMR_RunVoicemeeter(runVoicemeeterType) !== 0)
            throw "Running failed";
    },

    isParametersDirty() {
        return libvoicemeeter.VBVMR_IsParametersDirty();
    },

    /**
     * @deprecated 
     */
    getParameter(parameterName) {

        if (!this.isConnected)
            throw "Not connected";

        const value = [0];
        if (libvoicemeeter.VBVMR_GetParameterFloat(parameterName, value) !== 0)
            throw "Running failed";

        return value[0];
    },

    login() {

        if (!this.isInitialised)
            throw "Await the initialization before login";

        if (this.isConnected)
            throw "Already connected";

        if (libvoicemeeter.VBVMR_Login() !== 0)
            throw "Login failed";

        this.type = this._getVoicemeeterType();
        this.version = this._getVoicemeeterVersion();
        this.voicemeeterConfig = VoicemeeterDefaultConfig[this.type];
        this.isConnected = true;
    },

    logout() {

        if (!this.isConnected)
            throw "Not connected";

        if (libvoicemeeter.VBVMR_Logout() !== 0)
            throw "Logout failed";

        this.isConnected = false;
    },

    getOutputDeviceNumber() {
        return libvoicemeeter.VBVMR_Output_GetDeviceNumber();
    },

    getInputDeviceNumber() {
        return libvoicemeeter.VBVMR_Input_GetDeviceNumber();
    },

    updateDeviceList() {

        if (!this.isConnected)
            throw "Not connected";

        this.outputDevices = [];
        this.inputDevices = [];

        const outputDeviceNumber = this.getOutputDeviceNumber();
        for (let i = 0; i < outputDeviceNumber; i++) {

            const type = [0];
            const deviceName = Buffer.alloc(256);
            const hardwareId = Buffer.alloc(256);

            if (libvoicemeeter.VBVMR_Output_GetDeviceDescA(i, type, deviceName, hardwareId) !== 0)
                throw "Running failed";

            this.outputDevices.push({
                type: type[0],
                name: deviceName.toString().replace(/\x00+$/, ""),
                hardwareId: hardwareId.toString().replace(/\x00+$/, "")
            });
        }

        const inputDeviceNumber = this.getInputDeviceNumber();
        for (let i = 0; i < inputDeviceNumber; i++) {

            const type = [0];
            const deviceName = Buffer.alloc(256);
            const hardwareId = Buffer.alloc(256);

            if (libvoicemeeter.VBVMR_Input_GetDeviceDescA(i, type, deviceName, hardwareId) !== 0)
                throw "Running failed";

            this.inputDevices.push({
                type: type[0],
                name: deviceName.toString().replace(/\x00+$/, ""),
                hardwareId: hardwareId.toString().replace(/\x00+$/, "")
            });
        }
    },

    showVoicemeeter() {
        this._sendRawParameterScript("Command.Show=1;");
    },

    shutdownVoicemeeter() {
        this._sendRawParameterScript("Command.Shutdown=1;");
    },

    restartVoicemeeterAudioEngine() {
        this._sendRawParameterScript("Command.Restart=1;");
    },

    ejectVoicemeeterCassette() {
        this._sendRawParameterScript("Command.Eject=1;");
    },

    resetVoicemeeterConfiguration() {
        this._sendRawParameterScript("Command.Reset=1;");
    },

    saveVoicemeeterConfiguration(filename) {
        this._sendRawParameterScript("Command.Save=" + filename + ";");
    },

    loadVoicemeeterConfiguration(filename) {
        this._sendRawParameterScript("Command.Load=" + filename + ";");
    },

    lockVoicemeeterGui(lock) {
        this._sendRawParameterScript("Command.Lock=" + (lock ? 1 : 0) + ";");
    },

    setMacroButtonState(button, state) {
        if (!Object.values(MacroButtonState).includes(state))
            throw "Invalid state";
        this._sendRawParameterScript("Command.Button[" + button + "].State=" + state + ";");
    },

    setMacroButtonStateOnly(button, state) {
        if (!Object.values(MacroButtonState).includes(state))
            throw "Invalid state";
        this._sendRawParameterScript("Command.Button[" + button + "].StateOnly=" + state + ";");
    },

    setMacroButtonTrigger(button, trigger) {
        if (!Object.values(MacroButtonTrigger).includes(trigger))
            throw "Invalid trigger";
        this._sendRawParameterScript("Command.Button[" + button + "].Trigger=" + trigger + ";");
    },

    /**
     * Seems to be broken in the Voicemeeter API
     */
    setMacroButtonColor(button, color) {
        if (!Object.values(MacroButtonColor).includes(color))
            throw "Invalid color";
        this._sendRawParameterScript("Command.Button[" + button + "].Color=" + color + ";");
    },

    showVbanChatDialog() {
        this._sendRawParameterScript("Command.DialogShow.VBANCHAT=1;");
    },

    getLevel(type, channel) {

        if (!this.isConnected)
            throw "Not connected";

        const value = [0];

        if (libvoicemeeter.VBVMR_GetLevel(type, channel, value) !== 0)
            throw "Running failed";

        return value[0];
    },

    _getVoicemeeterType() {

        const voicemeeterType = [0];
        if (libvoicemeeter.VBVMR_GetVoicemeeterType(voicemeeterType) !== 0)
            throw "Running failed";

        switch (voicemeeterType[0]) {
            case 1:
                return VoicemeeterType.voicemeeter;
            case 2:
                return VoicemeeterType.voicemeeterBanana;
            case 3:
                return VoicemeeterType.voicemeeterPotato;
            case 6:
                return VoicemeeterType.voicemeeterPotato64;
            default:
                return VoicemeeterType.unknown;
        }
    },

    _getVoicemeeterVersion() {

        const voicemeeterVersion = [0];
        if (libvoicemeeter.VBVMR_GetVoicemeeterVersion(voicemeeterVersion) !== 0)
            throw "Running failed";

        const v1 = (voicemeeterVersion[0] & 0xFF000000) >> 24;
        const v2 = (voicemeeterVersion[0] & 0x00FF0000) >> 16;
        const v3 = (voicemeeterVersion[0] & 0x0000FF00) >> 8;
        const v4 = voicemeeterVersion[0] & 0x000000FF;

        return `${v1}.${v2}.${v3}.${v4}`;
    },

    _getParameterFloat(type, name, id) {

        if (!this.isConnected)
            throw "Not connected";

        if (!this.voicemeeterConfig)
            throw "Configuration error";

        if (!Object.values(InterfaceType).includes(type))
            throw "Invalid type";

        const interfaceType = type === InterfaceType.strip ? "Strip" : "Bus";

        if (!this.voicemeeterConfig[type === InterfaceType.strip ? "strips" : "buses"].some((strip) => strip.id === id))
            throw `${interfaceType} ${id} not found`;

        const parameter = `${interfaceType}[${id}].${name}`;

        const value = [0];
        if (libvoicemeeter.VBVMR_GetParameterFloat(parameter, value) !== 0)
            throw "Running failed";

        return value[0];
    },

    _getParameterString(type, name, id) {

        if (!this.isConnected)
            throw "Not connected";

        if (!this.voicemeeterConfig)
            throw "Configuration error";

        if (!Object.values(InterfaceType).includes(type))
            throw "Invalid type";

        const interfaceType = type === InterfaceType.strip ? "Strip" : "Bus";

        if (!this.voicemeeterConfig[type === InterfaceType.strip ? "strips" : "buses"].some((strip) => strip.id === id))
            throw `${interfaceType} ${id} not found`;

        const parameter = `${interfaceType}[${id}].${name}`;

        const value = Buffer.alloc(512);
        if (libvoicemeeter.VBVMR_GetParameterStringA(parameter, value) !== 0)
            throw "Running failed";

        return value.toString().replace(/\x00+$/, "");
    },

    _setParameterFloat(type, name, id, value) {

        if (!this.isConnected)
            throw "Not connected";

        if (!this.voicemeeterConfig)
            throw "Configuration error";

        if (!Object.values(InterfaceType).includes(type))
            throw "Invalid type";

        const interfaceType = type === InterfaceType.strip ? "Strip" : "Bus";

        if (!this.voicemeeterConfig[type === InterfaceType.strip ? "strips" : "buses"].some((strip) => strip.id === id))
            throw `${interfaceType} ${id} not found`;

        const parameter = `${interfaceType}[${id}].${name}`;

        if (libvoicemeeter.VBVMR_SetParameterFloat(parameter, value) !== 0)
            throw "Running failed";
    },

    _setParameterString(type, name, id, value) {

        if (!this.isConnected)
            throw "Not connected";

        if (!this.voicemeeterConfig)
            throw "Configuration error";

        if (!Object.values(InterfaceType).includes(type))
            throw "Invalid type";

        const interfaceType = type === InterfaceType.strip ? "Strip" : "Bus";

        if (!this.voicemeeterConfig[type === InterfaceType.strip ? "strips" : "buses"].some((strip) => strip.id === id))
            throw `${interfaceType} ${id} not found`;

        const parameter = `${interfaceType}[${id}].${name}`;

        if (libvoicemeeter.VBVMR_SetParameterStringA(parameter, value) !== 0)
            throw "Running failed";
    },

    _setParameters(parameters) {

        if (!this.isConnected)
            throw "Not connected";

        if (!this.voicemeeterConfig)
            throw "Configuration error";

        if (!Array.isArray(parameters))
            throw "Parameters must be an array";

        const script = parameters.map((parameter) => {

            if (!Object.values(InterfaceType).includes(parameter.type))
                throw "Invalid type";

            const interfaceType = parameter.type === InterfaceType.strip ? "Strip" : "Bus";

            if (!this.voicemeeterConfig[parameter.type === InterfaceType.strip ? "strips" : "buses"].some((strip) => strip.id === parameter.id))
                throw `${interfaceType} ${parameter.id} not found`;

            return `${interfaceType}[${parameter.id}].${parameter.name}=${parameter.value};`;

        }).join("");

        this._sendRawParameterScript(script);
    },

    _sendRawParameterScript(script) {
        if (libvoicemeeter.VBVMR_SetParameters(script) !== 0)
            throw "Running failed";
    }
}

const busesParametersNames = ["Mono", "Mute", "Gain"];
const stripParametersNames = ["Mono", "Mute", "Solo", "MC", "Gain", "Pan_x", "Pan_y", "Color_x", "Color_y", "fx_x", "fx_y", "Audibility", "Gate", "Comp", "A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3"];

busesParametersNames.forEach((name) => {

    voicemeeter[`setBus${name}`] = (busNumber, value) => {
        if (typeof value === "boolean")
            voicemeeter._setParameterFloat(InterfaceType.bus, name, busNumber, value ? 1 : 0);
        else
            voicemeeter._setParameterFloat(InterfaceType.bus, name, busNumber, value);
    }

    voicemeeter[`getBus${name}`] = (busNumber) => {
        return voicemeeter._getParameterFloat(InterfaceType.bus, name, busNumber);
    }
});

stripParametersNames.forEach((name) => {

    voicemeeter[`setStrip${name}`] = (stripNumber, value) => {
        if (typeof value === "boolean")
            voicemeeter._setParameterFloat(InterfaceType.strip, name, stripNumber, value ? 1 : 0);
        else
            voicemeeter._setParameterFloat(InterfaceType.strip, name, stripNumber, value);
    }

    voicemeeter[`getStrip${name}`] = (stripNumber) => {
        return voicemeeter._getParameterFloat(InterfaceType.strip, name, stripNumber);
    }
});

module.exports = voicemeeter;
module.exports.VoicemeeterType = VoicemeeterType;
module.exports.RunVoicemeeterType = RunVoicemeeterType;
module.exports.InterfaceType = InterfaceType;
module.exports.LevelType = LevelType;
module.exports.DeviceType = DeviceType;
module.exports.MacroButtonState = MacroButtonState;
module.exports.MacroButtonTrigger = MacroButtonTrigger;
module.exports.MacroButtonColor = MacroButtonColor;
