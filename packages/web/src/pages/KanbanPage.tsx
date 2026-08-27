import React, { useEffect, useState } from 'react';
import type { KanbanColumn, KanbanCard, RouteTab } from '../types';
import {
  fetchKanban,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  createKanbanCard,
  updateKanbanCard,
  deleteKanbanCard,
  reorderKanban,
} from '../api';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/AlertDialog';
import { DatePicker } from '../components/DatePicker';
import {

  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  GripVertical,
} from 'lucide-react';

interface KanbanPageProps {
  onNavigate: (tab: RouteTab) => void;
}

// Kanban Card Item component
const SortableCard: React.FC<{
  card: KanbanCard;
  onEdit: (card: KanbanCard) => void;
  onDelete: (card: KanbanCard) => void;
}> = ({ card, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: 'card', card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue = card.dueDate && card.dueDate < todayStr;

  const getTagDotColor = (tag?: string | null) => {
    if (!tag) return 'bg-ink-soft';
    const lower = tag.toLowerCase();
    if (lower.includes('bug') || lower.includes('urgent') || lower.includes('high')) return 'bg-stamp-red';
    if (lower.includes('feature') || lower.includes('dev')) return 'bg-ledger-blue';
    if (lower.includes('work') || lower.includes('task')) return 'bg-amber-600';
    if (lower.includes('life') || lower.includes('personal')) return 'bg-emerald-600';
    return 'bg-ink-soft';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 bg-card border border-rule rounded-[3px] text-ink cursor-grab active:cursor-grabbing hover:border-ink-soft/60 transition-colors group relative"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug line-clamp-2">{card.title}</div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onEdit(card)}
            className="p-1 text-ink-soft hover:text-ink"
            title="Edit card"
            aria-label={`Edit task "${card.title}"`}
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDelete(card)}
            className="p-1 text-ink-soft hover:text-stamp-red"
            title="Delete card"
            aria-label={`Delete task "${card.title}"`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {card.description && (
        <p className="text-xs text-ink-soft line-clamp-2 mt-1 font-sans">{card.description}</p>
      )}

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-rule/50 text-[11px] font-mono">
        {/* Tag shown as small colored dot (Design §4) */}
        <div className="flex items-center gap-1.5 text-ink-soft">
          {card.tag && (
            <>
              <span className={`w-2 h-2 rounded-full ${getTagDotColor(card.tag)}`} />
              <span>{card.tag}</span>
            </>
          )}
        </div>

        {/* Due date in JetBrains Mono, stamp-red if overdue */}
        {card.dueDate && (
          <span
            className={`px-1.5 py-0.5 rounded-[2px] ${
              isOverdue
                ? 'bg-stamp-light text-stamp-red font-semibold'
                : 'text-ink-soft'
            }`}
          >
            {card.dueDate}
          </span>
        )}
      </div>
    </div>
  );
};

