'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Recipe, Comment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const DIFFICULTY_LABELS: Record<string, string> = { easy: '쉬움', medium: '보통', hard: '어려움' };

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api.recipes.get(id), api.comments.list(id)])
      .then(([recipeData, commentData]) => {
        setRecipe(recipeData);
        setComments(commentData.comments);
      })
      .catch(() => toast.error('레시피를 불러올 수 없습니다.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleLike() {
    if (!user) { router.push('/login'); return; }
    try {
      const { liked } = await api.recipes.like(id);
      setRecipe(prev => prev ? {
        ...prev,
        liked,
        like_count: liked ? prev.like_count + 1 : prev.like_count - 1,
      } : prev);
    } catch {
      toast.error('좋아요 처리에 실패했습니다.');
    }
  }

  async function handleDeleteRecipe() {
    if (!confirm('레시피를 삭제하시겠습니까?')) return;
    try {
      await api.recipes.delete(id);
      toast.success('레시피가 삭제되었습니다.');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      const comment = await api.comments.create(id, commentText);
      setComments(prev => [...prev, comment]);
      setCommentText('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await api.comments.delete(id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (isLoading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!recipe) return <p className="text-center py-16">레시피를 찾을 수 없습니다.</p>;

  const isAuthor = user?.id === recipe.author_id;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {recipe.image_url && (
        <div className="relative h-72 rounded-xl overflow-hidden">
          <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold">{recipe.title}</h1>
          {isAuthor && (
            <div className="flex gap-2 shrink-0">
              <Link href={`/recipes/${id}/edit`}>
                <Button variant="outline" size="sm">수정</Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={handleDeleteRecipe}>삭제</Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {recipe.category && <Badge>{recipe.category}</Badge>}
          {recipe.difficulty && <Badge variant="outline">{DIFFICULTY_LABELS[recipe.difficulty]}</Badge>}
          {recipe.cook_time_minutes && <Badge variant="outline">⏱ {recipe.cook_time_minutes}분</Badge>}
          {recipe.servings && <Badge variant="outline">🍽 {recipe.servings}인분</Badge>}
        </div>

        {recipe.description && <p className="text-muted-foreground">{recipe.description}</p>}

        <div className="flex items-center justify-between">
          <Link href={`/users/${recipe.author_id}`} className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={recipe.author_avatar} />
              <AvatarFallback>{recipe.author_name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{recipe.author_name}</span>
          </Link>
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full border transition-colors ${recipe.liked ? 'bg-red-50 border-red-200 text-red-600' : 'hover:bg-muted'}`}
          >
            {recipe.liked ? '❤️' : '🤍'} {recipe.like_count}
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-2">
          <h2 className="text-xl font-semibold mb-4">재료</h2>
          <ul className="space-y-1">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {ing}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">조리 순서</h2>
          {recipe.steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {i + 1}
              </span>
              <p className="text-sm leading-7">{step}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">댓글 {comments.length}</h2>

        <form onSubmit={handleCommentSubmit} className="space-y-2">
          <Textarea
            placeholder={user ? '댓글을 입력하세요...' : '댓글을 작성하려면 로그인하세요.'}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            disabled={!user}
            rows={3}
          />
          {user && (
            <Button type="submit" size="sm" disabled={isSubmitting || !commentText.trim()}>
              {isSubmitting ? '등록 중...' : '댓글 등록'}
            </Button>
          )}
        </form>

        <div className="space-y-3">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={comment.avatar_url} />
                <AvatarFallback className="text-xs">{comment.username[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{comment.username}</span>
                  {user?.id === comment.user_id && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
