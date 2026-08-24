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

  const handleDelete = async (id: string) => {
    try {
      await deleteFoodEntry(id);
      loadData(selectedDate);
    } catch (err) {
      console.error(err);
    }
  };

  const jumpDay = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const MEAL_SECTIONS: { tag: 'breakfast' | 'lunch' | 'dinner' | 'snack'; label: string; icon: any }[] = [
    { tag: 'breakfast', label: 'Breakfast', icon: Coffee },
    { tag: 'lunch', label: 'Lunch', icon: Sun },
    { tag: 'dinner', label: 'Dinner', icon: Moon },
    { tag: 'snack', label: 'Snacks & Drinks', icon: Cookie },
  ];

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
              className="px-2.5 py-1 bg-card border border-rule hover:border-ink-soft rounded text-xs font-mono text-ink transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </Header>

      {/* Date Navigation Strip */}
      <div className="ledger-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => jumpDay(-1)}
            className="p-1.5 rounded hover:bg-paper text-ink-soft hover:text-ink transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1 bg-paper border border-rule rounded-[3px] text-xs font-mono text-ink focus:bg-card focus:outline-none"
          />
          <button
            onClick={() => jumpDay(1)}
            className="p-1.5 rounded hover:bg-paper text-ink-soft hover:text-ink transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="font-serif text-sm font-semibold text-ink">
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </div>

        <div className="text-xs font-mono text-ink-soft">
          <span className="font-semibold text-ink">{groupedFood.all.length}</span> items logged
        </div>
      </div>

      {/* Quick Add Form */}
      <div className="ledger-card p-4">
        <form onSubmit={handleAddFood} className="flex flex-col sm:flex-row gap-2.5 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-mono uppercase text-ink-soft mb-1">
              Food Item / Dish
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Oatmeal with blueberries & chia seeds"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none"
              autoFocus
            />
          </div>

          <div className="w-full sm:w-36">
            <label className="block text-[11px] font-mono uppercase text-ink-soft mb-1">Meal</label>
            <select
              value={newMealTag}
              onChange={(e) => setNewMealTag(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none capitalize"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          <div className="w-full sm:w-32">
            <label className="block text-[11px] font-mono uppercase text-ink-soft mb-1">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-paper border border-rule rounded-[3px] focus:bg-card focus:outline-none capitalize"
            >
              <option value="eaten">Eaten</option>
              <option value="want">Want to Eat</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !newItemName.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-ledger-blue text-paper text-xs font-medium rounded hover:bg-ledger-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Log Meal</span>
          </button>
        </form>
      </div>

      {/* Meal Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MEAL_SECTIONS.map(({ tag, label, icon: Icon }) => {
          const items = groupedFood[tag];
          return (
            <div key={tag} className="ledger-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-rule mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-ledger-blue" />
                    <h3 className="font-serif font-semibold text-sm text-ink">{label}</h3>
                  </div>
                  <span className="text-xs font-mono text-ink-soft bg-paper px-1.5 py-0.5 rounded border border-rule">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-paper border border-rule rounded-[3px] flex items-center justify-between gap-3 group"
                    >
                      <div
                        onClick={() => handleToggleStatus(item)}
                        className="flex items-center gap-2.5 flex-1 cursor-pointer overflow-hidden"
                      >
                        {item.status === 'eaten' ? (
                          <CheckCircle2 className="w-4 h-4 text-ledger-blue flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-ink-soft flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm text-ink truncate ${
                            item.status === 'eaten' ? '' : 'italic text-ink-soft'
                          }`}
                        >
                          {item.itemName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rule bg-card text-ink-soft capitalize">
                          {item.status}
                        </span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-ink-soft hover:text-stamp-red opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete food entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <p className="text-xs text-ink-soft/70 italic py-3 text-center">
                      No {label.toLowerCase()} logged yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
