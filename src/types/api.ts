// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Story/Item Types
export interface StoryResponse {
  id: number;
  title: string | null;
  url?: string | null;
  text?: string | null;
  author: {
    id: number;
    username: string;
    karma: number;
  };
  points: number;
  commentCount: number;
  flagCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoryRequest {
  title: string;
  url?: string;
  text?: string;
}

export interface UpdateStoryRequest {
  title?: string;
  url?: string;
  text?: string;
}

// Comment Types
export interface CommentResponse {
  id: number;
  text: string;
  author: {
    id: number;
    username: string;
    karma: number;
  };
  parentId: number | null;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  text: string;
  parentId: number;
}

// User Types
export interface UserResponse {
  id: number;
  username: string;
  about?: string;
  karma: number;
  createdAt: string;
}

export interface UserDetailResponse extends UserResponse {
  itemCount: number;
  commentCount: number;
  shadowBanned?: boolean;
}

// Vote Types
export interface VoteResponse {
  id: number;
  itemId: number;
  userId: number;
  createdAt: string;
}

// Query Parameters
export interface ListQueryParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export const API_ERRORS = {
  NOT_FOUND: { code: "NOT_FOUND", message: "Resource not found" },
  UNAUTHORIZED: { code: "UNAUTHORIZED", message: "Authentication required" },
  FORBIDDEN: { code: "FORBIDDEN", message: "Access forbidden" },
  BAD_REQUEST: { code: "BAD_REQUEST", message: "Bad request" },
  CONFLICT: { code: "CONFLICT", message: "Resource already exists" },
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", message: "Internal server error" },
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", message: "Validation failed" },
  RATE_LIMIT: { code: "RATE_LIMIT", message: "Rate limit exceeded" },
};
