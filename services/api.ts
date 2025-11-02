// FIX: Import RegisteredUser to resolve reference error.
import { Boleto, BoletoStatus, User, Company, RegisteredUser } from '../types';

const BOLETOS_DB_KEY = 'boletos';
const COMPANIES_DB_KEY = 'companies';
const SIMULATED_DELAY = 500; // ms

// --- Helper Functions ---

const readFromStorage = <T>(key: string): T[] => {
  try {
    const storedData = localStorage.getItem(key);
    return storedData ? JSON.parse(storedData) : [];
  } catch (error) {
    console.error(`Failed to parse ${key} from localStorage`, error);
    localStorage.removeItem(key);
    return [];
  }
};

const writeToStorage = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- Boletos API ---

export const fetchBoletos = (user: User): Promise<Boleto[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const boletos = readFromStorage<Boleto>(BOLETOS_DB_KEY);
      if (user.role === 'admin' && !user.companyId) {
        resolve(boletos); // Super admin (no company) sees all boletos
      } else if (user.companyId) {
        resolve(boletos.filter(b => b.companyId === user.companyId));
      } else {
        resolve([]); // User with no company assigned sees no boletos
      }
    }, SIMULATED_DELAY);
  });
};

export const createBoleto = (boleto: Boleto): Promise<Boleto> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const boletos = readFromStorage<Boleto>(BOLETOS_DB_KEY);
      if (!boletos.some(b => b.id === boleto.id)) {
        const updatedBoletos = [boleto, ...boletos];
        writeToStorage(BOLETOS_DB_KEY, updatedBoletos);
      }
      resolve(boleto);
    }, SIMULATED_DELAY / 2);
  });
};

export const updateBoleto = (id: string, status: BoletoStatus): Promise<Boleto> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const boletos = readFromStorage<Boleto>(BOLETOS_DB_KEY);
        let updatedBoleto: Boleto | null = null;
        const updatedBoletos = boletos.map(b => {
          if (b.id === id) {
            updatedBoleto = { ...b, status };
            return updatedBoleto;
          }
          return b;
        });
  
        if (updatedBoleto) {
          writeToStorage(BOLETOS_DB_KEY, updatedBoletos);
          resolve(updatedBoleto);
        } else {
          reject(new Error("Boleto not found"));
        }
      }, SIMULATED_DELAY / 2);
    });
};

export const updateBoletoComments = (id: string, comments: string): Promise<Boleto> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const boletos = readFromStorage<Boleto>(BOLETOS_DB_KEY);
            let updatedBoleto: Boleto | null = null;
            const updatedBoletos = boletos.map(b => {
                if (b.id === id) {
                    updatedBoleto = { ...b, comments };
                    return updatedBoleto;
                }
                return b;
            });

            if (updatedBoleto) {
                writeToStorage(BOLETOS_DB_KEY, updatedBoletos);
                resolve(updatedBoleto);
            } else {
                reject(new Error("Boleto not found"));
            }
        }, SIMULATED_DELAY / 2);
    });
};

export const removeBoleto = (id: string): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const boletos = readFromStorage<Boleto>(BOLETOS_DB_KEY);
            const updatedBoletos = boletos.filter(b => b.id !== id);
            writeToStorage(BOLETOS_DB_KEY, updatedBoletos);
            resolve();
        }, SIMULATED_DELAY / 2);
    });
};

// --- Companies API ---

export const fetchCompanies = (): Promise<Company[]> => {
    return new Promise(resolve => {
        setTimeout(() => resolve(readFromStorage<Company>(COMPANIES_DB_KEY)), SIMULATED_DELAY / 2);
    });
};

export const createCompany = (companyData: Omit<Company, 'id'>): Promise<Company> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const companies = readFromStorage<Company>(COMPANIES_DB_KEY);
            const newCompany: Company = { ...companyData, id: crypto.randomUUID() };
            writeToStorage(COMPANIES_DB_KEY, [...companies, newCompany]);
            resolve(newCompany);
        }, SIMULATED_DELAY / 2);
    });
};

export const updateCompany = (id: string, updates: Partial<Omit<Company, 'id'>>): Promise<Company> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const companies = readFromStorage<Company>(COMPANIES_DB_KEY);
            let updatedCompany: Company | null = null;
            const updatedCompanies = companies.map(c => {
                if (c.id === id) {
                    updatedCompany = { ...c, ...updates };
                    return updatedCompany;
                }
                return c;
            });
            if (updatedCompany) {
                writeToStorage(COMPANIES_DB_KEY, updatedCompanies);
                resolve(updatedCompany);
            } else {
                reject(new Error("Company not found"));
            }
        }, SIMULATED_DELAY / 2);
    });
};

export const deleteCompany = (id: string): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const companies = readFromStorage<Company>(COMPANIES_DB_KEY);
            writeToStorage(COMPANIES_DB_KEY, companies.filter(c => c.id !== id));
            // Also un-assign users from this company
            const users = readFromStorage<RegisteredUser>('registered_users').map(u => {
                if (u.companyId === id) {
                    return { ...u, companyId: undefined };
                }
                return u;
            });
            writeToStorage('registered_users', users);
            resolve();
        }, SIMULATED_DELAY / 2);
    });
};

// --- Real API Calls ---
// NOTE: The following functions interact with the real backend API.
// They are being added to support new features that require database persistence.

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

export const updateSettings = async (settings: Record<string, any>): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
        throw new Error("Authentication token not found.");
    }

    const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
    }
};