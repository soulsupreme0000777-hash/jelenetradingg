
import { AttendanceLog, ScanType, DailyRecord, Schedule, ArrivalStatus, DepartureStatus, PayrollConfig, SalarySlip, Employee } from '../types';

// Strictly format date to YYYY-MM-DD in Philippine Standard Time
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

export const formatTime = (isoString: string | null): string => {
  if (!isoString) return '--:--';
  // Display time in PHT with 12-hour format
  return new Date(isoString).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Converts "13:00" to "1:00 PM"
export const formatTimeString = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour = parseInt(hourStr);
    const minute = parseInt(minuteStr);
    
    if (isNaN(hour) || isNaN(minute)) return timeStr;

    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // the hour '0' should be '12'
    
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

// Returns a Date object shifted to PH time for Logic calculations
export const getPHTDate = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
};

// Helper to add hours to a time string "HH:mm"
const addHoursToTime = (timeStr: string, hours: number): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h + hours + (m / 60);
};

// Convert HH:mm to minutes from midnight
const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

// Get minutes from midnight for a Date object (PHT)
const dateToMinutes = (date: Date): number => {
    return date.getHours() * 60 + date.getMinutes();
};

export const determineScanType = (
  existingLogs: AttendanceLog[],
  currentTime: Date,
  schedule?: Schedule
): ScanType => {
  const todaysLogs = existingLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  const hasAmIn = todaysLogs.some(l => l.type === ScanType.AM_IN);
  const hasAmOut = todaysLogs.some(l => l.type === ScanType.AM_OUT);
  const hasPmIn = todaysLogs.some(l => l.type === ScanType.PM_IN);

  const timeValue = currentTime.getHours() + (currentTime.getMinutes() / 60);

  let breakStart = 12;
  let breakEnd = 13;

  if (schedule) {
    const startVal = addHoursToTime(schedule.startTime, 0);
    breakStart = startVal + 4;
    breakEnd = breakStart + 1;
  }

  if (hasPmIn) return ScanType.PM_OUT;
  if ((hasAmIn && hasAmOut) || (!hasAmIn && timeValue >= breakEnd)) return ScanType.PM_IN;
  if (hasAmIn && !hasAmOut) return ScanType.AM_OUT;
  return ScanType.AM_IN;
};

