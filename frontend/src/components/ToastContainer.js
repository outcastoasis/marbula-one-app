const TOAST_TITLES = {
  success: "Erfolg",
  error: "Fehler",
  info: "Info",
};

export default function ToastContainer({ toasts, onDismiss }) {
  if (!Array.isArray(toasts) || toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const title = TOAST_TITLES[toast.type] || TOAST_TITLES.info;
        const role = toast.type === "error" ? "alert" : "status";
        const leavingClassName = toast.isLeaving ? " toast-leaving" : "";

        return (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type}${leavingClassName}`}
            role={role}
          >
            <div className="toast-content">
              <span className="toast-title">{title}</span>
              <span className="toast-message">{toast.message}</span>
            </div>
            <button
              type="button"
              className="toast-close"
              aria-label="Toast schließen"
              onClick={() => onDismiss(toast.id)}
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}
