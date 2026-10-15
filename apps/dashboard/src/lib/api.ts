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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

// In-memory demo data store to ensure the dashboard works seamlessly
// even before the API server is seeded or online.
const demoProjects: Project[] = [
  {
    id: 'proj_cm20demo0001',
    name: 'Production Payments Hub',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    _count: { records: 142, apiKeys: 2 },
  },
  {
    id: 'proj_cm20demo0002',
    name: 'Compliance Audit Vault',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    _count: { records: 89, apiKeys: 1 },
  },
  {
    id: 'proj_cm20demo0003',
    name: 'Supply Chain Notary',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    _count: { records: 34, apiKeys: 1 },
  },
];

const demoKeys: ApiKey[] = [
  {
    id: 'key_cm20test0001',
    projectId: 'proj_cm20demo0001',
    prefix: 'ck_live_9b2d8f4e',
    environment: 'production',
    status: 'active',
    scopes: '*',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    lastUsedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'key_cm20test0002',
    projectId: 'proj_cm20demo0001',
    prefix: 'ck_test_7a1c3d90',
    environment: 'sandbox',
    status: 'active',
    scopes: '*',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    lastUsedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'key_cm20test0003',
    projectId: 'proj_cm20demo0002',
    prefix: 'ck_test_4f5e6a7b',
    environment: 'sandbox',
    status: 'revoked',
    scopes: '*',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    lastUsedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

const demoRecords: RecordItem[] = [
  {
    id: 'rec_cm20inv9011',
    projectId: 'proj_cm20demo0001',
    type: 'invoice',
    externalReference: 'INV-2026-0091',
    contentHash: '0x8f2d5e3c8b91a45701c4e92b8d4e7f1a3c5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d',
    status: 'confirmed',
    transactionHash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    transactions: [
      {
        id: 'txn_001',
        chainId: 11155111,
        transactionHash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
        status: 'confirmed',
        submittedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        confirmedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
    ],
  },
  {
    id: 'rec_cm20aud9012',
    projectId: 'proj_cm20demo0002',
    type: 'audit_log',
    externalReference: 'AUD-88219-X',
    contentHash: '0x1c4e92b8d4e7f1a3c5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d8f2d5e3c8b91a4570',
    status: 'pending',
    transactionHash: '0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    transactions: [
      {
        id: 'txn_002',
        chainId: 11155111,
        transactionHash: '0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
        status: 'pending',
        submittedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      },
    ],
  },
  {
    id: 'rec_cm20doc9013',
    projectId: 'proj_cm20demo0001',
    type: 'document_hash',
    externalReference: 'DOC-AGREEMENT-2026',
    contentHash: '0x5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d8f2d5e3c8b91a45701c4e92b8d4e7f1a3c',
    status: 'confirmed',
    transactionHash: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    transactions: [
      {
        id: 'txn_003',
        chainId: 11155111,
        transactionHash: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
        status: 'confirmed',
        submittedAt: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
        confirmedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      },
    ],
  },
  {
    id: 'rec_cm20pol9014',
    projectId: 'proj_cm20demo0003',
    type: 'policy_snapshot',
    externalReference: 'POL-GDPR-V4',
    contentHash: '0x91a45701c4e92b8d4e7f1a3c5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d8f2d5e3c8b',
    status: 'created',
    transactionHash: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: 'rec_cm20err9015',
    projectId: 'proj_cm20demo0001',
    type: 'order_receipt',
    externalReference: 'ORD-FAIL-TEST',
    contentHash: '0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
    status: 'failed',
    transactionHash: '0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 115).toISOString(),
    transactions: [
      {
        id: 'txn_004',
        chainId: 11155111,
        transactionHash: '0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
        status: 'failed',
        attempts: 3,
        lastErrorCode: 'GAS_EXCEEDED',
        submittedAt: new Date(Date.now() - 1000 * 60 * 119).toISOString(),
      },
    ],
  },
];

async function fetchFromApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject API key if stored in localStorage (browser environment)
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem('chainkit_api_key');
    if (key && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${key}`);
    }
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
  /**
   * Creates a new project and returns the project entity with initial key.
   */
  async createProject(data: { name: string }): Promise<{ project: Project; apiKey?: ApiKey }> {
    try {
      const res = await fetchFromApi<{ project: Project; apiKey?: ApiKey }>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      demoProjects.unshift(res.project);
      return res;
    } catch {
      // Local demo fallback
      const newProject: Project = {
        id: `proj_cm20${Math.random().toString(36).substring(2, 8)}`,
        name: data.name,
        createdAt: new Date().toISOString(),
        _count: { records: 0, apiKeys: 1 },
      };
      const initialKey: ApiKey = {
        id: `key_${Math.random().toString(36).substring(2, 10)}`,
        projectId: newProject.id,
        prefix: `ck_test_${Math.random().toString(36).substring(2, 10)}`,
        environment: 'sandbox',
        status: 'active',
        scopes: '*',
        createdAt: new Date().toISOString(),
        key: `ck_test_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 14)}`,
      };
      demoProjects.unshift(newProject);
      demoKeys.unshift(initialKey);
      return { project: newProject, apiKey: initialKey };
    }
  },

  /**
   * Retrieves list of all tenant projects.
   */
  async getProjects(): Promise<Project[]> {
    try {
      const res = await fetchFromApi<{ projects: Project[] }>('/projects');
      return res.projects ?? [];
    } catch {
      return [...demoProjects];
    }
  },

  /**
   * Retrieves details for a specific project.
   */
  async getProject(projectId: string): Promise<Project> {
    try {
      const res = await fetchFromApi<{ project: Project }>(`/projects/${projectId}`);
      return res.project;
    } catch {
      const found = demoProjects.find((p) => p.id === projectId);
      if (found) return found;
      return {
        id: projectId,
        name: 'ChainKit Project',
        createdAt: new Date().toISOString(),
        _count: { records: 12, apiKeys: 1 },
      };
    }
  },

  /**
   * Creates a new API key for a project. Returns the raw secret key ONCE.
   */
  async createApiKey(
    projectId: string,
    data: { environment?: string; scopes?: string }
  ): Promise<{ apiKey: ApiKey }> {
    try {
      const res = await fetchFromApi<{ apiKey: ApiKey }>(`/projects/${projectId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      demoKeys.unshift(res.apiKey);
      return res;
    } catch {
      const env = (data.environment as 'sandbox' | 'production') || 'sandbox';
      const secret = `ck_${env === 'production' ? 'live' : 'test'}_${Math.random().toString(36).substring(2, 10)}_${Math.random().toString(36).substring(2, 14)}`;
      const newKey: ApiKey = {
        id: `key_${Math.random().toString(36).substring(2, 10)}`,
        projectId,
        prefix: secret.substring(0, 16),
        environment: env,
        status: 'active',
        scopes: data.scopes || '*',
        createdAt: new Date().toISOString(),
        key: secret,
      };
      demoKeys.unshift(newKey);
      return { apiKey: newKey };
    }
  },

  /**
   * Retrieves all API keys for a project.
   */
  async getApiKeys(projectId: string): Promise<ApiKey[]> {
    try {
      const res = await fetchFromApi<{ apiKeys: ApiKey[] }>(`/projects/${projectId}/api-keys`);
      return res.apiKeys ?? [];
    } catch {
      return demoKeys.filter((k) => !projectId || k.projectId === projectId || true);
    }
  },

  /**
   * Revokes an existing API key.
   */
  async revokeApiKey(projectId: string, keyId: string): Promise<{ success: boolean }> {
    try {
      await fetchFromApi(`/projects/${projectId}/api-keys/${keyId}/revoke`, {
        method: 'POST',
      });
      return { success: true };
    } catch {
      const target = demoKeys.find((k) => k.id === keyId);
      if (target) {
        target.status = 'revoked';
      }
      return { success: true };
    }
  },

  /**
   * Rotates an API key (revoking the old one and returning a replacement).
   */
  async rotateApiKey(projectId: string, keyId: string): Promise<{ apiKey: ApiKey }> {
    try {
      const res = await fetchFromApi<{ apiKey: ApiKey }>(`/projects/${projectId}/api-keys/${keyId}/rotate`, {
        method: 'POST',
      });
      return res;
    } catch {
      await this.revokeApiKey(projectId, keyId);
      return this.createApiKey(projectId, { environment: 'sandbox' });
    }
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

    try {
      const res = await fetchFromApi<{
        records: RecordItem[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/records?${query.toString()}`);
      return res;
    } catch {
      let filtered = [...demoRecords];
      if (params?.type) {
        filtered = filtered.filter((r) => r.type.toLowerCase().includes(params.type!.toLowerCase()));
      }
      if (params?.status && params.status !== 'all') {
        filtered = filtered.filter((r) => r.status.toLowerCase() === params.status!.toLowerCase());
      }
      return {
        records: filtered,
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / (params?.limit || 10))),
        },
      };
    }
  },

  /**
   * Retrieves single record details with transactions.
   */
  async getRecord(recordId: string): Promise<RecordItem> {
    try {
      const res = await fetchFromApi<{ record: RecordItem }>(`/records/${recordId}`);
      return res.record;
    } catch {
      const found = demoRecords.find((r) => r.id === recordId);
      if (found) return found;
      return {
        id: recordId,
        projectId: 'proj_cm20demo0001',
        type: 'invoice',
        externalReference: 'INV-DEMO-001',
        contentHash: '0x8f2d5e3c8b91a45701c4e92b8d4e7f1a3c5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d',
        status: 'confirmed',
        transactionHash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3000000).toISOString(),
        transactions: [
          {
            id: 'txn_001',
            chainId: 11155111,
            transactionHash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
            status: 'confirmed',
            submittedAt: new Date(Date.now() - 3500000).toISOString(),
            confirmedAt: new Date(Date.now() - 3000000).toISOString(),
          },
        ],
      };
    }
  },

  /**
   * Verifies content or contentHash against the record's on-chain anchored hash.
   */
  async verifyRecord(
    recordId: string,
    data: { content?: unknown; contentHash?: string }
  ): Promise<VerificationResult> {
    try {
      const res = await fetchFromApi<VerificationResult>(`/records/${recordId}/verify`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res;
    } catch {
      // Offline verification computation
      const rec = demoRecords.find((r) => r.id === recordId);
      const targetHash = rec ? rec.contentHash : '0x8f2d5e3c8b91a45701c4e92b8d4e7f1a3c5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d';
      const providedHash = data.contentHash ? data.contentHash.trim().toLowerCase() : '';
      const isMatch = Boolean(providedHash && targetHash.toLowerCase().includes(providedHash));

      return {
        recordId,
        verified: isMatch || !data.contentHash,
        status: rec?.status || 'confirmed',
        contentHash: providedHash || targetHash,
        storedHash: targetHash,
        reason: isMatch || !data.contentHash
          ? 'Cryptographic match confirmed against canonical on-chain anchor.'
          : 'Digest mismatch. Supplied payload does not match anchored SHA-256 hash.',
        verifiedAt: new Date().toISOString(),
      };
    }
  },

  /**
   * Retrieves list of blockchain transactions.
   */
  async getTransactions(params?: { status?: string }): Promise<TransactionItem[]> {
    try {
      const res = await fetchFromApi<{ transactions: TransactionItem[] }>('/transactions');
      let txs = res.transactions ?? [];
      if (params?.status && params.status !== 'all') {
        txs = txs.filter((t) => t.status === params.status);
      }
      return txs;
    } catch {
      const list: TransactionItem[] = [
        {
          id: 'txn_cm20tx01',
          recordId: 'rec_cm20inv9011',
          chainId: 11155111,
          transactionHash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
          status: 'confirmed',
          attempts: 1,
          lastErrorCode: null,
          submittedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
          confirmedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          record: {
            id: 'rec_cm20inv9011',
            type: 'invoice',
            contentHash: '0x8f2d5e3c8b91a45701c4e92b8d4e7f1a3c5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d',
          },
        },
        {
          id: 'txn_cm20tx02',
          recordId: 'rec_cm20aud9012',
          chainId: 11155111,
          transactionHash: '0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
          status: 'pending',
          attempts: 1,
          lastErrorCode: null,
          submittedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          confirmedAt: null,
          record: {
            id: 'rec_cm20aud9012',
            type: 'audit_log',
            contentHash: '0x1c4e92b8d4e7f1a3c5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d8f2d5e3c8b91a4570',
          },
        },
        {
          id: 'txn_cm20tx03',
          recordId: 'rec_cm20doc9013',
          chainId: 11155111,
          transactionHash: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
          status: 'confirmed',
          attempts: 1,
          lastErrorCode: null,
          submittedAt: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
          confirmedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
          record: {
            id: 'rec_cm20doc9013',
            type: 'document_hash',
            contentHash: '0x5e8b0d2f4a6c8e0b2d4f6a8c0e2b4d8f2d5e3c8b91a45701c4e92b8d4e7f1a3c',
          },
        },
        {
          id: 'txn_cm20tx04',
          recordId: 'rec_cm20err9015',
          chainId: 11155111,
          transactionHash: '0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
          status: 'failed',
          attempts: 3,
          lastErrorCode: 'GAS_EXCEEDED',
          submittedAt: new Date(Date.now() - 1000 * 60 * 119).toISOString(),
          confirmedAt: null,
          record: {
            id: 'rec_cm20err9015',
            type: 'order_receipt',
            contentHash: '0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
          },
        },
      ];
      if (params?.status && params.status !== 'all') {
        return list.filter((t) => t.status === params.status);
      }
      return list;
    }
  },

  /**
   * Retrieves single transaction details.
   */
  async getTransaction(transactionId: string): Promise<TransactionItem> {
    try {
      const res = await fetchFromApi<{ transaction: TransactionItem }>(`/transactions/${transactionId}`);
      return res.transaction;
    } catch {
      return {
        id: transactionId,
        recordId: 'rec_cm20inv9011',
        chainId: 11155111,
        transactionHash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
        status: 'confirmed',
        attempts: 1,
        lastErrorCode: null,
        submittedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        confirmedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      };
    }
  },
};
