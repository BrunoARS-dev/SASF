"use client";

import { useEffect, useRef } from "react";

export function SuccessAlert({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timeout);
  }, [onDismiss]);

  return (
    <div className="success-alert" role="status" aria-live="polite">
      <SuccessIcon />
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Fechar aviso">
        ×
      </button>
    </div>
  );
}

export function ConfirmationAlert({
  open,
  title,
  description,
  confirmLabel = "Confirmar exclusão",
  loadingLabel = "Excluindo...",
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onCancel();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [loading, onCancel, open]);

  if (!open) return null;

  return (
    <div
      className="confirmation-alert-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="confirmation-alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-alert-title"
        aria-describedby="confirmation-alert-description"
      >
        <div className="confirmation-alert-icon" aria-hidden="true">
          <TrashIcon />
        </div>
        <div>
          <h2 id="confirmation-alert-title">{title}</h2>
          <p id="confirmation-alert-description">{description}</p>
        </div>
        <div className="confirmation-alert-actions">
          <button className="secondary-button" disabled={loading} type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            ref={confirmButtonRef}
            className="danger-button"
            disabled={loading}
            type="button"
            onClick={onConfirm}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
