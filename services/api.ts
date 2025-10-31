import { Boleto, BoletoStatus } from '../types';

const DB_KEY = 'boletos';
const SIMULATED_DELAY = 500; // ms

// --- Helper Functions ---

const readFromStorage = (): Boleto[] => {
  try {
    const storedBoletos = localStorage.getItem(DB_KEY);
    return storedBoletos ? JSON.parse(storedBoletos) : [];
  } catch (error) {
    console.error("Failed to parse boletos from localStorage", error);
    localStorage.removeItem(DB_KEY);
    return [];
  }
};

const writeToStorage = (boletos: Boleto[]) => {
  localStorage.setItem(DB_KEY, JSON.stringify(boletos));
};

// --- Simulated API Endpoints ---

/**
 * Fetches all boletos from the database.
 * @returns A promise that resolves to an array of boletos.
 */
export const fetchBoletos = (): Promise<Boleto[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const boletos = readFromStorage();
      resolve(boletos);
    }, SIMULATED_DELAY);
  });
};

/**
 * Creates a new boleto in the database.
 * @param boleto - The boleto object to create.
 * @returns A promise that resolves to the newly created boleto.
 */
export const createBoleto = (boleto: Boleto): Promise<Boleto> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const boletos = readFromStorage();
      // Ensure no duplicates are added, although this should be checked before calling.
      if (!boletos.some(b => b.id === boleto.id)) {
        const updatedBoletos = [boleto, ...boletos];
        writeToStorage(updatedBoletos);
      }
      resolve(boleto);
    }, SIMULATED_DELAY / 2); // Faster create time
  });
};

/**
 * Updates the status of an existing boleto.
 * @param id - The ID of the boleto to update.
 * @param status - The new status for the boleto.
 * @returns A promise that resolves to the updated boleto.
 */
export const updateBoleto = (id: string, status: BoletoStatus): Promise<Boleto> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const boletos = readFromStorage();
        let updatedBoleto: Boleto | null = null;
        const updatedBoletos = boletos.map(b => {
          if (b.id === id) {
            updatedBoleto = { ...b, status };
            return updatedBoleto;
          }
          return b;
        });
  
        if (updatedBoleto) {
          writeToStorage(updatedBoletos);
          resolve(updatedBoleto);
        } else {
          reject(new Error("Boleto not found"));
        }
      }, SIMULATED_DELAY / 2);
    });
};

/**
 * Deletes a boleto from the database.
 * @param id - The ID of the boleto to delete.
 * @returns A promise that resolves when the operation is complete.
 */
export const removeBoleto = (id: string): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const boletos = readFromStorage();
            const updatedBoletos = boletos.filter(b => b.id !== id);
            writeToStorage(updatedBoletos);
            resolve();
        }, SIMULATED_DELAY / 2);
    });
};
