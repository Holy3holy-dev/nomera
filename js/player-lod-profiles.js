/* Verified player LOD policies. Full GLBs and physical data stay unchanged. */
(function(r){const p={
  "audi_rs7.glb": {
    "id": "rs7",
    "name": "Audi RS7 Sportback",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "vaz2107.glb": {
    "id": "vaz2107",
    "name": "ВАЗ-2107 «Жигули»",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "gtr.glb": {
    "normalizeAnonymousNames": true,
    "id": "gtr",
    "name": "Nissan GT-R R35 Nismo",
    "playerOnly": true,
    "batchCompatible": true,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.5,
    "wheelFullDistance": 6.5,
    "errorScales": [
      0.3,
      0.2
    ],
    "minIndices": 180
  },
  "bmw_m3_sedan.glb": {
    "id": "m3_g80",
    "name": "BMW M3 G80 Competition",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "g63.glb": {
    "id": "g63",
    "name": "Mercedes-Benz G63 AMG «Гелик»",
    "playerOnly": true,
    "batchCompatible": true,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.5,
    "wheelFullDistance": 6.5,
    "errorScales": [
      0.3,
      0.2
    ],
    "minIndices": 180
  },
  "toyota_supra.glb": {
    "id": "supra",
    "name": "Toyota Supra MK4",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "porsche.glb": {
    "id": "cayman_baron",
    "name": "Porsche Cayman S",
    "playerOnly": true,
    "batchCompatible": true,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.5,
    "wheelFullDistance": 6.5,
    "errorScales": [
      0.3,
      0.2
    ],
    "minIndices": 180
  },
  "chiron.glb": {
    "id": "chiron",
    "name": "Bugatti Chiron Super Sport",
    "playerOnly": true,
    "batchCompatible": true,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.5,
    "wheelFullDistance": 6.5,
    "errorScales": [
      0.3,
      0.2
    ],
    "minIndices": 180
  },
  "elantra_n.glb": {
    "id": "elantra_n",
    "name": "Hyundai Elantra N",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "veloster_n.glb": {
    "id": "eclipse_lou",
    "name": "Mitsubishi Eclipse GT",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "ferrari.glb": {
    "id": "sf90",
    "name": "Ferrari SF90 Stradale",
    "playerOnly": true,
    "batchCompatible": true,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.5,
    "wheelFullDistance": 6.5,
    "errorScales": [
      0.3,
      0.2
    ],
    "minIndices": 180
  },
  "x5m.glb": {
    "normalWeight": 0.0002,
    "permissive": true,
    "id": "x5m",
    "name": "BMW X5M Competition",
    "playerOnly": true,
    "batchCompatible": true,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.5,
    "wheelFullDistance": 6.5,
    "errorScales": [
      0.3,
      0.2
    ],
    "minIndices": 180
  },
  "aston_martin.glb": {
    "id": "db9",
    "name": "Aston Martin DB9",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "maserati.glb": {
    "id": "maserati",
    "name": "Maserati GranTurismo",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "panamera_wagon.glb": {
    "id": "panamera",
    "name": "Porsche Panamera Turbo",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "bmw_i8.glb": {
    "id": "m8",
    "name": "BMW M8 Gran Coupe",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "lamborghini.glb": {
    "id": "gallardo_ming",
    "name": "Lamborghini Gallardo",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "phantom.glb": {
    "id": "cullinan",
    "name": "Rolls-Royce Cullinan",
    "playerOnly": true,
    "batchCompatible": true,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.5,
    "wheelFullDistance": 6.5,
    "errorScales": [
      0.3,
      0.2
    ],
    "minIndices": 180
  },
  "mclaren.glb": {
    "id": "mclaren",
    "name": "Mercedes-Benz SLR McLaren",
    "playerOnly": false,
    "batchCompatible": false,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.75,
    "wheelFullDistance": 6.5,
    "errorScales": [
      1,
      1
    ],
    "minIndices": 180,
    "pixelEntryFactor": 0.95
  },
  "vesta.glb": {
    "id": "vesta",
    "name": "Lada Vesta Sport",
    "playerOnly": true,
    "batchCompatible": true,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.5,
    "wheelFullDistance": 6.5,
    "errorScales": [
      0.3,
      0.2
    ],
    "minIndices": 180
  },
  "hypercar.glb": {
    "id": "jesko",
    "name": "Koenigsegg Jesko Attack",
    "playerOnly": true,
    "batchCompatible": true,
    "smoothSwitch": true,
    "wheelTopologyKey": true,
    "pixelErrorLimit": 0.5,
    "wheelFullDistance": 6.5,
    "errorScales": [
      0.3,
      0.2
    ],
    "minIndices": 180
  }
};if(typeof module==='object'&&module.exports)module.exports=p;else r.NomeraPlayerLodProfiles=p;})(typeof globalThis!=='undefined'?globalThis:this);
