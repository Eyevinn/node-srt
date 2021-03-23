#if defined(_WIN32)
#include <srt.h>
#pragma comment(lib, "ws2_32.lib")
#elif !defined(_WIN32)
#include <srt/srt.h>
#include <sys/syslog.h>
#endif
#include "node-srt.h"
#include "srt-enums.h"

using namespace std;

#define EPOLL_EVENTS_NUM_MAX 1024

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
    InstanceMethod("setLogLevel", &NodeSRT::SetLogLevel),
    InstanceMethod("stats", &NodeSRT::Stats),

    StaticValue("OK", Napi::Number::New(env, 0)),
    StaticValue("ERROR", Napi::Number::New(env, SRT_ERROR)),
    StaticValue("INVALID_SOCK", Napi::Number::New(env, SRT_INVALID_SOCK)),

    // Socket options
    SOCKET_OPTIONS,

    // Socket status
    SOCKET_STATUS,

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

  // Q: should we avoid to call this repeatedly (with potentially several ObjectWrap instances created) ?
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
    // FIXME: throws exception when `arg[0] === undefined`
    isSender = info[0].As<Napi::Boolean>();
  }

  SRTSOCKET socket = srt_create_socket();
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

  Napi::Number socketId = info[0].As<Napi::Number>();
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

  result = srt_bind(socketId, (struct sockaddr *)&addr, sizeof(addr));
  if (result == SRT_ERROR) {
    srt_close(socketId);
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
  int addr_size = sizeof (sockaddr_in);

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

  // Q: why not converting to `int` directly here?
  size_t bufferSize = uint32_t(chunkSize);
  uint8_t *buffer = (uint8_t *)malloc(bufferSize);
  memset(buffer, 0, bufferSize);

  int nb = srt_recvmsg(socketValue, (char *)buffer, (int)bufferSize);
  if (nb == SRT_ERROR) {
    string err(string("srt_recvmsg: ")
      + string(srt_getlasterror_str()));
    Napi::Error::New(env, err).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
  }

  // Q: why not using char as data/template type?
  Napi::Value nbuff = Napi::Buffer<uint8_t>::Copy(env, buffer, nb);
  free(buffer);

  return nbuff;
}

