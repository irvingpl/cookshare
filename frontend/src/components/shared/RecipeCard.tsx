'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Recipe } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="relative h-48 bg-muted">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-4xl">🍳</div>
          )}
          {recipe.category && (
            <Badge className="absolute top-2 left-2">{recipe.category}</Badge>
          )}
        </div>
        <CardContent className="flex-1 p-4 space-y-2">
          <h3 className="font-semibold text-lg line-clamp-1">{recipe.title}</h3>
          {recipe.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            {recipe.difficulty && (
              <Badge variant="outline" className="text-xs">{DIFFICULTY_LABELS[recipe.difficulty]}</Badge>
            )}
            {recipe.cook_time_minutes && (
              <Badge variant="outline" className="text-xs">⏱ {recipe.cook_time_minutes}분</Badge>
            )}
            {recipe.servings && (
              <Badge variant="outline" className="text-xs">🍽 {recipe.servings}인분</Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={recipe.author_avatar} />
              <AvatarFallback className="text-xs">{recipe.author_name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{recipe.author_name}</span>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>❤️ {recipe.like_count}</span>
            <span>💬 {recipe.comment_count}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
