#include <napi.h>
#include "node-srt.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return NodeSRT::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)