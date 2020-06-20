{
  "targets": [{
    "target_name": "node_srt",
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions" ],
    "sources": [
      "src/binding.cc",
      "src/node-srt.cc"
    ],
    "include_dirs": [
      "<!@(node -p \"require('node-addon-api').include\")",
      "deps/build/include"
    ],
    "libraries": [ "<(module_root_dir)/deps/build/lib/libsrt.a" ],
    "dependencies": [
      "<!(node -p \"require('node-addon-api').gyp\")"
    ],
    "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
  }]
}