import React from "react";

export function StartTourButton({ label = "Start Tour", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="px-3 py-1.5 rounded-lg border text-xs">
      {label}
    </button>
  );
}

export default StartTourButton;
