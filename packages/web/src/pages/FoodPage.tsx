import React, { useEffect, useState } from 'react';
import type { FoodEntry, FoodGroupedResponse, RouteTab } from '../types';
import {
  fetchFood,
  addFoodEntry,
  updateFoodEntry,
  deleteFoodEntry,
  fetchFoodStats,
} from '../api';
import { Header } from '../components/Header';
import { DotLedger } from '../components/DotLedger';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/AlertDialog';
import {
  Utensils,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Coffee,
  Sun,
  Moon,
  Cookie,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Check,
} from 'lucide-react';

interface FoodPageProps {
  onNavigate: (tab: RouteTab) => void;
}

export const FoodPage: React.FC<FoodPageProps> = () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [groupedFood, setGroupedFood] = useState<FoodGroupedResponse>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
    all: [],
  });
  const [historyMap, setHistoryMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<FoodEntry | null>(null);


  // Quick Inline Add state
  const [newItemName, setNewItemName] = useState('');
  const [newMealTag, setNewMealTag] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [newStatus, setNewStatus] = useState<'eaten' | 'want'>('eaten');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async (date: string) => {
    try {
      setLoading(true);
      const [foodRes, statsRes] = await Promise.all([fetchFood(date), fetchFoodStats()]);
      setGroupedFood(foodRes);
      setHistoryMap(statsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  // Generate 30-day dot ledger array
  const days30: { date: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    days30.push({ date: dStr, value: historyMap[dStr] || 0 });
  }

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      setIsSubmitting(true);
      await addFoodEntry({
        itemName: newItemName.trim(),
        mealTag: newMealTag,
        status: newStatus,
        loggedAt: selectedDate,
      });
      setNewItemName('');
      loadData(selectedDate);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: FoodEntry) => {
    const nextStatus = item.status === 'eaten' ? 'want' : 'eaten';
    try {
      await updateFoodEntry(item.id, { status: nextStatus });
      loadData(selectedDate);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = (item: FoodEntry) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteFoodEntry(itemToDelete.id);
      setItemToDelete(null);
      loadData(selectedDate);
    } catch (err) {
      console.error(err);
    }
  };


  const jumpDay = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const MEAL_SECTIONS: { tag: 'breakfast' | 'lunch' | 'dinner' | 'snack'; label: string; icon: any }[] = [
    { tag: 'breakfast', label: 'Breakfast', icon: Coffee },
    { tag: 'lunch', label: 'Lunch', icon: Sun },
    { tag: 'dinner', label: 'Dinner', icon: Moon },
    { tag: 'snack', label: 'Snacks & Drinks', icon: Cookie },
  ];

  const totalEaten = groupedFood.all.filter((f) => f.status === 'eaten').length;
  const totalWant = groupedFood.all.filter((f) => f.status === 'want').length;

  return (
    <div className="space-y-6">
      <Header
        title="Food Log"
        subtitle="Daily meal tracker with meal categories & status"
        dotLedgerData={days30}
        dotLedgerUnit="items"
      >
        <div className="flex items-center gap-2">
          {selectedDate !== todayStr && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-3 py-1 bg-card border border-rule hover:border-ink-soft rounded-[4px] text-xs font-mono text-ink active:scale-95 transition-all shadow-xs"
            >
              Today
            </button>
          )}
        </div>
      </Header>

      {/* Date Navigation & Summary Strip */}
      <div className="ledger-card p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1">
            <button
              onClick={() => jumpDay(-1)}
              className="p-2 sm:p-1.5 rounded-[4px] hover:bg-paper text-ink-soft hover:text-ink active:scale-95 transition-all border border-rule/50"
              title="Previous Day"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => jumpDay(1)}
              className="p-2 sm:p-1.5 rounded-[4px] hover:bg-paper text-ink-soft hover:text-ink active:scale-95 transition-all border border-rule/50"
              title="Next Day"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-paper border border-rule/80 rounded-[4px] text-xs font-mono text-ink focus:bg-card focus:outline-none"
          />
        </div>

        <div className="font-serif text-base font-semibold text-ink text-center">
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-ink-soft">
          <span className="bg-ledger-light/80 text-ledger-blue px-2 py-0.5 rounded font-semibold">
            {totalEaten} eaten
          </span>
          {totalWant > 0 && (
            <span className="bg-paper border border-rule px-2 py-0.5 rounded">
              {totalWant} planned
            </span>
          )}
          <span>• {groupedFood.all.length} total</span>
        </div>
      </div>

      {/* Responsive Quick Add Form */}
      <div className="ledger-card p-4 sm:p-5">
        <h2 className="font-serif text-sm font-semibold text-ink mb-3 flex items-center gap-2">
          <Utensils className="w-4 h-4 text-ledger-blue" />
          <span>Log a Meal or Snack</span>
        </h2>

        <form onSubmit={handleAddFood} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              placeholder="e.g. Avocado sourdough toast with poached eggs..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-sm bg-paper border border-rule rounded-[4px] focus:bg-card focus:outline-none"
              autoFocus
            />

            <button
              type="submit"
              disabled={isSubmitting || !newItemName.trim()}
              className="w-full sm:w-auto px-5 py-2.5 bg-ledger-blue text-paper text-xs font-medium rounded-[4px] hover:bg-ledger-hover active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Log Item</span>
            </button>
          </div>

          {/* Quick Select Category & Status Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            {/* Meal Category selection */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-mono text-ink-soft mr-1">Meal:</span>
              {MEAL_SECTIONS.map(({ tag, label }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setNewMealTag(tag)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-[3px] transition-all whitespace-nowrap ${
                    newMealTag === tag
                      ? 'bg-ledger-light text-ledger-blue font-semibold border border-ledger-blue/40 shadow-xs'
                      : 'bg-paper text-ink-soft hover:text-ink border border-rule'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-ink-soft mr-1">Status:</span>
              <button
                type="button"
                onClick={() => setNewStatus('eaten')}
                className={`px-2.5 py-1 text-xs rounded-[3px] font-medium transition-all ${
                  newStatus === 'eaten'
                    ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                    : 'bg-paper text-ink-soft hover:text-ink border border-rule'
                }`}
              >
                Eaten
              </button>
              <button
                type="button"
                onClick={() => setNewStatus('want')}
                className={`px-2.5 py-1 text-xs rounded-[3px] font-medium transition-all ${
                  newStatus === 'want'
                    ? 'bg-ledger-blue text-paper font-semibold shadow-xs'
                    : 'bg-paper text-ink-soft hover:text-ink border border-rule'
                }`}
              >
                Want to Eat
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Responsive Meal Category Cards Grid (1 col mobile, 2 col tablet, 4 col desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {MEAL_SECTIONS.map(({ tag, label, icon: Icon }) => {
          const items = groupedFood[tag];
          return (
            <div key={tag} className="ledger-card p-4 flex flex-col justify-between hover:border-ink-soft/60 transition-all">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-rule/70 mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-ledger-blue" />
                    <h3 className="font-serif font-semibold text-sm text-ink">{label}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-ink-soft bg-paper px-1.5 py-0.5 rounded border border-rule">
                      {items.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMealTag(tag);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="p-1 text-ink-soft hover:text-ledger-blue rounded"
                      title={`Quick add to ${label}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-paper border border-rule/80 rounded-[4px] flex items-center justify-between gap-2.5 group hover:border-ink-soft transition-colors"
                    >
                      <div
                        onClick={() => handleToggleStatus(item)}
                        className="flex items-center gap-2.5 flex-1 cursor-pointer overflow-hidden select-none"
                      >
                        {item.status === 'eaten' ? (
                          <div className="w-4 h-4 rounded-full bg-ledger-blue text-paper flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        ) : (
                          <Circle className="w-4 h-4 text-ink-soft flex-shrink-0" />
                        )}
                        <span
                          className={`text-xs text-ink truncate leading-tight ${
                            item.status === 'eaten' ? '' : 'italic text-ink-soft'
                          }`}
                        >
                          {item.itemName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border capitalize ${
                          item.status === 'eaten'
                            ? 'bg-card border-rule text-ink-soft'
                            : 'bg-gold-light border-gold/30 text-ink'
                        }`}>
                          {item.status}
                        </span>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-1 text-ink-soft hover:text-stamp-red opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div
                      onClick={() => {
                        setNewMealTag(tag);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="py-6 text-center text-xs text-ink-soft/70 border border-dashed border-rule/60 rounded-[4px] cursor-pointer hover:border-ink-soft hover:text-ink transition-colors"
                    >
                      + Add {label.toLowerCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog for Food Log Deletion */}
      <ConfirmDialog
        isOpen={itemToDelete !== null}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Food Entry?"
        description={
          itemToDelete
            ? `Are you sure you want to remove "${itemToDelete.itemName}" from your food log?`
            : ''
        }
        confirmText="Delete Entry"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};


