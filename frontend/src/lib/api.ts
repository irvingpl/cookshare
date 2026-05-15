const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ── 토큰 스토리지 헬퍼 ──────────────────────────────────────
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

// ── 토큰 갱신 (동시 요청 중복 방지) ────────────────────────
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      // 페이지 컴포넌트가 아닌 곳에서 강제 이동이 필요할 때 이벤트로 전달
      window.dispatchEvent(new Event('auth:logout'));
      throw new Error('토큰 갱신에 실패했습니다. 다시 로그인해주세요.');
    }

    const data = await res.json();
    saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// ── 공통 fetch 래퍼 ─────────────────────────────────────────
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const accessToken = getAccessToken();
  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  // 401 → 토큰 갱신 후 1회 재시도 (refresh/logout 엔드포인트는 제외)
  if (res.status === 401 && retry && !endpoint.startsWith('/auth/')) {
    try {
      const newAccessToken = await refreshAccessToken();
      return request<T>(endpoint, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        },
      }, false);
    } catch {
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '요청에 실패했습니다.' }));
    throw new Error(error.message || '요청에 실패했습니다.');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── API 클라이언트 ───────────────────────────────────────────
export const api = {
  auth: {
    register: (data: { email: string; password: string; username: string }) =>
      request<{ accessToken: string; refreshToken: string; user: any }>(
        '/auth/register', { method: 'POST', body: JSON.stringify(data) }
      ),
    login: (data: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string; user: any }>(
        '/auth/login', { method: 'POST', body: JSON.stringify(data) }
      ),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }
      ),
    logout: (refreshToken: string) =>
      request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    me: () => request<{ user: any }>('/auth/me'),
  },
  recipes: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/recipes${qs}`);
    },
    get: (id: string) => request<any>(`/recipes/${id}`),
    create: (data: FormData) =>
      request<any>('/recipes', { method: 'POST', body: data }),
    update: (id: string, data: FormData) =>
      request<any>(`/recipes/${id}`, { method: 'PATCH', body: data }),
    delete: (id: string) =>
      request<void>(`/recipes/${id}`, { method: 'DELETE' }),
    like: (id: string) =>
      request<{ liked: boolean }>(`/recipes/${id}/like`, { method: 'POST' }),
  },
  comments: {
    list: (recipeId: string) => request<any>(`/recipes/${recipeId}/comments`),
    create: (recipeId: string, content: string) =>
      request<any>(`/recipes/${recipeId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
    delete: (recipeId: string, commentId: string) =>
      request<void>(`/recipes/${recipeId}/comments/${commentId}`, { method: 'DELETE' }),
  },
  users: {
    profile: (id: string) => request<any>(`/users/${id}/profile`),
    recipes: (id: string) => request<any>(`/users/${id}/recipes`),
    updateMe: (data: FormData) =>
      request<any>('/users/me', { method: 'PATCH', body: data }),
  },
};
