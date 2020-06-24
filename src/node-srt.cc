#if defined(_WIN32)
#include <srt.h>
#pragma comment(lib, "ws2_32.lib")
#elif !defined(_WIN32)
#include <srt/srt.h>
#include <sys/syslog.h>
#endif
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
    InstanceMethod("setSockOpt", &NodeSRT::SetSockOpt),
    InstanceMethod("getSockOpt", &NodeSRT::GetSockOpt),
    InstanceMethod("getSockState", &NodeSRT::GetSockState),
    InstanceMethod("epollCreate", &NodeSRT::EpollCreate),
    InstanceMethod("epollAddUsock", &NodeSRT::EpollAddUsock),
    InstanceMethod("epollUWait", &NodeSRT::EpollUWait),

    StaticValue("ERROR", Napi::Number::New(env, SRT_ERROR)),
    StaticValue("INVALID_SOCK", Napi::Number::New(env, SRT_INVALID_SOCK)),

    // Socket options
    StaticValue("SRTO_MSS", Napi::Number::New(env, SRTO_MSS)),
    StaticValue("SRTO_SNDSYN", Napi::Number::New(env, SRTO_SNDSYN)),
    StaticValue("SRTO_RCVSYN", Napi::Number::New(env, SRTO_RCVSYN)),
    
    // Socket status
    StaticValue("SRTS_INIT", Napi::Number::New(env, SRTS_INIT)),
    StaticValue("SRTS_OPENED", Napi::Number::New(env, SRTS_OPENED)),
    StaticValue("SRTS_LISTENING", Napi::Number::New(env, SRTS_LISTENING)),
    StaticValue("SRTS_CONNECTING", Napi::Number::New(env, SRTS_CONNECTING)),
    StaticValue("SRTS_CONNECTED", Napi::Number::New(env, SRTS_CONNECTED)),
    StaticValue("SRTS_BROKEN", Napi::Number::New(env, SRTS_BROKEN)),
    StaticValue("SRTS_NONEXIST", Napi::Number::New(env, SRTS_NONEXIST)),

    // Epoll options
    StaticValue("EPOLL_IN", Napi::Number::New(env, SRT_EPOLL_IN)),
    StaticValue("EPOLL_OUT", Napi::Number::New(env, SRT_EPOLL_OUT)),
    StaticValue("EPOLL_ERR", Napi::Number::New(env, SRT_EPOLL_ERR)),
    StaticValue("EPOLL_ET", Napi::Number::New(env, SRT_EPOLL_ET)),
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

  Napi::Boolean isSender = Napi::Boolean::New(env, false);
  if (info.Length() > 0) {
    isSender = info[0].As<Napi::Boolean>();
  }
  
  SRTSOCKET socket = srt_socket(AF_INET, SOCK_DGRAM, 0);
  if (socket == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  if (isSender) {
    int yes = 1;
    srt_setsockflag(socket, SRTO_SENDER, &yes, sizeof(yes));
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
  uint8_t *buffer = (uint8_t *)malloc(bufferSize);
  memset(buffer, 0, bufferSize);

  int nb = srt_recvmsg(socketValue, (char *)buffer, (int)bufferSize);
  if (nb == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }

  Napi::Value nbuff = Napi::Buffer<uint8_t>::Copy(env, buffer, nb);
  free(buffer);

  return nbuff;
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

Napi::Value NodeSRT::SetSockOpt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  Napi::Number option = info[1].As<Napi::Number>();
  int result = SRT_ERROR;

  if (info[2].IsNumber()) {
    Napi::Number value = info[2].As<Napi::Number>();
    int32_t optName = option;
    int optValue = value;
    result = srt_setsockflag(socketValue, (SRT_SOCKOPT)optName, &optValue, sizeof(int));
    if (result == SRT_ERROR) {
      Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
      return Napi::Number::New(env, SRT_ERROR);
    }
  } else if (info[2].IsBoolean()) {
    Napi::Boolean value = info[2].As<Napi::Boolean>();
    int32_t optName = option;
    bool optValue = value;
    result = srt_setsockflag(socketValue, (SRT_SOCKOPT)optName, &optValue, sizeof(bool));
    if (result == SRT_ERROR) {
      Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
      return Napi::Number::New(env, SRT_ERROR);
    }
  }
  return Napi::Number::New(env, result);
}

Napi::Value NodeSRT::GetSockOpt(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  Napi::Number option = info[1].As<Napi::Number>();

  Napi::Value empty;
  int32_t optName = option;
  int result = SRT_ERROR;

  switch((SRT_SOCKOPT)optName) {
    case SRTO_MSS:
    {
      int optValue;
      int optSize = sizeof(optValue);
      result = srt_getsockflag(socketValue, (SRT_SOCKOPT)optName, (void *)&optValue, &optSize);
      return Napi::Value::From(env, optValue);
    }
    case SRTO_RCVSYN:
    {
      bool optValue;
      int optSize = sizeof(optValue);
      result = srt_getsockflag(socketValue, (SRT_SOCKOPT)optName, (void *)&optValue, &optSize);
      return Napi::Value::From(env, optValue);
    }
    default:
      Napi::Error::New(env, "SOCKOPT not implemented yet").ThrowAsJavaScriptException();
      break;
  }
  
  if (result == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return empty;
  }
  return empty;
}

Napi::Value NodeSRT::GetSockState(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();
  return Napi::Number::New(env, srt_getsockstate(socketValue));
}

Napi::Value NodeSRT::EpollCreate(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  int epid = srt_epoll_create();
  if (epid < 0) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, epid);
}

Napi::Value NodeSRT::EpollAddUsock(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number epidValue = info[0].As<Napi::Number>();
  Napi::Number socketValue = info[1].As<Napi::Number>();
  Napi::Number eventsValue = info[2].As<Napi::Number>();

  int events = eventsValue;
  int result = srt_epoll_add_usock(epidValue, socketValue, &events);
  if (result == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }
  return Napi::Number::New(env, result);
}

Napi::Value NodeSRT::EpollUWait(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  
  Napi::Number epidValue = info[0].As<Napi::Number>();
  Napi::Number msTimeOut = info[1].As<Napi::Number>();

  int fdsSetSize = 100;
  SRT_EPOLL_EVENT fdsSet[fdsSetSize];
  int n = srt_epoll_uwait(epidValue, fdsSet, fdsSetSize, msTimeOut);
  Napi::Array events = Napi::Array::New(env, n);
  for(int i = 0; i < n; i++) {
    Napi::Object event = Napi::Object::New(env);
    event.Set(Napi::String::New(env, "socket"), Napi::Number::New(env, fdsSet[i].fd));
    event.Set(Napi::String::New(env, "events"), Napi::Number::New(env, fdsSet[i].events));
    events[i] = event;
  }

  return events;
}
