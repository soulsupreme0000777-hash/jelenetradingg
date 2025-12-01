
import { supabase } from './supabaseClient';
import { Employee, AttendanceLog, Schedule, LeaveRequest, PayrollConfig, DEFAULT_POSITIONS, DEFAULT_BRANCHES } from '../types';

export const db = {
  auth: {
    login: async (email: string, password: string): Promise<{ user: Employee | null, isAdmin: boolean }> => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !data) return { user: null, isAdmin: false };
      
      if (!data.is_active) throw new Error("Account is deactivated.");

      const emp = mapToEmployee(data);
      return { 
        user: emp, 
        isAdmin: emp.id === 'ADMIN' || emp.position === 'Branch Manager'
      };
    }
  },
  employees: {
    list: async (): Promise<Employee[]> => {
      const { data, error } = await supabase.from('employees').select('*').order('last_name');
      if (error) return [];
      return data.map(mapToEmployee);
    },
    getById: async (id: string): Promise<Employee | undefined> => {
      const { data } = await supabase.from('employees').select('*').eq('id', id).single();
      return data ? mapToEmployee(data) : undefined;
    },
    create: async (emp: Omit<Employee, 'isActive' | 'leaveDeductionNextMonth'>) => {
      const { error } = await supabase.from('employees').insert([{
        id: emp.id,
        first_name: emp.firstName,
        middle_name: emp.middleName,
        last_name: emp.lastName,
        birthday: emp.birthday,
        age: emp.age,
        hired_date: emp.hiredDate,
        phone: emp.phone,
        email: emp.email,
        password: emp.password,
        branch: emp.branch,
        position: emp.position,
        avatar_url: emp.avatarUrl,
        is_active: true
      }]);
      if (error) throw error;
    },
    update: async (id: string, updates: Partial<Employee>) => {
      const dbUpdates: any = {};
      if (updates.firstName) dbUpdates.first_name = updates.firstName;
      if (updates.middleName) dbUpdates.middle_name = updates.middleName;
      if (updates.lastName) dbUpdates.last_name = updates.lastName;
      if (updates.birthday) dbUpdates.birthday = updates.birthday;
      if (updates.hiredDate) dbUpdates.hired_date = updates.hiredDate;
      if (updates.phone) dbUpdates.phone = updates.phone;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.branch) dbUpdates.branch = updates.branch;
      if (updates.position) dbUpdates.position = updates.position;
      if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
      
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.leaveDeductionNextMonth !== undefined) dbUpdates.leave_deduction_next_month = updates.leaveDeductionNextMonth;

      const { error } = await supabase.from('employees').update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    }
  },
  schedules: {
    set: async (schedules: Omit<Schedule, 'id'>[]) => {
      const { error } = await supabase.from('schedules').upsert(
        schedules.map(s => ({
          employee_id: s.employeeId,
          date: s.date,
          start_time: s.startTime,
          end_time: s.endTime
        })), { onConflict: 'employee_id, date' }
      );
      if (error) throw error;
    },
    get: async (employeeId: string, monthStr: string): Promise<Schedule[]> => {
      const [yearStr, monthPart] = monthStr.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthPart);

      const startDate = `${monthStr}-01`;
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) { nextMonth = 1; nextYear++; }
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      const { data } = await supabase.from('schedules').select('*').eq('employee_id', employeeId).gte('date', startDate).lt('date', endDate);
      
      return (data || []).map((s: any) => ({
        id: s.id, employeeId: s.employee_id, date: s.date, startTime: s.start_time, endTime: s.end_time
      }));
    },
    getRange: async (employeeId: string, startDate: string, endDate: string): Promise<Schedule[]> => {
       const { data } = await supabase.from('schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate);
      
       return (data || []).map((s: any) => ({
        id: s.id, employeeId: s.employee_id, date: s.date, startTime: s.start_time, endTime: s.end_time
      }));
    },
    getUpcoming: async (employeeId: string): Promise<Schedule[]> => {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const { data, error } = await supabase.from('schedules').select('*').eq('employee_id', employeeId).gte('date', today).order('date', { ascending: true }).limit(20);
      if (error) return [];
      return (data || []).map((s: any) => ({ id: s.id, employeeId: s.employee_id, date: s.date, startTime: s.start_time, endTime: s.end_time }));
    }
  },
  logs: {
    list: async (): Promise<AttendanceLog[]> => {
      const { data } = await supabase.from('attendance_logs').select('*').order('timestamp');
      return (data || []).map((l: any) => ({ id: l.id, employeeId: l.employee_id, timestamp: l.timestamp, date: l.date, type: l.type }));
    },
    getByMonth: async (employeeId: string, monthStr: string): Promise<AttendanceLog[]> => {
      const [yearStr, monthPart] = monthStr.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthPart);
      const startDate = `${monthStr}-01`;
      let nextMonth = month + 1;
      let nextYear = year;
      if (nextMonth > 12) { nextMonth = 1; nextYear++; }
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      const { data } = await supabase.from('attendance_logs').select('*').eq('employee_id', employeeId).gte('date', startDate).lt('date', endDate).order('timestamp');
      return (data || []).map((l: any) => ({ id: l.id, employeeId: l.employee_id, timestamp: l.timestamp, date: l.date, type: l.type }));
    },
    getByRange: async (employeeId: string, startDate: string, endDate: string): Promise<AttendanceLog[]> => {
      const { data } = await supabase.from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('timestamp');
      return (data || []).map((l: any) => ({ id: l.id, employeeId: l.employee_id, timestamp: l.timestamp, date: l.date, type: l.type }));
    },
    add: async (log: Omit<AttendanceLog, 'id'>) => {
      const { data, error } = await supabase.from('attendance_logs').insert([{ employee_id: log.employeeId, timestamp: log.timestamp, date: log.date, type: log.type }]).select().single();
      if (error) throw error;
      return data;
    }
  },
  leaves: {
    request: async (req: Omit<LeaveRequest, 'id' | 'status'>) => {
      const { error } = await supabase.from('leave_requests').insert([{ employee_id: req.employeeId, date: req.date, reason: req.reason, is_emergency: req.isEmergency }]);
      if (error) throw error;
    },
    getByEmployee: async (employeeId: string): Promise<LeaveRequest[]> => {
      const { data } = await supabase.from('leave_requests').select('*').eq('employee_id', employeeId);
      return (data || []).map(mapToLeave);
    }
  },
  payroll: {
    getConfig: async (): Promise<PayrollConfig> => {
      const { data, error } = await supabase.from('payroll_config').select('*').single();
      if (error || !data) {
        return {
          rates: {}, gracePeriodMinutes: 15, lateDeductionPerMinute: 5, mealAllowance: 100, birthMonthBonus: 1000,
          positions: DEFAULT_POSITIONS, branches: DEFAULT_BRANCHES, mealAllowanceEligiblePositions: ['Branch Manager', 'Team Leader']
        };
      }
      return {
        id: data.id, rates: data.rates || {}, gracePeriodMinutes: data.grace_period_minutes, lateDeductionPerMinute: data.late_deduction_per_minute,
        mealAllowance: data.meal_allowance, birthMonthBonus: data.birth_month_bonus, positions: data.positions || DEFAULT_POSITIONS,
        branches: data.branches || DEFAULT_BRANCHES, mealAllowanceEligiblePositions: data.meal_allowance_eligibility || ['Branch Manager', 'Team Leader']
      };
    },
    updateConfig: async (config: Partial<PayrollConfig>) => {
       const dbConfig: any = {};
       if(config.rates) dbConfig.rates = config.rates;
       if(config.gracePeriodMinutes) dbConfig.grace_period_minutes = config.gracePeriodMinutes;
       if(config.lateDeductionPerMinute) dbConfig.late_deduction_per_minute = config.lateDeductionPerMinute;
       if(config.mealAllowance) dbConfig.meal_allowance = config.mealAllowance;
       if(config.birthMonthBonus) dbConfig.birth_month_bonus = config.birthMonthBonus;
       if(config.positions) dbConfig.positions = config.positions;
       if(config.branches) dbConfig.branches = config.branches;
       if(config.mealAllowanceEligiblePositions) dbConfig.meal_allowance_eligibility = config.mealAllowanceEligiblePositions;

       const { data } = await supabase.from('payroll_config').select('id').limit(1);
       if (data && data.length > 0) {
           const { error } = await supabase.from('payroll_config').update(dbConfig).eq('id', data[0].id);
           if (error) throw error;
       } else {
           const { error } = await supabase.from('payroll_config').insert([dbConfig]);
           if (error) throw error;
       }
    }
  },
  storage: {
    uploadAvatar: async (file: File, path: string): Promise<string> => {
      const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path);
      return publicUrl;
    }
  }
};

const mapToEmployee = (data: any): Employee => ({
  id: data.id, firstName: data.first_name, middleName: data.middle_name || '', lastName: data.last_name,
  birthday: data.birthday, age: data.age, hiredDate: data.hired_date, phone: data.phone || '', email: data.email,
  branch: data.branch, position: data.position, isActive: data.is_active, avatarUrl: data.avatar_url,
  leaveDeductionNextMonth: data.leave_deduction_next_month || 0
});

const mapToLeave = (data: any): LeaveRequest => ({
  id: data.id, employeeId: data.employee_id, date: data.date, reason: data.reason, isEmergency: data.is_emergency, status: data.status
});
