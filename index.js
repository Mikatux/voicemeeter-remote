const { dirname, join } = require("path");
const Registry = require("winreg");
const ffi = require("ffi-napi");

const ArrayType = require("ref-array-napi");
const CharArray = ArrayType("char");
const LongArray = ArrayType("long");
const FloatArray = ArrayType("float");

const { VoicemeeterDefaultConfig, VoicemeeterType, InterfaceType, MacroButtonState, MacroButtonTrigger, MacroButtonColor } = require("./voicemeeterEnums");

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

	isConnected: false,
	isInitialised: false,
	outputDevices: [],
	inputDevices: [],
	type: 0,
	version: null,
	voicemeeterConfig: null,

	async init() {

		libvoicemeeter = ffi.Library(await getDLLPath(), {
			"VBVMR_Login": ["long", []],
			"VBVMR_Logout": ["long", []],
			"VBVMR_RunVoicemeeter": ["long", ["long"]],

			"VBVMR_GetVoicemeeterType": ["long", [LongArray]],
			"VBVMR_GetVoicemeeterVersion": ["long", [LongArray]],

			"VBVMR_IsParametersDirty": ["long", []],
			"VBVMR_GetParameterFloat": ["long", [CharArray, FloatArray]],
			"VBVMR_GetParameterStringA": ["long", [CharArray, CharArray]],

			"VBVMR_SetParameters": ["long", [CharArray]],
			"VBVMR_Output_GetDeviceNumber": ["long", []],
			"VBVMR_Output_GetDeviceDescA": ["long", ["long", LongArray, CharArray, CharArray]],
			"VBVMR_Input_GetDeviceNumber": ["long", []],
			"VBVMR_Input_GetDeviceDescA": ["long", ["long", LongArray, CharArray, CharArray]],
		});

		this.isInitialised = true;
	},

	runvoicemeeter(voicemeeterType) {
		if (libvoicemeeter.VBVMR_RunVoicemeeter(voicemeeterType) === 0)
			return;
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

		const hardwareIdPtr = Buffer.alloc(parameterName.length + 1);
		hardwareIdPtr.write(parameterName);
		const namePtr = new FloatArray(1);
		libvoicemeeter.VBVMR_GetParameterFloat(hardwareIdPtr, namePtr);
		return namePtr[0];
	},

	login() {

		if (!this.isInitialised)
			throw "Await the initialization before login";

		if (this.isConnected)
			return;

		if (libvoicemeeter.VBVMR_Login() === 0) {
			this.isConnected = true;
			this.type = this._getVoicemeeterType();
			this.version = this._getVoicemeeterVersion();
			this.voicemeeterConfig = VoicemeeterDefaultConfig[this.type];
			return;
		}

		throw "Connection failed";
	},

	logout() {

		if (!this.isConnected)
			throw "Not connected";

		if (libvoicemeeter.VBVMR_Logout() === 0) {
			this.isConnected = false;
			return;
		}

		throw "Logout failed";
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

			const hardwareIdPtr = new CharArray(256);
			const namePtr = new CharArray(256);
			const typePtr = new LongArray(1);

			libvoicemeeter.VBVMR_Output_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
			this.outputDevices.push({
				name: String.fromCharCode(...namePtr.toArray()).replace(/\u0000+$/g, ""),
				hardwareId: String.fromCharCode(...hardwareIdPtr.toArray()).replace(/\u0000+$/g, ""),
				type: typePtr[0]
			});
		}

		const inputDeviceNumber = this.getInputDeviceNumber();
		for (let i = 0; i < inputDeviceNumber; i++) {

			const hardwareIdPtr = new CharArray(256);
			const namePtr = new CharArray(256);
			const typePtr = new LongArray(1);

			libvoicemeeter.VBVMR_Input_GetDeviceDescA(i, typePtr, namePtr, hardwareIdPtr);
			this.inputDevices.push({
				name: String.fromCharCode(...namePtr.toArray()).replace(/\u0000+$/g, ""),
				hardwareId: String.fromCharCode(...hardwareIdPtr.toArray()).replace(/\u0000+$/g, ""),
				type: typePtr[0]
			});
		}
	},

	showVoicemeeter() {
		if (this._sendRawParameterScript("Command.Show=1;") === 0)
			return;
		throw "Running failed";
	},

	shutdownVoicemeeter() {
		if (this._sendRawParameterScript("Command.Shutdown=1;") === 0)
			return;
		throw "Running failed";
	},

	restartVoicemeeterAudioEngine() {
		if (this._sendRawParameterScript("Command.Restart=1;") === 0)
			return;
		throw "Running failed";
	},

	ejectVoicemeeterCassette() {
		if (this._sendRawParameterScript("Command.Eject=1;") === 0)
			return;
		throw "Running failed";
	},

	resetVoicemeeterConfiguration() {
		if (this._sendRawParameterScript("Command.Reset=1;") === 0)
			return;
		throw "Running failed";
	},

	saveVoicemeeterConfiguration(filename) {
		if (this._sendRawParameterScript("Command.Save=" + filename + ";") === 0)
			return;
		throw "Running failed";
	},

	loadVoicemeeterConfiguration(filename) {
		if (this._sendRawParameterScript("Command.Load=" + filename + ";") === 0)
			return;
		throw "Running failed";
	},

	lockVoicemeeterGui(lock) {
		if (this._sendRawParameterScript("Command.Lock=" + (lock ? 1 : 0) + ";") === 0)
			return;
		throw "Running failed";
	},

	setMacroButtonState(button, state) {
		if (!Object.values(MacroButtonState).includes(state))
			throw "Invalid state";
		if (this._sendRawParameterScript("Command.Button[" + button + "].State=" + state + ";") === 0)
			return;
		throw "Running failed";
	},

	setMacroButtonStateOnly(button, state) {
		if (!Object.values(MacroButtonState).includes(state))
			throw "Invalid state";
		if (this._sendRawParameterScript("Command.Button[" + button + "].StateOnly=" + state + ";") === 0)
			return;
		throw "Running failed";
	},

	setMacroButtonTrigger(button, trigger) {
		if (!Object.values(MacroButtonTrigger).includes(trigger))
			throw "Invalid trigger";
		if (this._sendRawParameterScript("Command.Button[" + button + "].Trigger=" + trigger + ";") === 0)
			return;
		throw "Running failed";
	},

	/**
	 * Seems to be broken in the Voicemeeter API
	 */
	setMacroButtonColor(button, color) {
		if (!Object.values(MacroButtonColor).includes(color))
			throw "Invalid color";
		if (this._sendRawParameterScript("Command.Button[" + button + "].Color=" + color + ";") === 0)
			return;
		throw "Running failed";
	},

	showVbanChatDialog() {
		if (this._sendRawParameterScript("Command.DialogShow.VBANCHAT=1;") === 0)
			return;
		throw "Running failed";
	},

	_getVoicemeeterType() {

		const typePtr = new LongArray(1);
		if (libvoicemeeter.VBVMR_GetVoicemeeterType(typePtr) !== 0)
			throw "Running failed";

		switch (typePtr[0]) {
			case 1: // Voicemeeter software
				return VoicemeeterType.voicemeeter;
			case 2: // Voicemeeter Banana software
				return VoicemeeterType.voicemeeterBanana;
			case 3: // Voicemeeter Potato software
				return VoicemeeterType.voicemeeterPotato;
			case 6: // Voicemeeter Potato software
				return VoicemeeterType.voicemeeterPotato64;
			default: // Unknown type
				return VoicemeeterType.unknown;
		}
	},

	_getVoicemeeterVersion() {

		const versionPtr = new LongArray(1);
		if (libvoicemeeter.VBVMR_GetVoicemeeterVersion(versionPtr) !== 0)
			throw "Running failed";

		const v4 = versionPtr[0] % (2 ^ 8);
		const v3 = parseInt((versionPtr[0] - v4) % Math.pow(2, 16) / Math.pow(2, 8));
		const v2 = parseInt(((versionPtr[0] - v3 * 256 - v4) % Math.pow(2, 24)) / Math.pow(2, 16));
		const v1 = parseInt((versionPtr[0] - v2 * 512 - v3 * 256 - v4) / Math.pow(2, 24));
		return `${v1}.${v2}.${v3}.${v4}`;
	},

	_getParameter(type, name, id) {

		if (!this.isConnected)
			throw "Not connected";

		if (!this.voicemeeterConfig)
			throw "Configuration error";

		if (!Object.values(InterfaceType).includes(type))
			throw "Invalid trigger";

		const interfaceType = type === InterfaceType.strip ? "Strip" : "Bus";

		if (!this.voicemeeterConfig[type === InterfaceType.strip ? "strips" : "buses"].some((strip) => strip.id === id))
			throw `${interfaceType} ${id} not found`;

		const parameterName = `${interfaceType}[${id}].${name};`;

		const hardwareIdPtr = Buffer.alloc(parameterName.length + 1);
		hardwareIdPtr.write(parameterName);
		const namePtr = new FloatArray(1);
		libvoicemeeter.VBVMR_GetParameterFloat(hardwareIdPtr, namePtr);
		return namePtr[0];
	},

	_setParameter(type, name, id, value) {

		if (!this.isConnected)
			throw "Not connected";

		if (!this.voicemeeterConfig)
			throw "Configuration error";

		if (!Object.values(InterfaceType).includes(type))
			throw "Invalid trigger";

		const interfaceType = type === InterfaceType.strip ? "Strip" : "Bus";

		if (!this.voicemeeterConfig[type === InterfaceType.strip ? "strips" : "buses"].some((strip) => strip.id === id))
			throw `${interfaceType} ${id} not found`;

		return this._sendRawParameterScript(`${interfaceType}[${id}].${name}=${value};`);
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
				throw "Invalid trigger";

			const interfaceType = parameter.type === InterfaceType.strip ? "Strip" : "Bus";

			if (!this.voicemeeterConfig[parameter.type === InterfaceType.strip ? "strips" : "buses"].some((strip) => strip.id === parameter.id))
				throw `${interfaceType} ${parameter.id} not found`;

			return `${interfaceType}[${parameter.id}].${parameter.name}=${parameter.value};`;

		}).join("\n");

		return this._sendRawParameterScript(script);
	},

	_sendRawParameterScript(scriptString) {
		const script = Buffer.alloc(scriptString.length + 1);
		script.fill(0);
		script.write(scriptString);
		return libvoicemeeter.VBVMR_SetParameters(script);
	}
}

