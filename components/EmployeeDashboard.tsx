
import React, { useEffect, useState } from 'react';
import { db } from '../services/database';
import { Employee, AttendanceLog, Schedule, LeaveRequest } from '../types';
import { calculateDailyRecord, formatTime, formatDate, formatTimeString } from '../services/attendanceLogic';
import { CalendarDays, AlertCircle } from 'lucide-react';

interface Props {
    user: Employee;
}

export const EmployeeDashboard: React.FC<Props> = ({ user }) => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      // Logic update ensures this is always PHT YYYY-MM-DD
      const today = formatDate(new Date());
      const allLogs = await db.logs.list();
      const myLogs = allLogs.filter(l => l.employeeId === user.id);
      setLogs(myLogs);
      const myLeaves = await db.leaves.getByEmployee(user.id);
      setLeaves(myLeaves);
      
      // Fetch upcoming schedules (Future dates)
      const scheds = await db.schedules.getUpcoming(user.id);
      setSchedules(scheds);
      
      const todaySched = scheds.find(s => s.date === today);
      setTodayRecord(calculateDailyRecord(today, myLogs, todaySched));
    };
    fetchData();
  }, [user]);

  const handleRequestLeave = async (e: React.FormEvent) => {
      e.preventDefault();
      const currentMonth = leaveDate.slice(0, 7);
      const monthlyLeaves = leaves.filter(l => l.date.startsWith(currentMonth) && l.status === 'APPROVED');
      const isEmergency = monthlyLeaves.length >= 3;
      if (isEmergency && !window.confirm("Limit reached. This will be marked as Emergency Leave. Proceed?")) return;

      try {
          await db.leaves.request({ employeeId: user.id, date: leaveDate, reason: leaveReason, isEmergency });
          if (isEmergency) await db.employees.update(user.id, { leaveDeductionNextMonth: user.leaveDeductionNextMonth + 1 });
          alert(isEmergency ? "Emergency Leave Requested" : "Day Off Requested");
          setLeaveDate(''); setLeaveReason('');
          setLeaves(await db.leaves.getByEmployee(user.id));
      } catch (err: any) { alert("Error: " + err.message); }
  };

  const todaySched = schedules.find(s => s.date === formatDate(new Date()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Sidebar: Profile & Actions */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Profile Card */}
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
            {/* Reduced Banner Height to h-14 */}
            <div className="h-14 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-80"></div>
            <div className="px-6 pb-6">
                <div className="flex items-end gap-5">
                    {/* Avatar - Negative margin pulls it up, Flexbox keeps it separate from text */}
                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 p-1 shadow-xl shrink-0 -mt-8 relative z-10">
                         {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-xl border border-zinc-700" />
                         ) : (
                            <div className="w-full h-full bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 font-bold text-lg border border-zinc-700">
                                {user.firstName[0]}{user.lastName[0]}
                            </div>
                         )}
                    </div>
                    
                    {/* Text Container - Sits to the right, no overlap */}
                    <div className="mb-0.5 min-w-0">
                        <h2 className="text-lg font-bold text-zinc-100 leading-tight truncate">{user.firstName} {user.lastName}</h2>
                        <p className="text-violet-400 font-medium text-xs truncate">{user.position}</p>
                    </div>
                </div>
                
                <div className="flex gap-2 mt-5">
                    <Badge label={user.branch} color="bg-zinc-800 text-zinc-400 border-zinc-700" />
                    <Badge label={`ID: ${user.id}`} color="bg-zinc-800 text-zinc-500 border-zinc-700 font-mono" />
                </div>
            </div>
        </div>

        {/* Schedule Widget */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <CalendarDays size={80} className="text-white" />
             </div>
             <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-2">Today's Shift</p>
             <h3 className="text-3xl font-bold text-white tracking-tight">
                {todaySched ? `${formatTimeString(todaySched.startTime)} - ${formatTimeString(todaySched.endTime)}` : 'No Schedule'}
             </h3>
             {todaySched && <p className="text-emerald-400 text-sm font-medium mt-1">On Duty</p>}
        </div>

        {/* Leave Request */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h3 className="font-bold text-zinc-100 mb-4 flex items-center gap-2">
                Request Day Off 
                <span className="text-xs font-normal text-zinc-500 ml-auto bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                    {leaves.filter(l => l.status === 'APPROVED').length}/3 Used
                </span>
            </h3>
            <form onSubmit={handleRequestLeave} className="space-y-3">
                <input required type="date" className="input-field" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} />
                <textarea required placeholder="Reason for leave..." className="input-field min-h-[80px]" value={leaveReason} onChange={e => setLeaveReason(e.target.value)} />
                <button type="submit" className="w-full bg-zinc-100 text-zinc-900 py-3 rounded-xl font-bold hover:bg-white transition-colors">
                    Submit Request
                </button>
            </form>
        </div>
      </div>

      {/* Main Content: Stats & Lists */}
      <div className="lg:col-span-2 space-y-6">
         
         {/* Live Status Grid */}
         <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-zinc-100">Live Pulse</h3>
                <div className="flex gap-2">
                    {todayRecord?.arrivalStatus && <StatusPill status={todayRecord.arrivalStatus} />}
                    {todayRecord?.departureStatus && <StatusPill status={todayRecord.departureStatus} />}
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['amIn', 'amOut', 'pmIn', 'pmOut'].map((key) => {
                    const time = todayRecord?.[key];
                    return (
                        <div key={key} className={`p-5 rounded-2xl border transition-all ${
                            time ? 'bg-violet-600/10 border-violet-500/30' : 'bg-zinc-950/50 border-zinc-800 border-dashed'
                        }`}>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <p className={`text-xl font-mono font-bold ${time ? 'text-violet-400' : 'text-zinc-700'}`}>
                                {formatTime(time)}
                            </p>
                        </div>
                    );
                })}
            </div>
         </div>

         {/* Upcoming List */}
         <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
             <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                <h3 className="font-bold text-zinc-100 text-sm uppercase tracking-wide">Upcoming Schedule</h3>
             </div>
             <div className="divide-y divide-zinc-800/50">
                {schedules.length > 0 ? (
                    schedules.map(s => (
                        <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-zinc-800 text-zinc-400 p-2.5 rounded-xl border border-zinc-700"><CalendarDays size={18} /></div>
                                <div>
                                    <p className="font-bold text-zinc-200 text-sm">{new Date(s.date).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}</p>
                                </div>
                            </div>
                            <p className="font-mono text-sm text-zinc-500 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">{formatTimeString(s.startTime)} - {formatTimeString(s.endTime)}</p>
                        </div>
                    ))
                ) : (
                    <p className="p-8 text-center text-zinc-600 text-sm">No upcoming schedules found.</p>
                )}
             </div>
         </div>
      </div>

      <style>{`
        .input-field {
            width: 100%; padding: 0.75rem; background-color: #09090b; border: 1px solid #27272a;
            border-radius: 0.75rem; color: #f4f4f5; font-size: 0.875rem; outline: none; transition: all 0.2s;
        }
        .input-field:focus { border-color: #7c3aed; }
      `}</style>
    </div>
  );
};

const Badge = ({ label, color }: any) => (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${color}`}>{label}</span>
);

const StatusPill = ({ status }: { status: string }) => {
    let color = 'bg-zinc-800 text-zinc-400';
    if (status === 'LATE' || status === 'UNDER_TIME') color = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    else if (status === 'EARLY') color = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    else if (status.includes('ON_TIME')) color = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${color}`}>{status.replace('_', ' ')}</span>
};
