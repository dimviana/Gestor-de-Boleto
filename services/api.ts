import { Boleto, BoletoStatus, User, Company, RegisteredUser, LogEntry } from '../types';

const API_BASE_URL = '/api';

const getAuthToken = (): string | null => {
    try {
        const session = sessionStorage.getItem('user_session');
        if (!session) return null;
        const parsedSession = JSON.parse(session);
        return parsedSession.token || null;
    } catch (e) {
        console.error("Failed to parse session token", e);
        return null;
    }
};

const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        // FIX: Type '{ [x: string]: string; } | ...' is not assignable to type 'Record<string, string>'.
        // The type of options.headers is too broad for a simple spread into a Record.
        // Explicitly casting to 'any' to resolve the type conflict.
        ...((options.headers as any) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Do not set Content-Type for FormData; the browser does it automatically with the boundary.
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'An API error occurred');
    }
    return response;
};

// --- Boletos API ---

export const fetchBoletos = async (): Promise<Boleto[]> => {
    const response = await authenticatedFetch('/boletos');
    return response.json();
};

export const uploadBoletoFile = async (file: File): Promise<Boleto> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await authenticatedFetch('/boletos', {
        method: 'POST',
        body: formData,
    });
    return response.json();
};

export const updateBoleto = async (id: string, status: BoletoStatus): Promise<void> => {
    await authenticatedFetch(`/boletos/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
};

export const updateBoletoComments = async (id: string, comments: string): Promise<void> => {
    await authenticatedFetch(`/boletos/${id}/comments`, {
        method: 'PUT',
        body: JSON.stringify({ comments }),
    });
};

export const removeBoleto = async (id: string): Promise<void> => {
    await authenticatedFetch(`/boletos/${id}`, {
        method: 'DELETE',
    });
};

// --- Companies API ---

export const fetchCompanies = async (): Promise<Company[]> => {
    const response = await authenticatedFetch('/companies');
    return response.json();
};

export const createCompany = async (companyData: Omit<Company, 'id'>): Promise<Company> => {
    const response = await authenticatedFetch('/companies', {
        method: 'POST',
        body: JSON.stringify(companyData),
    });
    return response.json();
};

export const updateCompany = async (id: string, updates: Partial<Omit<Company, 'id'>>): Promise<void> => {
    await authenticatedFetch(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteCompany = async (id: string): Promise<void> => {
    await authenticatedFetch(`/companies/${id}`, {
        method: 'DELETE',
    });
};

// --- Users API ---

export const fetchUsers = async (): Promise<RegisteredUser[]> => {
    const response = await authenticatedFetch('/users');
    const users = await response.json();
    return users.map((user: any) => ({ ...user, companyId: user.company_id }));
};

export const createUser = async (userData: Omit<RegisteredUser, 'id'>): Promise<RegisteredUser> => {
    const response = await authenticatedFetch('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
    return response.json();
};

export const updateUser = async (id: string, updates: Partial<Omit<RegisteredUser, 'id'>>): Promise<void> => {
    await authenticatedFetch(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteUser = async (id: string): Promise<void> => {
    await authenticatedFetch(`/users/${id}`, {
        method: 'DELETE',
    });
};

// --- Logs API ---

export const fetchLogs = async (): Promise<LogEntry[]> => {
    const response = await authenticatedFetch('/logs');
    return response.json();
};

// --- Settings API ---
export const fetchSettings = async (): Promise<any> => {
    const response = await authenticatedFetch('/settings');
    return response.json();
}

export const updateSettings = async (settings: Record<string, any>): Promise<void> => {
    await authenticatedFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
    });
};

// --- Auth API ---
export const login = async (username: string, password?: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'Login failed');
    }
    return response.json();
}

export const register = async (username: string, password?: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
     if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'Registration failed');
    }
}