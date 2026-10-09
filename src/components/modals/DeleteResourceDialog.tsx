import { describeStorageError } from '../../data/db';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export function DeleteResourceDialog({ id }: { id: string }) {
  const { resources, deleteResource } = useLibrary();
  const { closeModal } = useAppUi();
  const toast = useToast();
  const resource = resources.find((item) => item.id === id);

  return (
    <ConfirmDialog
      title="Delete this resource?"
      confirmLabel="Delete"
      danger
      onCancel={closeModal}
      onConfirm={async () => {
        try {
          await deleteResource(id);
          toast.success('Resource deleted');
          closeModal();
        } catch (error) {
          toast.error(describeStorageError(error));
        }
      }}
    >
      {resource ? (
        <p>
          <strong>{resource.title}</strong> will be removed from this browser. This cannot be undone, but you can
          restore it from a backup if you exported one.
        </p>
      ) : (
        <p>This resource has already been removed.</p>
      )}
    </ConfirmDialog>
  );
}
