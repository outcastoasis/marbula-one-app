import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ToastContainer from "../components/ToastContainer";
import "../styles/Toast.css";

const DEFAULT_DURATION = 4000;
const EXIT_DURATION = 180;
const SUPPORTED_TYPES = new Set(["success", "error", "info"]);

const ToastContext = createContext(null);

function createToast(type, message, duration) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    message,
    duration,
    isLeaving: false,
  };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastsRef = useRef([]);
  const autoTimeoutIdsRef = useRef(new Map());
  const exitTimeoutIdsRef = useRef(new Map());

  const removeToastImmediately = useCallback((toastId) => {
    const autoTimeoutId = autoTimeoutIdsRef.current.get(toastId);
    if (autoTimeoutId) {
      window.clearTimeout(autoTimeoutId);
      autoTimeoutIdsRef.current.delete(toastId);
    }

    const exitTimeoutId = exitTimeoutIdsRef.current.get(toastId);
    if (exitTimeoutId) {
      window.clearTimeout(exitTimeoutId);
      exitTimeoutIdsRef.current.delete(toastId);
    }

    setToasts((previousToasts) =>
      previousToasts.filter((toast) => toast.id !== toastId),
    );
  }, []);

  const removeToast = useCallback(
    (toastId) => {
      const autoTimeoutId = autoTimeoutIdsRef.current.get(toastId);
      if (autoTimeoutId) {
        window.clearTimeout(autoTimeoutId);
        autoTimeoutIdsRef.current.delete(toastId);
      }

      const currentToast = toastsRef.current.find((toast) => toast.id === toastId);
      if (!currentToast || currentToast.isLeaving) {
        return;
      }

      if (exitTimeoutIdsRef.current.has(toastId)) {
        return;
      }

      setToasts((previousToasts) => {
        return previousToasts.map((toast) => {
          if (toast.id !== toastId) {
            return toast;
          }

          return { ...toast, isLeaving: true };
        });
      });

      const exitTimeoutId = window.setTimeout(() => {
        removeToastImmediately(toastId);
      }, EXIT_DURATION);
      exitTimeoutIdsRef.current.set(toastId, exitTimeoutId);
    },
    [removeToastImmediately],
  );

  const showToast = useCallback(
    (type, message, options = {}) => {
      if (typeof message !== "string" || message.trim().length === 0) {
        return null;
      }

      const normalizedType = SUPPORTED_TYPES.has(type) ? type : "info";
      const normalizedDuration =
        Number.isFinite(options.duration) && options.duration >= 0
          ? options.duration
          : DEFAULT_DURATION;
      const toast = createToast(normalizedType, message.trim(), normalizedDuration);

      setToasts((previousToasts) => [...previousToasts, toast]);

      if (normalizedDuration > 0) {
        const timeoutId = window.setTimeout(() => {
          removeToast(toast.id);
        }, normalizedDuration);
        autoTimeoutIdsRef.current.set(toast.id, timeoutId);
      }

      return toast.id;
    },
    [removeToast],
  );

  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  useEffect(() => {
    const autoTimeoutIds = autoTimeoutIdsRef.current;
    const exitTimeoutIds = exitTimeoutIdsRef.current;

    return () => {
      autoTimeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      autoTimeoutIds.clear();

      exitTimeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      exitTimeoutIds.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      removeToast,
      success: (message, options) => showToast("success", message, options),
      error: (message, options) => showToast("error", message, options),
      info: (message, options) => showToast("info", message, options),
    }),
    [removeToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast muss innerhalb des ToastProvider verwendet werden.");
  }
  return context;
}
