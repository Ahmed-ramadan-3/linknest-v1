import { useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  danger?: boolean;
  /** Require typing this exact word before confirming (for irreversible actions). */
  requireText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel,
  danger = false,
  requireText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const allowed = !requireText || typed.trim() === requireText;

  const confirm = async () => {
    if (!allowed || busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={title}
      size="sm"
      onClose={onCancel}
      dismissible={!busy}
      footer={
        <>
          <button type="button" className="button button--ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            type="button"
            className={`button ${danger ? 'button--danger' : 'button--primary'}`}
            onClick={confirm}
            disabled={!allowed || busy}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="prose">{children}</div>
        {requireText ? (
          <label className="field">
            <span className="field__label">
              {t('settings.typeToConfirm', { word: '\u0000' }).split('\u0000').map((part, index) => (
                <span key={index}>
                  {index > 0 ? <strong>{requireText}</strong> : null}
                  {part}
                </span>
              ))}
            </span>
            <input
              className="input"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </label>
        ) : null}
      </div>
    </Dialog>
  );
}
