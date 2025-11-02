
import { Boleto, BoletoStatus, User, Company, RegisteredUser, LogEntry } from '../types';

const API_BASE_URL = '/api'; 

// --- Helper Functions ---

const getAuthToken = (): string | null => {
    try {
        const session = sessionStorage.getItem('user_session');
        if (!session) return null;
        const parsedSession = JSON.parse(session);
        return parsedSession.token || null;
    } catch (e) {
        return null;
    }
};

const getHeaders = () => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || 'An unknown error occurred');
    }
    return response.json();
}

// --- Boletos API ---

export const fetchBoletos = async (user: User, companyId?: string): Promise<Boleto[]> => {
    const url = new URL(`${API_BASE_URL}/boletos`);
    if (user.role === 'admin' && companyId) {
        url.searchParams.append('companyId', companyId);
    }
    const response = await fetch(url.toString(), { headers: getHeaders() });
    return handleResponse(response);
};

export const uploadBoletoFile = async (file: File): Promise<Boleto> => {
    const token = getAuthToken();
    if (!token) throw new Error("Authentication token not found.");

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/boletos`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });
    return handleResponse(response);
};

export const updateBoletoStatus = async (id: string, status: BoletoStatus): Promise<Boleto> => {
    const response = await fetch(`${API_BASE_URL}/boletos/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
    });
    // The backend just returns a success message, so we'll just check if it's ok
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
    }
    // Since the backend doesn't return the updated boleto, we can't return it here.
    // The hook will update the state locally. For a more robust solution, the backend should return the updated object.
    const updatedBoleto = await fetchBoletos(JSON.parse(sessionStorage.getItem('user_session') || '{}')).then(boletos => boletos.find(b => b.id === id));
    if (!updatedBoleto) throw new Error("Could not refetch updated boleto");
    return updatedBoleto;
};


export const updateBoletoComments = async (id: string, comments: string): Promise<Boleto> => {
    const response = await fetch(`${API_BASE_URL}/boletos/${id}/comments`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ comments }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update comments');
    }
    // Similar to status update, refetching the boleto as backend does not return it
    const updatedBoleto = await fetchBoletos(JSON.parse(sessionStorage.getItem('user_session') || '{}')).then(boletos => boletos.find(b => b.id === id));
    if (!updatedBoleto) throw new Error("Could not refetch updated boleto");
    return updatedBoleto;
};

export const removeBoleto = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/boletos/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete boleto');
    }
};


// --- Companies API ---

export const fetchCompanies = async (): Promise<Company[]> => {
    const response = await fetch(`${API_BASE_URL}/companies`, { headers: getHeaders() });
    return handleResponse(response);
};

export const createCompany = async (companyData: Omit<Company, 'id'>): Promise<Company> => {
    const response = await fetch(`${API_BASE_URL}/companies`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(companyData),
    });
    return handleResponse(response);
};

export const updateCompany = async (id: string, updates: Partial<Omit<Company, 'id'>>): Promise<Company> => {
    const response = await fetch(`${API_BASE_URL}/companies/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
    });
    return handleResponse(response);
};

export const deleteCompany = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/companies/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete company');
    }
};

// --- Users API ---

export const fetchUsers = async (): Promise<RegisteredUser[]> => {
    const response = await fetch(`${API_BASE_URL}/users`, { headers: getHeaders() });
    return handleResponse(response);
};

export const createUser = async (userData: Omit<RegisteredUser, 'id'>): Promise<RegisteredUser> => {
    const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
}

export const updateUser = async (id: string, updates: Partial<Omit<RegisteredUser, 'id'>>): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
    });
     if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
    }
};

export const deleteUser = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
    }
};

// --- Logs API ---

export const fetchLogs = async (): Promise<LogEntry[]> => {
    const response = await fetch(`${API_BASE_URL}/logs`, { headers: getHeaders() });
    return handleResponse(response);
}

// --- Settings API ---

export const updateSettings = async (settings: Record<string, any>): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(settings)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
    }
};