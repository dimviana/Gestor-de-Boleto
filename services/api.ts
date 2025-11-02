import { Boleto, BoletoStatus, User, Company, RegisteredUser, LogEntry, VpsSettings } from '../types';

const API_BASE_URL = '/api'; // Use relative URL to proxy to the backend

// --- Helper Functions ---
const getAuthToken = (): string | null => {
    try {
        const session = localStorage.getItem('user_session');
        if (!session) return null;
        const user: User = JSON.parse(session);
        return user.token || null;
    } catch (e) {
        return null;
    }
};

const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = getAuthToken();
    const headers = {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};


// --- Auth API ---
export const login = (username: string, password?: string): Promise<User> => {
    return apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
};

export const register = (username?: string, password?: string): Promise<any> => {
    return apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
};


// --- Boletos API ---
export const fetchBoletos = (): Promise<Boleto[]> => apiFetch('/boletos');

export const createBoleto = (file: File): Promise<Boleto> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/boletos', {
        method: 'POST',
        body: formData,
    });
};

export const updateBoletoStatus = (id: string, status: BoletoStatus): Promise<{ message: string }> => {
    return apiFetch(`/boletos/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
};

export const updateBoletoComments = (id: string, comments: string): Promise<{ message: string }> => {
    return apiFetch(`/boletos/${id}/comments`, {
        method: 'PUT',
        body: JSON.stringify({ comments }),
    });
};

export const removeBoleto = (id: string): Promise<{ message: string }> => {
    return apiFetch(`/boletos/${id}`, { method: 'DELETE' });
};


// --- Users API ---
export const fetchUsers = (): Promise<RegisteredUser[]> => apiFetch('/users');

export const createUser = (userData: Omit<RegisteredUser, 'id'>): Promise<RegisteredUser> => {
    return apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const updateUser = (id: string, updates: Partial<Omit<RegisteredUser, 'id'>>): Promise<{ message: string }> => {
    return apiFetch(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteUser = (id: string): Promise<{ message: string }> => {
    return apiFetch(`/users/${id}`, { method: 'DELETE' });
};


// --- Companies API ---
export const fetchCompanies = (): Promise<Company[]> => apiFetch('/companies');

export const createCompany = (companyData: Omit<Company, 'id'>): Promise<Company> => {
    return apiFetch('/companies', {
        method: 'POST',
        body: JSON.stringify(companyData),
    });
};

export const updateCompany = (id: string, updates: Partial<Omit<Company, 'id'>>): Promise<{ message: string }> => {
    return apiFetch(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteCompany = (id: string): Promise<{ message: string }> => {
    return apiFetch(`/companies/${id}`, { method: 'DELETE' });
};

// --- Logs API ---
export const fetchLogs = (): Promise<LogEntry[]> => apiFetch('/logs');


// --- VPS Settings API ---
export const fetchVpsSettings = (): Promise<VpsSettings> => apiFetch('/vps');

export const saveVpsSettings = (settings: VpsSettings): Promise<{ message: string }> => {
  return apiFetch('/vps', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
};

export const triggerVpsUpdate = (): Promise<{ message: string; output: string; }> => {
  return apiFetch('/vps/update', {
    method: 'POST',
  });
};
