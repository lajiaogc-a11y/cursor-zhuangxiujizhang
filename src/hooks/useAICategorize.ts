import { useState, useCallback } from 'react';
import { invokeAICategorize } from '@/services/admin.service';

export function useAICategorize() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);

  const categorize = useCallback(async (
    description: string,
    transactionType: 'income' | 'expense',
    categories: string[]
  ) => {
    if (!description.trim() || categories.length === 0) {
      setSuggestedCategory(null);
      return null;
    }

    setIsLoading(true);
    try {
      const category = await invokeAICategorize(description, transactionType, categories);
      if (category && categories.includes(category)) {
        setSuggestedCategory(category);
        return category;
      }
      setSuggestedCategory(null);
      return null;
    } catch (error) {
      console.error('Categorize error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestion = useCallback(() => {
    setSuggestedCategory(null);
  }, []);

  return {
    categorize,
    isLoading,
    suggestedCategory,
    clearSuggestion,
  };
}
