Draco decoder for the gallery landmark models, copied verbatim from
`three/examples/jsm/libs/draco/gltf/` (Apache-2.0, Google). Served locally so
`DRACOLoader` never reaches out to a CDN. Only the WASM pair is kept -
`draco_decoder.js` (the 512 KB JS fallback) is omitted because every browser
target supports WebAssembly. Re-copy these when upgrading `three`.
