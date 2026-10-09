import { Dialog } from '../ui/Dialog';

interface Props {
  existing: { title: string; url: string };
  confirmLabel: string;
  onOpenExisting: () => void;
  onAddAnyway: () => void;
  onCancel: () => void;
}

export function DuplicateDialog({ existing, confirmLabel, onOpenExisting, onAddAnyway, onCancel }: Props) {
  return (
    <Dialog
      title="This URL already exists."
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="button button--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="button button--soft" onClick={onOpenExisting}>
            Open existing resource
          </button>
          <button type="button" className="button button--primary" onClick={onAddAnyway}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack prose">
        <p>
          You already saved this link as <strong>{existing.title}</strong>.
        </p>
        <p className="muted break">{existing.url}</p>
      </div>
    </Dialog>
  );
}
