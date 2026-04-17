import { useState } from "react";

type ToastProps = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = (props: ToastProps) => {
    // Simple alert-based toast for now
    // In production, this would use a proper toast library
    if (props.variant === "destructive") {
      alert(`❌ ${props.title}${props.description ? `\n${props.description}` : ""}`);
    } else {
      alert(`✅ ${props.title}${props.description ? `\n${props.description}` : ""}`);
    }
  };

  return { toast, toasts };
}
