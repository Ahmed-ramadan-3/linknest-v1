import { describeStorageError } from '../../data/db';
import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { useToast } from '../../hooks/useToast';
import { pluralize } from '../../lib/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/** Deleting a category never deletes resources: they move up one level (or become uncategorized). */
export function DeleteCategoryDialog({ id }: { id: string }) {
  const { categories, categoryById, counts, deleteCategory } = useLibrary();
  const { closeModal, navigate, route } = useAppUi();
  const toast = useToast();
  const category = categoryById.get(id);

  if (!category) {
    return (
      <ConfirmDialog title="Category not found" confirmLabel="Close" onCancel={closeModal} onConfirm={closeModal}>
        <p>This category has already been removed.</p>
      </ConfirmDialog>
    );
  }

  const parent = category.parentId ? categoryById.get(category.parentId) : undefined;
  const subcategories = categories.filter((c) => c.parentId === id).length;
  const direct = counts.direct.get(id) ?? 0;
  const destination = parent ? `“${parent.name}”` : 'Uncategorized (visible in All Resources)';

  return (
    <ConfirmDialog
      title={`Delete “${category.name}”?`}
      confirmLabel="Delete category"
      danger
      onCancel={closeModal}
      onConfirm={async () => {
        try {
          await deleteCategory({ id, childrenGoTo: parent?.id ?? null, resourcesGoTo: parent?.id ?? null });
          toast.success('Category deleted');
          closeModal();
          if (route.name === 'category' && route.id === id) {
            navigate(parent ? { name: 'category', id: parent.id } : { name: 'home' });
          }
        } catch (error) {
          toast.error(describeStorageError(error));
        }
      }}
    >
      <p>
        Your resources are kept.{' '}
        {direct > 0 ? `${pluralize(direct, 'resource')} will move to ${destination}. ` : ''}
        {subcategories > 0 ? `${pluralize(subcategories, 'subcategory', 'subcategories')} will move up to ${destination}.` : ''}
        {direct === 0 && subcategories === 0 ? 'This category is empty.' : ''}
      </p>
    </ConfirmDialog>
  );
}
