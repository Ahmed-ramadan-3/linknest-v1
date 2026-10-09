import { useAppUi } from '../../hooks/useAppUi';
import { useLibrary } from '../../hooks/useLibrary';
import { SettingsDialog } from '../settings/SettingsDialog';
import { CategoryDialog } from './CategoryDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { DeleteResourceDialog } from './DeleteResourceDialog';
import { ResourceDetailDialog } from './ResourceDetailDialog';
import { ResourceFormDialog } from './ResourceFormDialog';

/** Renders whichever dialog the UI state asks for. Keyed so each open starts fresh. */
export function ModalHost() {
  const { modal } = useAppUi();
  const { resources } = useLibrary();

  switch (modal.kind) {
    case 'add':
      return <ResourceFormDialog key="add" mode="create" initialType={modal.type} initialCategoryId={modal.categoryId} />;
    case 'edit': {
      const resource = resources.find((item) => item.id === modal.id);
      return resource ? <ResourceFormDialog key={`edit-${modal.id}`} mode="edit" resource={resource} /> : null;
    }
    case 'detail':
      return <ResourceDetailDialog key={`detail-${modal.id}`} id={modal.id} />;
    case 'deleteResource':
      return <DeleteResourceDialog key={`del-${modal.id}`} id={modal.id} />;
    case 'category':
      return modal.mode === 'create' ? (
        <CategoryDialog key={`cat-new-${modal.parentId ?? 'root'}`} mode="create" parentId={modal.parentId} />
      ) : (
        <CategoryDialog key={`cat-${modal.id}`} mode="edit" id={modal.id} />
      );
    case 'deleteCategory':
      return <DeleteCategoryDialog key={`delcat-${modal.id}`} id={modal.id} />;
    case 'settings':
      return <SettingsDialog key="settings" />;
    default:
      return null;
  }
}
