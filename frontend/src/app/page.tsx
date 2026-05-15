'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Recipe } from '@/types';
import RecipeCard from '@/components/shared/RecipeCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = ['한식', '양식', '일식', '중식', '분식', '디저트', '음료'];
const DIFFICULTIES = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
];

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const params: Record<string, string> = { page: String(page) };
    if (search) params.q = search;
    if (category) params.category = category;
    if (difficulty) params.difficulty = difficulty;

    api.recipes.list(params)
      .then((data) => { setRecipes(data.recipes); setTotal(data.total); })
      .finally(() => setIsLoading(false));
  }, [page, search, category, difficulty]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(q);
    setPage(1);
  }

  function toggleCategory(c: string) {
    setCategory(prev => prev === c ? '' : c);
    setPage(1);
  }

  function toggleDifficulty(d: string) {
    setDifficulty(prev => prev === d ? '' : d);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">레시피 탐색</h1>
        <p className="text-muted-foreground">다양한 레시피를 발견하고 나만의 요리를 공유해보세요.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
        <Input
          placeholder="레시피 검색..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <Button type="submit">검색</Button>
      </form>

      <div className="flex flex-wrap gap-2 justify-center">
        {CATEGORIES.map(c => (
          <Badge
            key={c}
            variant={category === c ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleCategory(c)}
          >
            {c}
          </Badge>
        ))}
        {DIFFICULTIES.map(d => (
          <Badge
            key={d.value}
            variant={difficulty === d.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => toggleDifficulty(d.value)}
          >
            {d.label}
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">레시피가 없습니다.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
            <span className="flex items-center px-4 text-sm">{page} / {Math.ceil(total / 12)}</span>
            <Button variant="outline" disabled={page * 12 >= total} onClick={() => setPage(p => p + 1)}>다음</Button>
          </div>
        </>
      )}
    </div>
  );
}
