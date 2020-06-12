#include <napi.h>

class NodeSRT : public Napi::ObjectWrap<NodeSRT> {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    NodeSRT(const Napi::CallbackInfo& info);

  private:
    static Napi::FunctionReference constructor;
    Napi::Value Hello(const Napi::CallbackInfo& info);
};