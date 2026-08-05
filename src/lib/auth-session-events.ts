export const TOKULY_UNAUTHORIZED_EVENT = "tokuly:unauthorized";

export function notifyTokulyUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TOKULY_UNAUTHORIZED_EVENT));
  }
}
