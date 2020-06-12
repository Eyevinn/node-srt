#include "node-srt.h"

Napi::FunctionReference NodeSRT::constructor;

Napi::Object NodeSRT::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "NodeSRT", {
    InstanceMethod("hello", &NodeSRT::Hello)
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("NodeSRT", func);
  return exports;
}

NodeSRT::NodeSRT(const Napi::CallbackInfo& info) : Napi::ObjectWrap<NodeSRT>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
}

Napi::Value NodeSRT::Hello(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::String returnValue = Napi::String::New(env, "Hello World");
  return returnValue;
}