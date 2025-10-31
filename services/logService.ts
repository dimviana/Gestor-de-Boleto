import { LogEntry, User } from '../types';

const LOGS_KEY = 'activity_logs';

/**
 * Retrieves all logs from localStorage and sorts them by most recent.
 * @returns An array of LogEntry objects.
 */
export const getLogsFromStorage = (): LogEntry[] => {
  try {
    const storedLogs = localStorage.getItem(LOGS_KEY);
    const logs = storedLogs ? JSON.parse(storedLogs) : [];
    // Sort logs by timestamp, descending (most recent first)
    return logs.sort((a: LogEntry, b: LogEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error("Failed to parse logs from localStorage", error);
    localStorage.removeItem(LOGS_KEY);
    return [];
  }
};

/**
 * Writes a full array of logs to localStorage.
 * @param logs - The array of LogEntry objects to save.
 */
const writeLogsToStorage = (logs: LogEntry[]) => {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

/**
 * Adds a new log entry to the log store.
 * @param logData - The data for the new log, excluding id and timestamp.
 */
export const addLogEntry = (logData: Omit<LogEntry, 'id' | 'timestamp'>) => {
  const newLog: LogEntry = {
    ...logData,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  const logs = getLogsFromStorage();
  // Add the new log to the beginning for chronological order (if not sorting on read)
  const updatedLogs = [newLog, ...logs];
  writeLogsToStorage(updatedLogs);
};