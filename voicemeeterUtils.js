
const VoicemeeterDefaultConfig = { // key is VoicemeeterType
  0: {},
  1: {
    strips: [{
      id: '0',
      name: "Hardware input 1"
    }, {
      id: '1',
      name: "Hardware input 2"
    }, {
      id: '2',
      name: "Voicemeeter VAIO",
      isVirtual: true
    }],
    buses: [{
      id: '0',
      name: "Hardware input 1"
    }, {
      id: '1',
      name: "Hardware input 2"
    }]
  },
  2: {
    strips: [{
      id: '0',
      name: "Hardware input 1"
    }, {
      id: '1',
      name: "Hardware input 2"
    }, {
      id: '2',
      name: "Hardware input 3"
    }, {
      id: '3',
      name: "Hardware input 4"
    }, {
      id: '4',
      name: "Voicemeeter VAIO",
      isVirtual: true
    }, {
      id: '5',
      name: "Voicemeeter AUX",
      isVirtual: true
    }],
    buses: [{
      id: '0',
    }, {
      id: '1',
    }, {
      id: '2',
    }, {
      id: '3',
    }, {
      id: '4',
      isVirtual: true
    }, {
      id: '5',
      isVirtual: true
    }],
  },
  3: {
    strips: [{
      id: '0',
      name: "Hardware input 1"
    }, {
      id: '1',
      name: "Hardware input 2"
    }, {
      id: '2',
      name: "Hardware input 3"
    }, {
      id: '3',
      name: "Hardware input 4"
    }, {
      id: '4',
      name: "Hardware input 5"
    }, {
      id: '5',
      name: "Voicemeeter VAIO",
      isVirtual: true
    }, {
      id: '6',
      name: "Voicemeeter AUX",
      isVirtual: true
    }, {
      id: '7',
      name: "Voicemeeter VAIO 3",
      isVirtual: true
    }],
    buses: [{
      id: '0',
    }, {
      id: '1',
    }, {
      id: '2',
    }, {
      id: '3',
    }, {
      id: '4',
    }, {
      id: '5',
      isVirtual: true
    }, {
      id: '6',
      isVirtual: true
    }, {
      id: '7',
      isVirtual: true
    }],
  }
}

const VoicemeeterType = {
  'unknow': 0,
  'voicemeeter': 1,
  'voicemeeterBanana': 2,
  'voicemeeterPotato': 3
}
const InterfaceType = {
  'strip': 0,
  'bus': 1,
}

module.exports = {VoicemeeterDefaultConfig, VoicemeeterType, InterfaceType};