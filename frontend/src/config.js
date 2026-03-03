const backendUrl = import.meta.env.VITE_BACKEND_URL;

const getBaseUrl = () => {
  if (backendUrl) {
    return backendUrl.replace(/\/$/, "");
  }
  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

const getWsUrl = () => {
  const base = getBaseUrl();
  const wsProtocol = base.startsWith("https") ? "wss" : "ws";
  return base.replace(/^https?/, wsProtocol) + "/ws";
};

export const API_BASE = getBaseUrl();
export const WS_URL = getWsUrl();
