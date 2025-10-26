'use client';

import { useState, useCallback } from 'react';
import type { Analysis } from '@/types/analysis';
import { AnalysisCard } from './AnalysisCard';
import { SearchBar } from './SearchBar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface AnalysesListProps {
  initialAnalyses: Analysis[];
}

export function AnalysesList({ initialAnalyses }: AnalysesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter analyses based on search query
  const filteredAnalyses = initialAnalyses.filter((analysis) =>
    analysis.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <div className="space-y-6">
      <SearchBar onSearch={handleSearch} />

      {filteredAnalyses.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? '검색 결과가 없습니다'
              : '분석 내역이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAnalyses.map((analysis) => (
            <AnalysisCard key={analysis.id} analysis={analysis} />
          ))}
        </div>
      )}
    </div>
  );
}
