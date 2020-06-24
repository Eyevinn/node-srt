#include <napi.h>

class NodeSRT : public Napi::ObjectWrap<NodeSRT> {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    NodeSRT(const Napi::CallbackInfo& info);
    ~NodeSRT();

  private:
    static Napi::FunctionReference constructor;
    Napi::Value CreateSocket(const Napi::CallbackInfo& info);
    Napi::Value Bind(const Napi::CallbackInfo& info);
    Napi::Value Listen(const Napi::CallbackInfo& info);
    Napi::Value Connect(const Napi::CallbackInfo& info);
    Napi::Value Accept(const Napi::CallbackInfo& info);
    Napi::Value Close(const Napi::CallbackInfo& info);
    Napi::Value Read(const Napi::CallbackInfo& info);
    Napi::Value Write(const Napi::CallbackInfo& info);
    Napi::Value SetSockOpt(const Napi::CallbackInfo& info);
    Napi::Value GetSockOpt(const Napi::CallbackInfo& info);
};
