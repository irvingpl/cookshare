'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const CATEGORIES = ['한식', '양식', '일식', '중식', '분식', '디저트', '음료'];

export default function NewRecipePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState<File | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const ingredientList = ingredients.split('\n').map(s => s.trim()).filter(Boolean);
      const stepList = steps.split('\n').map(s => s.trim()).filter(Boolean);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('ingredients', JSON.stringify(ingredientList));
      formData.append('steps', JSON.stringify(stepList));
      if (cookTime) formData.append('cook_time_minutes', cookTime);
      if (servings) formData.append('servings', servings);
      if (difficulty) formData.append('difficulty', difficulty);
      if (category) formData.append('category', category);
      if (image) formData.append('image', image);

      const recipe = await api.recipes.create(formData);
      toast.success('레시피가 등록되었습니다!');
      router.push(`/recipes/${recipe.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>새 레시피 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">레시피 제목 *</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">소개</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cookTime">조리 시간 (분)</Label>
                <Input id="cookTime" type="number" min={1} value={cookTime} onChange={e => setCookTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="servings">인분</Label>
                <Input id="servings" type="number" min={1} value={servings} onChange={e => setServings(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">난이도</Label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">선택</option>
                  <option value="easy">쉬움</option>
                  <option value="medium">보통</option>
                  <option value="hard">어려움</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <select
                id="category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">선택</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredients">재료 * (줄바꿈으로 구분)</Label>
              <Textarea
                id="ingredients"
                placeholder={'양파 1개\n마늘 3쪽\n소금 약간'}
                value={ingredients}
                onChange={e => setIngredients(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="steps">조리 순서 * (줄바꿈으로 구분)</Label>
              <Textarea
                id="steps"
                placeholder={'양파를 잘게 썬다.\n팬에 기름을 두르고 볶는다.'}
                value={steps}
                onChange={e => setSteps(e.target.value)}
                rows={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">대표 이미지</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={e => setImage(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '등록 중...' : '레시피 등록'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
