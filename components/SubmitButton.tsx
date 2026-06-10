"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/Toast";

/**
 * Submit button for `<form action={serverAction}>` forms: pending label while
 * running, success toast on finish, optional confirm() for destructive paths.
 * Must live inside a form (reads useFormStatus).
 */
export function SubmitButton({
  children,
  className,
  savedToast = "Saved",
  pendingLabel,
  confirmMessage,
  closeDetailsOnDone = false,
}: {
  children: React.ReactNode;
  className?: string;
  savedToast?: string;
  pendingLabel?: string;
  /** If set, asks "are you sure?" before submitting — for destructive actions. */
  confirmMessage?: string;
  /** Collapse the enclosing <details> once the save finishes. */
  closeDetailsOnDone?: boolean;
}) {
  const { pending } = useFormStatus();
  const toast = useToast();
  const wasPending = useRef(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const was = wasPending.current;
    wasPending.current = pending;
    if (was && !pending) {
      toast(savedToast);
      if (closeDetailsOnDone) {
        const details = ref.current?.closest("details");
        if (details) details.open = false;
      }
    }
  }, [pending, toast, savedToast, closeDetailsOnDone]);

  return (
    <button
      ref={ref}
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
      className={`${className ?? ""} disabled:opacity-60`}
    >
      {pending ? pendingLabel ?? children : children}
    </button>
  );
}
