import { Employee, AttendanceLog, ScanType } from '../types';

// Initial Mock Data
const INITIAL_EMPLOYEES: Employee[] = [
  { 
    id: 'EMP001', 
    firstName: 'Alex', 
    middleName: 'M', 
    lastName: 'Rivera', 
    position: 'Regular Staff', 
    branch: 'Cabanatuan', 
    birthday: '1990-01-01',
    age: 34,
    hiredDate: '2022-01-01',
    phone: '09000000000',
    email: 'alex@example.com',
    isActive: true,
    leaveDeductionNextMonth: 0
  },
  { 
    id: 'EMP002', 
    firstName: 'Sarah', 
    middleName: 'J', 
    lastName: 'Jenkins', 
    position: 'Branch Manager', 
    branch: 'Solano', 
    birthday: '1985-05-15',
    age: 39,
    hiredDate: '2020-03-15',
    phone: '09000000001',
    email: 'sarah@example.com',
    isActive: true,
    leaveDeductionNextMonth: 0
  },
  { 
    id: 'EMP003', 
    firstName: 'Miguel', 
    middleName: 'D', 
    lastName: 'Santos', 
    position: 'Team Leader', 
    branch: 'Cabanatuan', 
    birthday: '1988-11-30',
    age: 36,
    hiredDate: '2019-06-20',
    phone: '09000000002',
    email: 'miguel@example.com',
    isActive: true,
    leaveDeductionNextMonth: 0
  },
  { 
    id: 'EMP004', 
    firstName: 'Diana', 
    middleName: 'P', 
    lastName: 'Prince', 
    position: 'Regular Staff', 
    branch: 'Solano', 
    birthday: '1995-02-14',
    age: 29,
    hiredDate: '2023-01-10',
    phone: '09000000003',
    email: 'diana@example.com',
    isActive: true,
    leaveDeductionNextMonth: 0
  },
];

const STORAGE_KEYS = {
  EMPLOYEES: 'nexus_dtr_employees',
  LOGS: 'nexus_dtr_logs',
};

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const db = {
  employees: {
    list: async (): Promise<Employee[]> => {
      await delay(300);
      const stored = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      if (!stored) {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
        return INITIAL_EMPLOYEES;
      }
      return JSON.parse(stored);
    },
    getById: async (id: string): Promise<Employee | undefined> => {
      const list = await db.employees.list();
      return list.find(e => e.id === id);
    }
  },
  logs: {
    list: async (): Promise<AttendanceLog[]> => {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
      return stored ? JSON.parse(stored) : [];
    },
    getByDate: async (date: string): Promise<AttendanceLog[]> => {
      const logs = await db.logs.list();
      return logs.filter(l => l.date === date);
    },
    add: async (log: Omit<AttendanceLog, 'id'>): Promise<AttendanceLog> => {
      await delay(400); // Simulate API call
      const logs = await db.logs.list();
      const newLog: AttendanceLog = { ...log, id: crypto.randomUUID() };
      logs.push(newLog);
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      return newLog;
    }
  },
  utils: {
    reset: () => {
      localStorage.removeItem(STORAGE_KEYS.LOGS);
      localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
      window.location.reload();
    }
  }
};
