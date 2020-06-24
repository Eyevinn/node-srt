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
      "<!@(node -p \"require('node-addon-api').include\")"
    ],
    "conditions": [
      [ 'OS=="win"', {
        "defines": [
          "WIN32_LEAN_AND_MEAN"
        ],
        "include_dirs+": [
          "deps/srt/srtcore",
          "deps/build",
          "deps/srt/common"
        ],
        "libraries": [ "<(module_root_dir)/deps/build/Release/srt.lib" ],
        "copies": [{
          "destination": "<(module_root_dir)/build/Release",
          "files": [
            "<(module_root_dir)/deps/build/Release/srt.dll"
          ]
        }]
      }],
      [ 'OS!="win"', {
        "libraries": [ "<(module_root_dir)/deps/build/lib/libsrt.a" ],
        "include_dirs+": [
          "deps/build/include"
        ]
      }]
    ],
    "dependencies": [
      "<!(node -p \"require('node-addon-api').gyp\")"
    ],
    "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
  }]
}
