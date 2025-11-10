import { Boleto, BoletoStatus, User, Company, RegisteredUser, LogEntry, SslSettings, SslStatus } from '../types';

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
        let errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`;
        try {
            const errorText = await response.text();
            if (errorText) {
                // Try to parse as JSON first, as our API might return { message: '...' }
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorText;
                } catch (e) {
                    // If not JSON, the text itself is the error (e.g., "Internal Server Error" from a proxy)
                    errorMessage = errorText;
                }
            }
        } catch (e) {
            console.error('Could not read error response body', e);
        }
        throw new Error(errorMessage);
    }
    
    // Handle successful responses, including those with no content (e.g., 204)
    const responseText = await response.text();
    // If the response is empty, return null. The caller must handle this.
    if (!responseText) {
        return null;
    }
    
    // If we have a response, assume it's JSON as per original app design.
    // A try-catch ensures we don't crash on invalid JSON.
    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error(`Failed to parse successful response as JSON from ${url}:`, responseText);
        throw new Error('Invalid JSON response from server');
    }
};


// --- Auth API ---
export const login = (username: string, password?: string): Promise<User> => {
    return apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
};

export const register = (username?: string, password?: string, name?: string): Promise<any> => {
    return apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, name }),
    });
};


// --- Boletos API ---
export const fetchBoletos = (): Promise<Boleto[]> => apiFetch('/boletos');

export const fetchBoletoById = (id: string): Promise<Boleto> => apiFetch(`/boletos/${id}`);

export const extractBoletoData = (
    file: File, 
    companyId: string, 
    onProgress: (progress: number) => void
): Promise<Omit<Boleto, 'id' | 'status' | 'comments' | 'companyId'>> => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('companyId', companyId);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/boletos/extract`);

        const token = getAuthToken();
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 90; // 90% for upload, 10% for processing
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            onProgress(100); // Set to 100 on completion
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const responseJson = JSON.parse(xhr.responseText);
                    resolve(responseJson);
                } catch (e) {
                    reject(new Error('Invalid JSON response from server'));
                }
            } else {
                let errorMessage = `HTTP error! status: ${xhr.status} ${xhr.statusText}`;
                 try {
                    const errorJson = JSON.parse(xhr.responseText);
                    errorMessage = errorJson.message || xhr.responseText;
                } catch (e) {
                    errorMessage = xhr.responseText || errorMessage;
                }
                reject(new Error(errorMessage));
            }
        };

        xhr.onerror = () => {
            reject(new Error('Network error during file upload'));
        };

        xhr.send(formData);
    });
};

export const saveBoleto = (boletoData: Omit<Boleto, 'id' | 'status' | 'comments' | 'companyId' >, companyId: string): Promise<Boleto> => {
    return apiFetch('/boletos/save', {
        method: 'POST',
        body: JSON.stringify({ boletoData, companyId }),
    });
};

export const updateBoletoStatus = (id: string, status: BoletoStatus): Promise<Boleto> => {
    return apiFetch(`/boletos/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
    });
};

export const updateBoletoComments = (id: string, comments: string): Promise<Boleto> => {
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

export const updateUserProfile = (updates: { password?: string }): Promise<{ message: string }> => {
    return apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteUser = (id: string): Promise<{ message: string }> => {
    return apiFetch(`/users/${id}`, { method: 'DELETE' });
};


// --- Companies API ---
export const fetchCompanies = (): Promise<Company[]> => apiFetch('/companies');

export const createCompany = (companyData: Omit<Company, 'id' | 'monitoredFolderPath'>): Promise<Company> => {
    return apiFetch('/companies', {
        method: 'POST',
        body: JSON.stringify(companyData),
    });
};

export const updateCompany = (id: string, updates: Partial<Omit<Company, 'id' | 'monitoredFolderPath'>>): Promise<{ message: string }> => {
    return apiFetch(`/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
};

export const deleteCompany = (id: string): Promise<{ message: string }> => {
    return apiFetch(`/companies/${id}`, { method: 'DELETE' });
};

export const setCompanyMonitoredFolder = (companyId: string, path: string): Promise<{ message: string }> => {
    return apiFetch(`/companies/${companyId}/folder-monitoring`, {
        method: 'PUT',
        body: JSON.stringify({ path }),
    });
};

export const clearCompanyMonitoredFolder = (companyId: string): Promise<{ message: string }> => {
    return apiFetch(`/companies/${companyId}/folder-monitoring`, {
        method: 'DELETE',
    });
};


// --- Logs API ---
export const fetchLogs = (): Promise<LogEntry[]> => apiFetch('/logs');

// --- Settings API ---
export const fetchAllSettings = (): Promise<any> => apiFetch('/settings');

export const updateAllSettings = (settings: Record<string, any>): Promise<{ message: string }> => {
    return apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
};

// --- SSL Settings API ---
export const fetchSslSettings = (): Promise<SslSettings> => apiFetch('/ssl');

export const saveSslSettings = (settings: SslSettings): Promise<{ message: string }> => {
    return apiFetch('/ssl', {
        method: 'POST',
        body: JSON.stringify(settings),
    });
};

export const checkSslStatus = (domain: string): Promise<SslStatus> => {
    return apiFetch('/ssl/check', {
        method: 'POST',
        body: JSON.stringify({ domain }),
    });
};