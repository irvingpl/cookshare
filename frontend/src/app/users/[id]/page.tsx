'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Recipe } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import RecipeCard from '@/components/shared/RecipeCard';
import { toast } from 'sonner';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.users.profile(id), api.users.recipes(id)])
      .then(([profileData, recipeData]) => {
        setProfile(profileData);
        setRecipes(recipeData.recipes);
      })
      .catch(() => toast.error('프로필을 불러올 수 없습니다.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!profile) return <p className="text-center py-16">사용자를 찾을 수 없습니다.</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback className="text-2xl">{profile.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          {profile.bio && <p className="text-muted-foreground">{profile.bio}</p>}
          <Badge variant="outline">{profile.recipe_count}개의 레시피</Badge>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">등록한 레시피</h2>
        {recipes.length === 0 ? (
          <p className="text-muted-foreground">아직 등록한 레시피가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
        )}
      </div>
    </div>
  );
}
