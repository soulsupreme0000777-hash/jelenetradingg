
export type Branch = string; // Now dynamic
export type Position = string; // Now dynamic

// Defaults for fallback
export const DEFAULT_POSITIONS: string[] = ['Branch Manager', 'Team Leader', 'Regular Staff'];
export const DEFAULT_BRANCHES: string[] = ['Cabanatuan', 'Solano'];

export interface Employee {
  id: string; // Manual ID
  firstName: string;
  middleName: string;
  lastName: string;
  birthday: string; // YYYY-MM-DD
  age: number;
  hiredDate: string;
  phone: string;
  email: string;
  password?: string; // Only used for creation/auth
  branch: string;
  position: string;
  avatarUrl?: string;
  isActive: boolean;
  leaveDeductionNextMonth: number;
}

export interface Schedule {
  id?: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export enum ScanType {
  AM_IN = 'AM_IN',
  AM_OUT = 'AM_OUT',
  PM_IN = 'PM_IN',
  PM_OUT = 'PM_OUT',
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  timestamp: string; // ISO String
  date: string; // YYYY-MM-DD
  type: ScanType;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  date: string;
  reason: string;
  isEmergency: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export type ArrivalStatus = 'EARLY' | 'ON_TIME' | 'LATE';
export type DepartureStatus = 'UNDER_TIME' | 'ON_TIME' | 'OVERTIME';

export interface DailyRecord {
  date: string;
  amIn: string | null;
  amOut: string | null;
  pmIn: string | null;
  pmOut: string | null;
  status: 'PRESENT' | 'ABSENT' | 'INCOMPLETE' | 'LEAVE' | 'DAY_OFF';
  arrivalStatus?: ArrivalStatus;
  departureStatus?: DepartureStatus;
  lateMinutes: number;
  undertimeMinutes: number;
  hoursWorked: number;
}

export interface PayrollConfig {
  id?: string;
  rates: Record<string, number>; // Key format: "Position|Branch"
  gracePeriodMinutes: number;
  lateDeductionPerMinute: number;
  mealAllowance: number;
  birthMonthBonus: number;
  
  // Dynamic Configuration Lists
  positions: string[];
  branches: string[];
  mealAllowanceEligiblePositions: string[];
}

export interface SalarySlip {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  payoutDate: string; // Adjusted for Sundays
  dailyRateUsed: number;
  basePay: number;
  totalLateDeduction: number;
  totalUndertimeDeduction: number;
  mealAllowance: number;
  birthMonthBonus: number;
  netPay: number;
  daysPresent: number;
}
