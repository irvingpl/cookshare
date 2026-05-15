export interface User {
  id: string;
  email: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  image_url?: string;
  cook_time_minutes?: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  like_count: number;
  comment_count: number;
  liked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  recipe_id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedRecipes {
  recipes: Recipe[];
  total: number;
  page: number;
  limit: number;
}

export type Difficulty = Recipe['difficulty'];