export const KanbanPage: React.FC<KanbanPageProps> = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit Card Modal
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [cardTitle, setCardTitle] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardDueDate, setCardDueDate] = useState('');
  const [cardTag, setCardTag] = useState('');
  const [targetColumnId, setTargetColumnId] = useState('');

  // Add/Edit Column Modal
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [colName, setColName] = useState('');
  const [editingCol, setEditingCol] = useState<KanbanColumn | null>(null);

  // Confirm delete states
  const [colToDelete, setColToDelete] = useState<{ id: string; name: string } | null>(null);
  const [cardToDelete, setCardToDelete] = useState<{ id: string; title: string } | null>(null);

  const [activeDragCard, setActiveDragCard] = useState<KanbanCard | null>(null);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchKanban();
      setColumns(res.columns);
      setCards(res.cards);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Drag Start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    if (card) setActiveDragCard(card);
  };

  // Handle Drag Over (cross-column movement)
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeCard = cards.find((c) => c.id === activeId);
    if (!activeCard) return;

    // Check if over a column or another card
    const isOverColumn = columns.some((col) => col.id === overId);
    const overCard = cards.find((c) => c.id === overId);

    const targetColId = isOverColumn ? (overId as string) : overCard ? overCard.columnId : activeCard.columnId;

    if (activeCard.columnId !== targetColId) {
      setCards((prev) => {
        return prev.map((c) => (c.id === activeId ? { ...c, columnId: targetColId } : c));
      });
    }
  };

  // Handle Drag End
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragCard(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCard = cards.find((c) => c.id === activeId);
    if (!activeCard) return;

    const isOverColumn = columns.some((col) => col.id === overId);
    const overCard = cards.find((c) => c.id === overId);
    const targetColId = isOverColumn ? overId : overCard ? overCard.columnId : activeCard.columnId;

    // Reorder cards array
    const newCards = [...cards];
    const oldIndex = newCards.findIndex((c) => c.id === activeId);
    let newIndex = overCard ? newCards.findIndex((c) => c.id === overId) : newCards.length - 1;

    if (oldIndex !== -1 && newIndex !== -1) {
      const [moved] = newCards.splice(oldIndex, 1);
      moved.columnId = targetColId;
      newCards.splice(newIndex, 0, moved);

      // Re-index positions within columns
      const updatedCards = newCards.map((c, idx) => ({ ...c, position: idx }));
      setCards(updatedCards);

      // Optimistic write-through to DB
      try {
        await reorderKanban({ cards: updatedCards });
      } catch (err) {
        console.error('Failed to persist reorder', err);
        loadData();
      }
    }
  };

  // Open modal to add card
  const openAddCardModal = (columnId: string) => {
    setEditingCard(null);
    setCardTitle('');
    setCardDesc('');
    setCardDueDate('');
    setCardTag('');
    setTargetColumnId(columnId);
    setIsCardModalOpen(true);
  };

  // Open modal to edit card
  const openEditCardModal = (card: KanbanCard) => {
    setEditingCard(card);
    setCardTitle(card.title);
    setCardDesc(card.description || '');
    setCardDueDate(card.dueDate || '');
    setCardTag(card.tag || '');
    setTargetColumnId(card.columnId);
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardTitle.trim()) return;

    try {
      if (editingCard) {
        await updateKanbanCard(editingCard.id, {
          title: cardTitle.trim(),
          description: cardDesc.trim() || null,
          dueDate: cardDueDate.trim() || null,
          tag: cardTag.trim() || null,
          columnId: targetColumnId,
        });
      } else {
        await createKanbanCard({
          columnId: targetColumnId,
          title: cardTitle.trim(),
          description: cardDesc.trim() || '',
          dueDate: cardDueDate.trim() || null,
          tag: cardTag.trim() || null,
        });
      }
      setIsCardModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCard = (card: KanbanCard) => {
    setCardToDelete({ id: card.id, title: card.title });
  };

  const handleConfirmDeleteCard = async () => {
    if (!cardToDelete) return;
    try {
      await deleteKanbanCard(cardToDelete.id);
      setCards((prev) => prev.filter((c) => c.id !== cardToDelete.id));
      setCardToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim()) return;

    try {
      if (editingCol) {
        await updateKanbanColumn(editingCol.id, { name: colName.trim() });
      } else {
        await createKanbanColumn(colName.trim());
      }
      setIsColModalOpen(false);
      setColName('');
      setEditingCol(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteColumn = (id: string, name: string) => {
    setColToDelete({ id, name });
  };

  const handleConfirmDeleteColumn = async () => {
    if (!colToDelete) return;
    try {
      await deleteKanbanColumn(colToDelete.id);
      setColToDelete(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };


  return (
    <div className="space-y-6">
      <Header title="Kanban" subtitle="Personal task ledger & work board">
        <button
          onClick={() => {
            setEditingCol(null);
            setColName('');
            setIsColModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-rule hover:border-ink-soft rounded text-xs font-mono text-ink transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Column</span>
        </button>
      </Header>

      {loading ? (
        <div className="py-16 text-center text-xs font-mono text-ink-soft animate-pulse">
          Loading board...
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px]">
            {columns.map((col) => {
              const columnCards = cards
                .filter((c) => c.columnId === col.id)
                .sort((a, b) => a.position - b.position);

              return (
                <div
                  key={col.id}
                  className="w-80 flex-shrink-0 bg-paper border border-rule rounded-[4px] flex flex-col max-h-[calc(100vh-210px)]"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-rule flex items-center justify-between bg-card/60 rounded-t-[4px]">
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif font-semibold text-sm text-ink">{col.name}</h2>
                      <span className="text-xs font-mono text-ink-soft bg-paper px-1.5 py-0.5 rounded border border-rule">
                        {columnCards.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openAddCardModal(col.id)}
                        className="p-1 text-ink-soft hover:text-ink hover:bg-paper rounded transition-colors"
                        title="Add card to column"
                        aria-label={`Add task to "${col.name}" column`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCol(col);
                          setColName(col.name);
                          setIsColModalOpen(true);
                        }}
                        className="p-1 text-ink-soft hover:text-ink hover:bg-paper rounded transition-colors"
                        title="Rename column"
                        aria-label={`Rename "${col.name}" column`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {columns.length > 1 && (
                        <button
                          onClick={() => handleDeleteColumn(col.id, col.name)}
                          className="p-1 text-ink-soft hover:text-stamp-red hover:bg-paper rounded transition-colors"
                          title="Delete column"
                          aria-label={`Delete "${col.name}" column`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                    </div>
                  </div>

                  {/* Column Cards Drop Area */}
                  <SortableContext
                    id={col.id}
                    items={columnCards.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="p-3 space-y-2.5 overflow-y-auto flex-1 min-h-[120px]">
                      {columnCards.map((card) => (
                        <SortableCard
                          key={card.id}
                          card={card}
                          onEdit={openEditCardModal}
                          onDelete={handleDeleteCard}
                        />
                      ))}
                      {columnCards.length === 0 && (
                        <div
                          onClick={() => openAddCardModal(col.id)}
                          className="p-4 border border-dashed border-rule rounded-[3px] text-center text-xs text-ink-soft cursor-pointer hover:border-ink-soft hover:text-ink transition-colors"
                        >
                          + Add card
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeDragCard ? (
              <div className="p-3 bg-card border-2 border-ledger-blue rounded-[3px] shadow-sm text-ink opacity-95">
                <div className="text-sm font-medium">{activeDragCard.title}</div>
                {activeDragCard.tag && (
                  <div className="text-[11px] font-mono text-ink-soft mt-1">
                    {activeDragCard.tag}
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Card Modal */}
      <Modal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        title={editingCard ? 'Edit Card' : 'Add Card'}
      >
        <form onSubmit={handleSaveCard} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Finish client proposal"
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Add details, links, or notes..."
              value={cardDesc}
              onChange={(e) => setCardDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 items-start">
            <div>
              <DatePicker
                label="Due Date"
                value={cardDueDate}
                onChange={(str) => setCardDueDate(str)}
                isClearable
                aria-label="Card due date"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1">Tag / Label</label>
              <input
                type="text"
                placeholder="e.g. Work, Urgent, Bug"
                value={cardTag}
                onChange={(e) => setCardTag(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-paper border border-rule/90 rounded-md focus:bg-card focus:border-ledger-blue focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Column</label>
            <select
              value={targetColumnId}
              onChange={(e) => setTargetColumnId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-rule">
            <button
              type="button"
              onClick={() => setIsCardModalOpen(false)}
              className="px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover"
            >
              {editingCard ? 'Update Card' : 'Add Card'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Column Modal */}
      <Modal
        isOpen={isColModalOpen}
        onClose={() => setIsColModalOpen(false)}
        title={editingCol ? 'Rename Column' : 'New Column'}
      >
        <form onSubmit={handleSaveColumn} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Column Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Review, Icebox"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-rule">
            <button
              type="button"
              onClick={() => setIsColModalOpen(false)}
              className="px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover"
            >
              {editingCol ? 'Rename' : 'Create Column'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Column Deletion */}
      <ConfirmDialog
        isOpen={colToDelete !== null}
        onClose={() => setColToDelete(null)}
        onConfirm={handleConfirmDeleteColumn}
        title="Delete Kanban Column?"
        description={
          colToDelete
            ? `Are you sure you want to delete the column "${colToDelete.name}" and all cards inside it? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Column"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Confirmation Dialog for Card Deletion */}
      <ConfirmDialog
        isOpen={cardToDelete !== null}
        onClose={() => setCardToDelete(null)}
        onConfirm={handleConfirmDeleteCard}
        title="Delete Task Card?"
        description={
          cardToDelete
            ? `Are you sure you want to delete the task "${cardToDelete.title}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Task"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

