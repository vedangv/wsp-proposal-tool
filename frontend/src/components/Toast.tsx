import { useToast } from "../hooks/useToast";

const TYPE_STYLES = {
  error: "bg-red-50 border-red-300 text-red-800",
  success: "bg-emerald-50 border-emerald-300 text-emerald-800",
  info: "bg-blue-50 border-blue-300 text-blue-800",
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-4 py-3 border text-sm font-body shadow-lg animate-[slideIn_0.2s_ease-out] flex items-start gap-2 ${TYPE_STYLES[toast.type]}`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-50 hover:opacity-100 text-xs font-bold"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