export const calculateDailyRecord = (date: string, logs: AttendanceLog[], schedule?: Schedule): DailyRecord => {
    const dayLogs = logs.filter(l => l.date === date);
    const getLog = (type: ScanType) => dayLogs.find(l => l.type === type)?.timestamp || null;

    const amIn = getLog(ScanType.AM_IN);
    const amOut = getLog(ScanType.AM_OUT);
    const pmIn = getLog(ScanType.PM_IN);
    const pmOut = getLog(ScanType.PM_OUT);

    const isPresent = !!amIn || !!pmIn;
    const isComplete = (!!amIn && !!amOut && !!pmIn && !!pmOut);

    let arrivalStatus: ArrivalStatus | undefined;
    let departureStatus: DepartureStatus | undefined;
    let lateMinutes = 0;
    let undertimeMinutes = 0;
    let hoursWorked = 0; 

    // --- ARRIVAL LOGIC ---
    if (schedule && amIn) {
        const phtDate = new Date(new Date(amIn).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const arrivalMinutes = dateToMinutes(phtDate);
        const schedStartMinutes = timeToMinutes(schedule.startTime);

        const diff = arrivalMinutes - schedStartMinutes;

        if (diff < -15) arrivalStatus = 'EARLY';
        else if (diff > 15) {
            arrivalStatus = 'LATE';
            lateMinutes = diff;
        }
        else arrivalStatus = 'ON_TIME';
    }

    // --- DEPARTURE LOGIC ---
    if (schedule && pmOut) {
        const phtDate = new Date(new Date(pmOut).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const departureMinutes = dateToMinutes(phtDate);
        const schedEndMinutes = timeToMinutes(schedule.endTime);

        if (departureMinutes < schedEndMinutes) {
            departureStatus = 'UNDER_TIME';
            undertimeMinutes = schedEndMinutes - departureMinutes;
        } else {
            departureStatus = 'ON_TIME'; 
        }
    }

    // --- HOURS WORKED CALCULATION ---
    if (amIn && pmOut) {
         const start = new Date(amIn).getTime();
         let end = new Date(pmOut).getTime();

         if (schedule) {
             const pmOutDate = new Date(pmOut);
             const [sH, sM] = schedule.endTime.split(':').map(Number);
             const scheduledEndDate = new Date(pmOutDate);
             scheduledEndDate.setHours(sH, sM, 0, 0);

             if (pmOutDate.getTime() > scheduledEndDate.getTime()) {
                 end = scheduledEndDate.getTime();
             }
         }

         const hours = (end - start) / (1000 * 60 * 60);
         hoursWorked = Math.max(0, hours - 1); 
    }

    return {
        date,
        amIn,
        amOut,
        pmIn,
        pmOut,
        status: isComplete ? 'PRESENT' : (isPresent ? 'INCOMPLETE' : 'ABSENT'),
        arrivalStatus,
        departureStatus,
        lateMinutes,
        undertimeMinutes,
        hoursWorked
    };
};

// Helper: Adjust date if it falls on Sunday, move to Saturday (Day-1)
const adjustPayoutDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDay(); // 0 = Sunday
    if (day === 0) {
        date.setDate(date.getDate() - 1);
        return formatDate(date);
    }
    return dateStr;
};

export const calculatePayroll = (
    employee: Employee, 
    records: DailyRecord[], 
    config: PayrollConfig, 
    periodStart: string,
    periodEnd: string,
    isEndPeriod: boolean // True if this is the 2nd half of the month (16-End)
): SalarySlip => {
    let basePay = 0;
    let totalLateDeduction = 0;
    let totalUndertimeDeduction = 0;
    let daysPresent = 0;

    const rateKey = `${employee.position}|${employee.branch}`;
    const dailyRate = config.rates[rateKey] || 0;

    records.forEach(r => {
        if(r.status === 'PRESENT' || r.status === 'INCOMPLETE') {
            daysPresent++;
            basePay += dailyRate;

            if(r.lateMinutes > config.gracePeriodMinutes) {
                totalLateDeduction += r.lateMinutes * config.lateDeductionPerMinute;
            }
            totalUndertimeDeduction += r.undertimeMinutes * config.lateDeductionPerMinute;
        }
    });

    // MEAL ALLOWANCE: Only applied on the 2nd period (Once a month)
    let mealAllowance = 0;
    const isEligibleForMealAllowance = config.mealAllowanceEligiblePositions?.includes(employee.position);
    
    if(isEndPeriod && daysPresent > 0 && isEligibleForMealAllowance) {
        mealAllowance = config.mealAllowance; 
    }

    // BIRTHDAY BONUS: Only applied on the 2nd period if it's the birth month
    let birthMonthBonus = 0;
    const birthMonth = new Date(employee.birthday).getMonth() + 1;
    const currentMonth = parseInt(periodStart.split('-')[1]);
    
    if (isEndPeriod && currentMonth === birthMonth) {
        birthMonthBonus = config.birthMonthBonus;
    }

    const netPay = basePay + mealAllowance + birthMonthBonus - totalLateDeduction - totalUndertimeDeduction;

    // Calculate Payout Date (Based on periodEnd, adjusted if Sunday)
    const payoutDate = adjustPayoutDate(periodEnd);

    return {
        employeeId: employee.id,
        periodStart,
        periodEnd,
        payoutDate,
        dailyRateUsed: dailyRate,
        basePay,
        totalLateDeduction,
        totalUndertimeDeduction,
        mealAllowance,
        birthMonthBonus,
        netPay,
        daysPresent
    };
};