const busesParametersNames = ["Mono", "Mute", "Gain"];
const stripParametersNames = ["Mono", "Mute", "Solo", "MC", "Gain", "Pan_x", "Pan_y", "Color_x", "Color_y", "fx_x", "fx_y", "Audibility", "Gate", "Comp", "A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3"];

busesParametersNames.forEach((name) => {

	voicemeeter[`setBus${name}`] = (busNumber, value) => {
		if (typeof value === "boolean")
			voicemeeter._setParameter(InterfaceType.bus, name, busNumber, value ? 1 : 0);
		else
			voicemeeter._setParameter(InterfaceType.bus, name, busNumber, value);
	}

	voicemeeter[`getBus${name}`] = (busNumber) => {
		return voicemeeter._getParameter(InterfaceType.bus, name, busNumber);
	}
});

stripParametersNames.forEach((name) => {

	voicemeeter[`setStrip${name}`] = (stripNumber, value) => {
		if (typeof value === "boolean")
			voicemeeter._setParameter(InterfaceType.strip, name, stripNumber, value ? 1 : 0);
		else
			voicemeeter._setParameter(InterfaceType.strip, name, stripNumber, value);
	}

	voicemeeter[`getStrip${name}`] = (stripNumber) => {
		return voicemeeter._getParameter(InterfaceType.strip, name, stripNumber);
	}
});

module.exports = voicemeeter;
module.exports.VoicemeeterType = VoicemeeterType;
module.exports.InterfaceType = InterfaceType;
module.exports.MacroButtonState = MacroButtonState;
module.exports.MacroButtonTrigger = MacroButtonTrigger;
module.exports.MacroButtonColor = MacroButtonColor;
