import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LuX } from 'react-icons/lu';

export type DialogSize = 'sm' | 'md' | 'lg';

interface DialogProps {
  title: string;
  description?: string;
  size?: DialogSize;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Hides the visible title (it stays available to screen readers). */
  hideTitle?: boolean;
  /** Set false to stop every way of closing (e.g. while saving). */
  dismissible?: boolean;
  /**
   * Called before any dismissal (Escape, backdrop, close button). Return false to keep the dialog
   * open, e.g. to ask whether unsaved changes should be discarded.
   */
  onBeforeDismiss?: () => boolean;
}

const EXIT_MS = 160;

/**
 * Accessible modal built on the native <dialog> element: focus is trapped, the
 * page behind becomes inert, Escape closes it and focus returns to the opener.
 * On phones it becomes a bottom/full-screen sheet (see dialog.css).
 */
export function Dialog({
  title,
  description,
  size = 'md',
  onClose,
  children,
  footer,
  hideTitle = false,
  dismissible = true,
  onBeforeDismiss,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [closing, setClosing] = useState(false);
  const pressedOnBackdrop = useRef(false);
  const opener = useRef<HTMLElement | null>(
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useLayoutEffect(() => {
    const element = ref.current;
    if (element && !element.open) element.showModal();
  }, []);

  useEffect(() => {
    const previous = opener.current;
    return () => {
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  const requestClose = useCallback(() => {
    if (!dismissible || closing) return;
    if (onBeforeDismiss && !onBeforeDismiss()) return;
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }, [closing, dismissible, onBeforeDismiss, onClose]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${size}${closing ? ' is-closing' : ''}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === ref.current;
      }}
      onClick={(event) => {
        if (event.target === ref.current && pressedOnBackdrop.current) requestClose();
      }}
    >
      <div className="dialog__panel glass-strong">
        <header className="dialog__header">
          <h2 id={titleId} className={hideTitle ? 'visually-hidden' : 'dialog__title'}>
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="dialog__description">
              {description}
            </p>
          ) : null}
          <button
            type="button"
            className="icon-button dialog__close"
            aria-label="Close"
            onClick={requestClose}
            disabled={!dismissible}
          >
            <LuX className="icon" size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="dialog__body">{children}</div>
        {footer ? <footer className="dialog__footer">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
