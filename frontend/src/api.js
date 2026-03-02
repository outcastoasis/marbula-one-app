import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
});

const API_NETWORK_EVENT = "api-network-state";
const SLOW_REQUEST_THRESHOLD_MS = 1200;

let nextRequestId = 0;
let pendingRequestCount = 0;
const slowRequestIds = new Set();
const slowRequestTimers = new Map();

const emitNetworkState = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(API_NETWORK_EVENT, {
      detail: {
        pendingRequestCount,
        hasSlowRequest: slowRequestIds.size > 0,
      },
    }),
  );
};

const finishTrackedRequest = (requestId) => {
  if (requestId == null) {
    pendingRequestCount = Math.max(0, pendingRequestCount - 1);
    emitNetworkState();
    return;
  }

  const timer = slowRequestTimers.get(requestId);
  if (timer) {
    clearTimeout(timer);
    slowRequestTimers.delete(requestId);
  }

  slowRequestIds.delete(requestId);
  pendingRequestCount = Math.max(0, pendingRequestCount - 1);
  emitNetworkState();
};

API.interceptors.request.use((config) => {
  const requestId = ++nextRequestId;
  const token = localStorage.getItem("token");

  if (token) config.headers.Authorization = `Bearer ${token}`;

  config.metadata = {
    ...(config.metadata || {}),
    requestId,
  };

  pendingRequestCount += 1;
  emitNetworkState();

  const slowTimer = setTimeout(() => {
    slowRequestIds.add(requestId);
    emitNetworkState();
  }, SLOW_REQUEST_THRESHOLD_MS);

  slowRequestTimers.set(requestId, slowTimer);

  return config;
});

API.interceptors.response.use(
  (response) => {
    const requestId = response?.config?.metadata?.requestId;
    finishTrackedRequest(requestId);
    return response;
  },
  (error) => {
    const requestId = error?.config?.metadata?.requestId;
    finishTrackedRequest(requestId);
    return Promise.reject(error);
  },
);

export { API_NETWORK_EVENT };
export default API;
