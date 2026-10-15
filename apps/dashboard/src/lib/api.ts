/**
 * @fileoverview API Client for the ChainKit Developer Dashboard.
 * Integrates with ChainKit REST API with consistent error handling and type safety.
 */

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  _count?: {
    records: number;
    apiKeys: number;
  };
}

export interface ApiKey {
  id: string;
  projectId: string;
  prefix: string;
  environment: 'sandbox' | 'production' | 'test' | 'live';
  status: 'active' | 'revoked' | 'expired';
  scopes: string;
  createdAt: string;
  lastUsedAt?: string | null;
  key?: string; // Only returned on creation
}

export interface RecordTransaction {
  id: string;
  chainId: number;
  transactionHash: string | null;
  status: 'created' | 'submitting' | 'pending' | 'confirmed' | 'failed';
  attempts?: number;
  lastErrorCode?: string | null;
  submittedAt?: string | null;
  confirmedAt?: string | null;
}

export interface RecordItem {
  id: string;
  projectId: string;
  type: string;
  externalReference?: string | null;
  contentHash: string;
  status: 'created' | 'submitting' | 'pending' | 'confirmed' | 'failed';
  transactionHash?: string | null;
  createdAt: string;
  updatedAt?: string;
  transactions?: RecordTransaction[];
  project?: {
    id: string;
    name: string;
  };
}

export interface TransactionItem {
  id: string;
  recordId: string;
  chainId: number;
  transactionHash: string | null;
  status: 'created' | 'submitting' | 'pending' | 'confirmed' | 'failed';
  attempts: number;
  lastErrorCode: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  record?: {
    id: string;
    type: string;
    contentHash: string;
  };
}

export interface PaginatedRecords {
  records: RecordItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VerificationResult {
  recordId: string;
  verified: boolean;
  status: string;
  contentHash: string;
  storedHash: string;
  reason: string;
  verifiedAt: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const API_ROOT = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = API_ROOT.endsWith('/v1') ? API_ROOT : `${API_ROOT}/v1`;

// In-memory API key store (replaces insecure localStorage)
let inMemoryApiKey: string | null = null;

export function setApiKey(key: string): void {
  inMemoryApiKey = key;
}

export function getApiKey(): string | null {
  return inMemoryApiKey;
}

async function fetchFromApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject in-memory API key if available
  if (inMemoryApiKey && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryApiKey}`);
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'Request failed';
    const errorCode = data?.error?.code || `HTTP_${response.status}`;
    throw new ApiError(errorMsg, errorCode, response.status, data?.error?.details);
  }

  return data as T;
}

export const apiClient = {
  setApiKey,
  getApiKey,

  /**
   * Creates a new project and returns the project entity with initial key.
   */
  async createProject(data: { name: string }): Promise<{ project: Project; apiKey?: ApiKey }> {
    return fetchFromApi<{ project: Project; apiKey?: ApiKey }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Retrieves list of all tenant projects.
   */
  async getProjects(): Promise<Project[]> {
    const res = await fetchFromApi<{ projects: Project[] }>('/projects');
    return res.projects ?? [];
  },

  /**
   * Retrieves details for a specific project.
   */
  async getProject(projectId: string): Promise<Project> {
    const res = await fetchFromApi<{ project: Project }>(`/projects/${projectId}`);
    return res.project;
  },

  /**
   * Creates a new API key for a project. Returns the raw secret key ONCE.
   */
  async createApiKey(
    projectId: string,
    data: { environment?: string; scopes?: string }
  ): Promise<{ apiKey: ApiKey }> {
    return fetchFromApi<{ apiKey: ApiKey }>(`/projects/${projectId}/api-keys`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Retrieves all API keys for a project.
   */
  async getApiKeys(projectId: string): Promise<ApiKey[]> {
    const res = await fetchFromApi<{ apiKeys: ApiKey[] }>(`/projects/${projectId}/api-keys`);
    return res.apiKeys ?? [];
  },

  /**
   * Revokes an existing API key.
   */
  async revokeApiKey(projectId: string, keyId: string): Promise<{ success: boolean }> {
    await fetchFromApi(`/projects/${projectId}/api-keys/${keyId}/revoke`, {
      method: 'POST',
    });
    return { success: true };
  },

  /**
   * Rotates an API key (revoking the old one and returning a replacement).
   */
  async rotateApiKey(projectId: string, keyId: string): Promise<{ apiKey: ApiKey }> {
    return fetchFromApi<{ apiKey: ApiKey }>(`/projects/${projectId}/api-keys/${keyId}/rotate`, {
      method: 'POST',
    });
  },

  /**
   * Retrieves paginated records.
   */
  async getRecords(params?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
  }): Promise<PaginatedRecords> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);

    const qs = query.toString();
    return fetchFromApi<PaginatedRecords>(`/records${qs ? `?${qs}` : ''}`);
  },

  /**
   * Retrieves single record details with transactions.
   */
  async getRecord(recordId: string): Promise<RecordItem> {
    const res = await fetchFromApi<{ record: RecordItem }>(`/records/${recordId}`);
    return res.record;
  },

  /**
   * Verifies content or contentHash against the record's on-chain anchored hash.
   */
  async verifyRecord(
    recordId: string,
    data: { content?: unknown; contentHash?: string }
  ): Promise<VerificationResult> {
    return fetchFromApi<VerificationResult>(`/records/${recordId}/verify`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Retrieves list of blockchain transactions.
   */
  async getTransactions(params?: { status?: string }): Promise<TransactionItem[]> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      query.set('status', params.status);
    }
    const qs = query.toString();
    const res = await fetchFromApi<{ transactions: TransactionItem[] }>(`/transactions${qs ? `?${qs}` : ''}`);
    return res.transactions ?? [];
  },

  /**
   * Retrieves single transaction details.
   */
  async getTransaction(transactionId: string): Promise<TransactionItem> {
    const res = await fetchFromApi<{ transaction: TransactionItem }>(`/transactions/${transactionId}`);
    return res.transaction;
  },
};
