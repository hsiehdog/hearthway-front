"use client";

import * as React from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function Dialog({ open, onClose, children }: DialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl border border-muted bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
