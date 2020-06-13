#include <srt/srt.h>
#include <sys/syslog.h>
#include "node-srt.h"

Napi::FunctionReference NodeSRT::constructor;

Napi::Object NodeSRT::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "SRT", {
    InstanceMethod("createSocket", &NodeSRT::CreateSocket),
    InstanceMethod("bind", &NodeSRT::Bind),
    InstanceMethod("listen", &NodeSRT::Listen),
    InstanceMethod("accept", &NodeSRT::Accept),
    InstanceMethod("close", &NodeSRT::Close),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("SRT", func);
  return exports;
}

NodeSRT::NodeSRT(const Napi::CallbackInfo& info) : Napi::ObjectWrap<NodeSRT>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  srt_startup();
}

NodeSRT::~NodeSRT() {
  srt_cleanup();
}

Napi::Value NodeSRT::CreateSocket(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  SRTSOCKET socket = srt_create_socket();
  if (socket == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, socket);
}

Napi::Value NodeSRT::Bind(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  Napi::String address = info[1].As<Napi::String>();
  Napi::Number port = info[2].As<Napi::Number>();

  struct sockaddr_in addr;
  addr.sin_family = AF_INET;
  addr.sin_port = uint32_t(port);
  inet_pton(AF_INET, std::string(address).c_str(), &addr.sin_addr);
  
  int result = srt_bind(socketValue, (struct sockaddr *)&addr, sizeof(addr));
  if (result == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, result);
}

Napi::Value NodeSRT::Listen(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  Napi::Number backlog = info[1].As<Napi::Number>();

  int result = srt_listen(socketValue, backlog);
  if (result == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, result);
}

Napi::Value NodeSRT::Accept(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  struct sockaddr_storage their_addr;
  int addr_size = sizeof(their_addr);
  int their_fd = srt_accept(socketValue, (struct sockaddr *)&their_addr, &addr_size);
  if (their_fd == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, their_fd);
}

Napi::Value NodeSRT::Close(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  int result = srt_close(socketValue);
  if (result == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, result);
}