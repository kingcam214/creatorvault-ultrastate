import React from "react";

type StartTourButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  tourId?: string;
  variant?: "pill" | "default" | string;
};

export function StartTourButton({ label = "Start Tour", tourId, variant = "default", className = "", ...buttonProps }: StartTourButtonProps) {
  const variantClass = variant === "pill"
    ? "rounded-full border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-4 py-2 text-[var(--accent-cyan)] hover:bg-[var(--bg-elevated)]"
    : "rounded-lg border px-3 py-1.5";

  return (
    <button
      type="button"
      data-tour-id={tourId}
      className={`${variantClass} ${className} text-xs font-semibold transition`}
      {...buttonProps}
    >
      {label}
    </button>
  );
}

export default StartTourButton;
