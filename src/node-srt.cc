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
    InstanceMethod("connect", &NodeSRT::Connect),
    InstanceMethod("accept", &NodeSRT::Accept),
    InstanceMethod("close", &NodeSRT::Close),
    InstanceMethod("read", &NodeSRT::Read),
    InstanceMethod("write", &NodeSRT::Write),
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

  SRTSOCKET socket = srt_socket(AF_INET, SOCK_DGRAM, 0);
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
  memset(&addr, 0, sizeof (addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons(uint32_t(port));
  int result = inet_pton(AF_INET, std::string(address).c_str(), &addr.sin_addr);
  if (result != 1) {
    Napi::Error::New(env, "Failed to init addr.sin_addr").ThrowAsJavaScriptException();
    return Napi::Number::New(env, result);
  }

  result = srt_bind(socketValue, (struct sockaddr *)&addr, sizeof(addr));
  if (result == SRT_ERROR) {
    srt_close(socketValue);
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
    srt_close(socketValue);
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, result);
}

Napi::Value NodeSRT::Connect(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  Napi::String host = info[1].As<Napi::String>();
  Napi::Number port = info[2].As<Napi::Number>();

  struct sockaddr_in addr;
  memset(&addr, 0, sizeof (addr));
  addr.sin_family = AF_INET;
  addr.sin_port = htons(uint32_t(port));

  inet_pton(AF_INET, std::string(host).c_str(), &addr.sin_addr);

  int result = srt_connect(socketValue, (struct sockaddr *)&addr, sizeof(addr));
  if (result == SRT_ERROR) {
    srt_close(socketValue);
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, result);
}

Napi::Value NodeSRT::Accept(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();

  sockaddr_in their_addr;
  int addr_size;

  int their_fd = srt_accept(socketValue, (struct sockaddr *)&their_addr, &addr_size);
  if (their_fd == SRT_INVALID_SOCK) {
    srt_close(socketValue);
    socketValue = Napi::Number::New(env, SRT_INVALID_SOCK);
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  srt_close(socketValue);
  socketValue = Napi::Number::New(env, SRT_INVALID_SOCK);
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

Napi::Value NodeSRT::Read(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  Napi::Number chunkSize = info[1].As<Napi::Number>();

  size_t bufferSize = uint32_t(chunkSize);
  uint8_t buffer[bufferSize];
  memset(&buffer, 0, bufferSize);

  int nb = srt_recvmsg(socketValue, (char *)buffer, (int)bufferSize);
  return Napi::Buffer<uint8_t>::Copy(env, buffer, nb);
}

Napi::Value NodeSRT::Write(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  Napi::Buffer<uint8_t> chunk = info[1].As<Napi::Buffer<uint8_t>>();

  int result = srt_sendmsg2(socketValue, (const char *)chunk.Data(), chunk.Length(), nullptr);
  if (result == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, result);
}