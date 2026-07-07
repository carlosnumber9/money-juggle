export type CallbackParams = {
  state: string | null;
  code: string | null;
  providerError: string | null;
  providerErrorDescription: string | null;
};

export function getCallbackParams(requestUrl: URL): CallbackParams {
  return {
    state: requestUrl.searchParams.get("state"),
    code: requestUrl.searchParams.get("code"),
    providerError: requestUrl.searchParams.get("error"),
    providerErrorDescription: requestUrl.searchParams.get("error_description")
  };
}
