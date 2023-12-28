const VoicemeeterDefaultConfig = { // key is VoicemeeterType
    0: {},
    1: {
        strips: [{
            id: 0,
            name: "Hardware input 1"
        }, {
            id: 1,
            name: "Hardware input 2"
        }, {
            id: 2,
            name: "Voicemeeter VAIO",
            isVirtual: true
        }],
        buses: [{
            id: 0,
            name: "Hardware input 1"
        }, {
            id: 1,
            name: "Hardware input 2"
        }]
    },
    2: {
        strips: [{
            id: 0,
            name: "Hardware input 1"
        }, {
            id: 1,
            name: "Hardware input 2"
        }, {
            id: 2,
            name: "Hardware input 3"
        }, {
            id: 3,
            name: "Voicemeeter VAIO",
            isVirtual: true
        }, {
            id: 4,
            name: "Voicemeeter AUX",
            isVirtual: true
        }],
        buses: [{
            id: 0,
        }, {
            id: 1,
        }, {
            id: 2,
        }, {
            id: 3,
            isVirtual: true
        }, {
            id: 4,
            isVirtual: true
        }],
    },
    3: {
        strips: [{
            id: 0,
            name: "Hardware input 1"
        }, {
            id: 1,
            name: "Hardware input 2"
        }, {
            id: 2,
            name: "Hardware input 3"
        }, {
            id: 3,
            name: "Hardware input 4"
        }, {
            id: 4,
            name: "Hardware input 5"
        }, {
            id: 5,
            name: "Voicemeeter VAIO",
            isVirtual: true
        }, {
            id: 6,
            name: "Voicemeeter AUX",
            isVirtual: true
        }, {
            id: 7,
            name: "Voicemeeter VAIO 3",
            isVirtual: true
        }],
        buses: [{
            id: 0,
        }, {
            id: 1,
        }, {
            id: 2,
        }, {
            id: 3,
        }, {
            id: 4,
        }, {
            id: 5,
            isVirtual: true
        }, {
            id: 6,
            isVirtual: true
        }, {
            id: 7,
            isVirtual: true
        }],
    },
    6: {
        strips: [{
            id: 0,
            name: "Hardware input 1"
        }, {
            id: 1,
            name: "Hardware input 2"
        }, {
            id: 2,
            name: "Hardware input 3"
        }, {
            id: 3,
            name: "Hardware input 4"
        }, {
            id: 4,
            name: "Hardware input 5"
        }, {
            id: 5,
            name: "Voicemeeter VAIO",
            isVirtual: true
        }, {
            id: 6,
            name: "Voicemeeter AUX",
            isVirtual: true
        }, {
            id: 7,
            name: "Voicemeeter VAIO 3",
            isVirtual: true
        }],
        buses: [{
            id: 0,
        }, {
            id: 1,
        }, {
            id: 2,
        }, {
            id: 3,
        }, {
            id: 4,
        }, {
            id: 5,
            isVirtual: true
        }, {
            id: 6,
            isVirtual: true
        }, {
            id: 7,
            isVirtual: true
        }],
    }
}

const VoicemeeterType = {
    unknown: 0,
    voicemeeter: 1,
    voicemeeterBanana: 2,
    voicemeeterPotato: 3,
    voicemeeterPotato64: 6
}

const InterfaceType = {
    strip: 0,
    bus: 1
}

const MacroButtonState = {
    disabled: 0,
    enabled: 1
}

const MacroButtonTrigger = {
    disabled: 0,
    enabled: 1
}

const MacroButtonColor = {
    default: 0,
    brown: 1,
    yellow: 2,
    green: 3,
    cyan: 4,
    blue: 5,
    darkblue: 6,
    pink: 7,
    red: 8
}

module.exports = { VoicemeeterDefaultConfig, VoicemeeterType, InterfaceType, MacroButtonState, MacroButtonTrigger, MacroButtonColor };
