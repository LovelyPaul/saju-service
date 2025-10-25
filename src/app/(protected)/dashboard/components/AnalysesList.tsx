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
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <SearchBar onSearch={handleSearch} />
        </div>
        <Button asChild>
          <Link href="/analysis/new">
            <Plus className="mr-2 h-4 w-4" />
            새 검사하기
          </Link>
        </Button>
      </div>

      {filteredAnalyses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery
              ? '검색 결과가 없습니다'
              : '분석 내역이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAnalyses.map((analysis) => (
            <AnalysisCard key={analysis.id} analysis={analysis} />
          ))}
        </div>
      )}
    </div>
  );
}