Napi::Value NodeSRT::Write(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Number socketValue = info[0].As<Napi::Number>();

  // Q: why not using char as data/template type?
  Napi::Buffer<uint8_t> chunk = info[1].As<Napi::Buffer<uint8_t>>();

  int result = srt_sendmsg2(socketValue, (const char *)chunk.Data(), chunk.Length(), nullptr);
  if (result == SRT_ERROR) {
    string err(string("srt_sendmsg2: ")
      + string(srt_getlasterror_str()));
    Napi::Error::New(env, err).ThrowAsJavaScriptException();
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
  Napi::Value returnVal;

  int32_t optName = option;
  int result = SRT_ERROR;

  switch((SRT_SOCKOPT)optName) {
    case SRTO_MSS:
    case SRTO_CONNTIMEO:
    case SRTO_EVENT:
    case SRTO_FC:
    case SRTO_INPUTBW:
    case SRTO_IPTOS:
    case SRTO_ISN:
    case SRTO_IPTTL:
    case SRTO_IPV6ONLY:
    case SRTO_KMREFRESHRATE:
    case SRTO_KMPREANNOUNCE:
    case SRTO_KMSTATE:
    case SRTO_LATENCY:
    case SRTO_LOSSMAXTTL:
    case SRTO_MAXBW:
    case SRTO_MINVERSION:
    case SRTO_OHEADBW:
    case SRTO_PAYLOADSIZE:
    case SRTO_PBKEYLEN:
    case SRTO_PEERIDLETIMEO:
    case SRTO_PEERLATENCY:
    case SRTO_PEERVERSION:
    case SRTO_RCVBUF:
    case SRTO_RCVDATA:
    case SRTO_RCVLATENCY:
    case SRTO_RCVTIMEO:
    case SRTO_SNDBUF:
    case SRTO_SNDDATA:
    case SRTO_SNDDROPDELAY:
    case SRTO_SNDTIMEO:
    case SRTO_STATE:
    case SRTO_ENFORCEDENCRYPTION:
    case SRTO_TLPKTDROP:
    case SRTO_TSBPDMODE:
    case SRTO_UDP_RCVBUF:
    case SRTO_UDP_SNDBUF:
    case SRTO_VERSION:
    {
      int optValue;
      int optSize = sizeof(optValue);
      result = srt_getsockflag(socketValue, (SRT_SOCKOPT)optName, (void *)&optValue, &optSize);
      returnVal = Napi::Value::From(env, optValue);
      break;
    }
    case SRTO_RCVSYN:
    case SRTO_MESSAGEAPI:
    case SRTO_NAKREPORT:
    case SRTO_RENDEZVOUS:
    case SRTO_SENDER:
    case SRTO_SNDSYN:
    {
      bool optValue;
      int optSize = sizeof(optValue);
      result = srt_getsockflag(socketValue, (SRT_SOCKOPT)optName, (void *)&optValue, &optSize);
      returnVal = Napi::Value::From(env, optValue);
      break;
    }
    case SRTO_PACKETFILTER:
    case SRTO_PASSPHRASE:
    {
      char optValue[512];
      int optSize = sizeof(optValue);
      result = srt_getsockflag(socketValue, (SRT_SOCKOPT)optName, (void *)&optValue, &optSize);
      returnVal = Napi::Value::From(env, std::string(optValue));
      break;
    }
    default:
      Napi::Error::New(env, "SOCKOPT not implemented yet").ThrowAsJavaScriptException();
      break;
  }

  if (result == SRT_ERROR) {
    Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return empty;
  }
  return returnVal;
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

  const int fdsSetSize = EPOLL_EVENTS_NUM_MAX;
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

Napi::Value NodeSRT::SetLogLevel(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  int logLevel = info[0].As<Napi::Number>().Int32Value();

  int result;
  if (logLevel >= 0 && logLevel <= 7) {
    srt_setloglevel(logLevel);
    result = 0;
  } else {
    result = SRT_ERROR;
  }
  return Napi::Number::New(env, result);
}

Napi::Value NodeSRT::Stats(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  SRT_TRACEBSTATS stats;
  Napi::Number socketValue = info[0].As<Napi::Number>();
  Napi::Boolean clear = info[1].As<Napi::Boolean>();

  if (srt_bstats(socketValue, &stats, clear) == SRT_ERROR) {
		Napi::Error::New(env, srt_getlasterror_str()).ThrowAsJavaScriptException();
    return Napi::Number::New(env, SRT_ERROR);
	}

  Napi::Object obj = Napi::Object::New(env);

  // global measurements
  obj.Set("msTimeStamp", stats.msTimeStamp);
  obj.Set("pktSentTotal", stats.pktSentTotal);
  obj.Set("pktRecvTotal", stats.pktRecvTotal);
  obj.Set("pktSndLossTotal", stats.pktSndLossTotal);
  obj.Set("pktRcvLossTotal", stats.pktRcvLossTotal);
  obj.Set("pktRetransTotal", stats.pktRetransTotal);
  obj.Set("pktSentACKTotal", stats.pktSentACKTotal);
  obj.Set("pktRecvACKTotal", stats.pktRecvACKTotal);
  obj.Set("pktSentNAKTotal", stats.pktSentNAKTotal);
  obj.Set("pktRecvNAKTotal", stats.usSndDurationTotal);
  obj.Set("pktSndDropTotal", stats.pktSndDropTotal);
  obj.Set("pktRcvDropTotal", stats.pktRcvDropTotal);
  obj.Set("pktRcvUndecryptTotal", stats.pktRcvUndecryptTotal);
  obj.Set("byteSentTotal", stats.byteSentTotal);
  obj.Set("byteRecvTotal", stats.byteRecvTotal);
  obj.Set("byteRcvLossTotal", stats.byteRcvLossTotal);
  obj.Set("byteRetransTotal", stats.byteRetransTotal);
  obj.Set("byteSndDropTotal", stats.byteSndDropTotal);
  obj.Set("byteRcvDropTotal", stats.byteRcvDropTotal);
  obj.Set("byteRcvUndecryptTotal", stats.byteRcvUndecryptTotal);

  // local measurements
  obj.Set("pktSent", stats.pktSent);
  obj.Set("pktRecv", stats.pktRecv);
  obj.Set("pktSndLoss", stats.pktSndLoss);
  obj.Set("pktRcvLoss", stats.pktRcvLoss);
  obj.Set("pktRetrans", stats.pktRetrans);
  obj.Set("pktRcvRetrans", stats.pktRcvRetrans);
  obj.Set("pktSentACK", stats.pktSentACK);
  obj.Set("pktRecvACK", stats.pktRecvACK);
  obj.Set("pktSentNAK", stats.pktSentNAK);
  obj.Set("pktRecvNAK", stats.pktRecvNAK);
  obj.Set("mbpsSendRate", stats.mbpsSendRate);
  obj.Set("mbpsRecvRate", stats.mbpsRecvRate);
  obj.Set("usSndDuration", stats.usSndDuration);
  obj.Set("pktReorderDistance", stats.pktReorderDistance);
  obj.Set("pktRcvAvgBelatedTime", stats.pktRcvAvgBelatedTime);
  obj.Set("pktRcvBelated", stats.pktRcvBelated);
  obj.Set("pktSndDrop", stats.pktSndDrop);
  obj.Set("pktRcvDrop", stats.pktRcvDrop);
  obj.Set("pktRcvUndecrypt", stats.pktRcvUndecrypt);
  obj.Set("byteSent", stats.byteSent);
  obj.Set("byteRecv", stats.byteRecv);
  obj.Set("byteRcvLoss", stats.byteRcvLoss);
  obj.Set("byteRetrans", stats.byteRetrans);
  obj.Set("byteSndDrop", stats.byteSndDrop);
  obj.Set("byteRcvDrop", stats.byteRcvDrop);
  obj.Set("byteRcvUndecrypt", stats.byteRcvUndecrypt);

  // instant measurements
  obj.Set("usPktSndPeriod", stats.usPktSndPeriod);
  obj.Set("pktFlowWindow", stats.pktFlowWindow);
  obj.Set("pktCongestionWindow", stats.pktCongestionWindow);
  obj.Set("pktFlightSize", stats.pktFlightSize);
  obj.Set("msRTT", stats.msRTT);
  obj.Set("mbpsBandwidth", stats.mbpsBandwidth);
  obj.Set("byteAvailSndBuf", stats.byteAvailSndBuf);
  obj.Set("byteAvailRcvBuf", stats.byteAvailRcvBuf);
  obj.Set("mbpsMaxBW", stats.mbpsMaxBW);
  obj.Set("byteMSS", stats.byteMSS);
  obj.Set("pktSndBuf", stats.pktSndBuf);
  obj.Set("byteSndBuf", stats.byteSndBuf);
  obj.Set("msSndBuf", stats.msSndBuf);
  obj.Set("msSndTsbPdDelay", stats.msSndTsbPdDelay);
  obj.Set("pktRcvBuf", stats.pktRcvBuf);
  obj.Set("byteRcvBuf", stats.byteRcvBuf);
  obj.Set("msRcvBuf", stats.msRcvBuf);
  obj.Set("msRcvTsbPdDelay", stats.msRcvTsbPdDelay);
  obj.Set("pktSndFilterExtraTotal", stats.pktSndFilterExtraTotal);
  obj.Set("pktRcvFilterExtraTotal", stats.pktRcvFilterExtraTotal);
  obj.Set("pktRcvFilterSupplyTotal", stats.pktRcvFilterSupplyTotal);
  obj.Set("pktRcvFilterLossTotal", stats.pktRcvFilterLossTotal);
  obj.Set("pktSndFilterExtra", stats.pktSndFilterExtra);
  obj.Set("pktRcvFilterExtra", stats.pktRcvFilterExtra);
  obj.Set("pktRcvFilterSupply", stats.pktRcvFilterSupply);
  obj.Set("pktRcvFilterLoss", stats.pktRcvFilterLoss);
  obj.Set("pktReorderTolerance", stats.pktReorderTolerance);

  // Total
  obj.Set("pktSentUniqueTotal", stats.pktSentUniqueTotal);
  obj.Set("pktRecvUniqueTotal", stats.pktRecvUniqueTotal);
  obj.Set("byteSentUniqueTotal", stats.byteSentUniqueTotal);
  obj.Set("byteRecvUniqueTotal", stats.byteRecvUniqueTotal);

  // Local
  obj.Set("pktSentUnique", stats.pktSentUnique);
  obj.Set("pktRecvUnique", stats.pktRecvUnique);
  obj.Set("byteSentUnique", stats.byteSentUnique);
  obj.Set("byteRecvUnique", stats.byteRecvUnique);

  return obj;
}
