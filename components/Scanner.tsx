
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle2, User, ShieldCheck, Keyboard } from 'lucide-react';
import { db } from '../services/database';
import { determineScanType, formatTime, getPHTDate, formatDate } from '../services/attendanceLogic';
import { Employee, ScanType } from '../types';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerProps {
  onScanSuccess?: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess }) => {
  const [lastScan, setLastScan] = useState<{ employee: Employee; type: ScanType; time: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(getPHTDate());
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualId, setManualId] = useState('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handleScanRef = useRef<(id: string) => void>(() => {});

  // Local cooldown Ref: Maps EmployeeID -> Timestamp of last successful local scan
  const recentScansRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getPHTDate()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleScan = useCallback(async (employeeId: string) => {
    // 1. Block if we are already processing a VALID DB request.
    if (processing) return;

    const now = Date.now();
    
    // 2. Check Local Cooldown (Strictly per Employee ID)
    const lastTime = recentScansRef.current.get(employeeId);
    
    // If THIS specific employee scanned in the last 60 seconds, block them.
    if (lastTime && (now - lastTime < 60000)) {
        // Only update error if it's not already showing (prevents flickering)
        setError((prev) => prev === "Duplicate Scan. Please wait." ? prev : "Duplicate Scan. Please wait.");
        
        // Clear this specific error after 2 seconds
        setTimeout(() => setError(null), 2000);
        return; 
        // We return early, but we do NOT set 'processing' to true.
        // This keeps the scanner active so a DIFFERENT employee can scan immediately.
    }

    // 3. If we pass the check, it means it's a NEW valid scan (or cooldown expired).
    // Immediately clear any previous errors (like a previous user's Duplicate error)
    setError(null);
    setProcessing(true); // Lock the scanner for DB operations
    
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
        try { scanner.pause(true); } catch (e) { console.warn("Pause warning:", e); }
    }

    try {
      const employee = await db.employees.getById(employeeId);
      if (!employee || !employee.isActive) throw new Error('Employee ID not found or inactive.');

      const today = formatDate(currentTime);
      const allLogs = await db.logs.list();
      const employeeTodayLogs = allLogs.filter(l => l.employeeId === employee.id && l.date === today);
      
      const monthStr = today.slice(0, 7);
      const schedules = await db.schedules.get(employee.id, monthStr);
      const todaySched = schedules.find(s => s.date === today);

      const scanType = determineScanType(employeeTodayLogs, currentTime, todaySched);

      // DB-side Duplicate Check (Double safety for network lag)
      const lastLog = employeeTodayLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (lastLog) {
         const diff = new Date().getTime() - new Date(lastLog.timestamp).getTime();
         // If a log of the SAME type exists within 5 minutes, block it
         if (diff < 300000 && lastLog.type === scanType) {
            throw new Error(`Duplicate scan. Already clocked ${scanType.replace('_', ' ')}.`);
         }
      }

      await db.logs.add({
        employeeId: employee.id,
        timestamp: new Date().toISOString(),
        date: today,
        type: scanType
      });

      // Update local cooldown for THIS employee
      recentScansRef.current.set(employeeId, Date.now());

      setLastScan({
        employee,
        type: scanType,
        time: formatTime(new Date().toISOString())
      });
      
      setManualId('');
      setShowManualInput(false);
      if (onScanSuccess) onScanSuccess();

      // Show success screen for 3 seconds, then unlock
      setTimeout(() => {
        setLastScan(null);
        setProcessing(false);
        const s = scannerRef.current;
        if (s) { try { s.resume(); } catch (e) { console.warn("Resume warning:", e); } }
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Scan failed.');
      setTimeout(() => {
          setError(null);
          setProcessing(false);
          const s = scannerRef.current;
          if (s) { try { s.resume(); } catch (e) { console.warn("Resume warning:", e); } }
      }, 3000);
    }
  }, [processing, currentTime, onScanSuccess]);

  useEffect(() => { handleScanRef.current = handleScan; }, [handleScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (manualId) handleScan(manualId);
  };

  useEffect(() => {
    if (showManualInput) return;
    let isMounted = true;
    const scannerId = "qr-reader";

    const initTimer = setTimeout(async () => {
        if (!isMounted || !document.getElementById(scannerId)) return;
        if (!scannerRef.current) scannerRef.current = new Html5Qrcode(scannerId);
        const scanner = scannerRef.current;
        if (scanner.isScanning) return;

        try {
            await scanner.start(
                { facingMode: "user" }, // Use user facing camera for kiosk feel
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, disableFlip: false },
                (decodedText) => { if (isMounted && handleScanRef.current) handleScanRef.current(decodedText); },
                () => {}
            );
        } catch (err: any) {
            if (isMounted && !String(err).includes("already started")) setError("Camera access denied.");
        }
    }, 500);

    return () => {
        isMounted = false;
        clearTimeout(initTimer);
        const scanner = scannerRef.current;
        if (scanner && scanner.isScanning) scanner.stop().catch(console.warn);
    };
  }, [showManualInput]); 

  return (
    <div className="w-full max-w-md mx-auto p-1 bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 flex flex-col h-[750px] relative overflow-hidden group">
      {/* Decorative Glows */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-50"></div>
      
      <div className="bg-zinc-950 rounded-[20px] h-full flex flex-col p-6 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-6 flex flex-col items-center">
            <img src="https://i.imgur.com/legjheA.png" alt="Logo" className="h-12 w-auto mb-2 object-contain" />
            <div className="flex items-center justify-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-zinc-500 text-xs font-mono uppercase">Kiosk Online</p>
            </div>
        </div>

        {/* Clock Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/50"></div>
            <div className="relative z-10">
                <div className="text-[10px] font-bold text-violet-500 uppercase tracking-widest mb-1">Philippine Standard Time</div>
                <div className="text-4xl font-mono font-bold text-zinc-100 tracking-tight drop-shadow-lg">
                {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-zinc-500 text-xs mt-1 font-medium">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
        </div>

        {/* Viewfinder / Input Area */}
        <div className="relative flex-1 bg-black rounded-2xl overflow-hidden mb-6 flex flex-col items-center justify-center border-2 border-zinc-800 shadow-inner">
            
            <div id="qr-reader" className={`w-full h-full object-cover ${showManualInput ? 'hidden' : 'block'}`}></div>

            {/* Status Overlays */}
            {lastScan ? (
            <div className="absolute inset-0 bg-zinc-950/95 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-400">Scan Verified</h3>
                <p className="text-zinc-400 font-medium text-lg mt-1">{lastScan.type.replace('_', ' ')}</p>
                <div className="mt-6 p-4 bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-xs mx-auto flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                        <User size={20} />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-zinc-100 text-lg leading-tight">{lastScan.employee.firstName} {lastScan.employee.lastName}</p>
                        <p className="text-xs text-zinc-500 mt-1 font-mono">{lastScan.time}</p>
                    </div>
                </div>
            </div>
            ) : error ? (
            <div className="absolute inset-0 bg-zinc-950/95 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
                <h3 className="text-xl font-bold text-rose-500">Scan Failed</h3>
                <p className="text-zinc-400 mt-2 mb-6 max-w-xs mx-auto text-sm">{error}</p>
                <div className="h-1 w-32 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 animate-[loading_2s_linear]"></div>
                </div>
            </div>
            ) : showManualInput ? (
                <div className="absolute inset-0 bg-zinc-950 z-10 flex flex-col items-center justify-center p-6 w-full">
                    <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                        <Keyboard className="text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-100 mb-6">Manual Override</h3>
                    <form onSubmit={handleManualSubmit} className="w-full max-w-xs space-y-4">
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Enter Employee ID" 
                            className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-lg text-zinc-100 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none placeholder-zinc-600 text-center tracking-widest font-mono"
                            value={manualId}
                            onChange={e => setManualId(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowManualInput(false)} className="flex-1 px-4 py-3 border border-zinc-700 text-zinc-400 rounded-xl font-medium hover:bg-zinc-800 transition-colors">Cancel</button>
                            <button type="submit" disabled={!manualId || processing} className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">Log</button>
                        </div>
                    </form>
                </div>
            ) : (
            /* Viewfinder UI */
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-zinc-500/30 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-violet-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-violet-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-violet-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-violet-500 rounded-br-xl"></div>
                    
                    {/* Scanning Line Animation */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.5)] animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
                <div className="absolute bottom-6 flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-md rounded-full border border-zinc-700/50">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span className="text-zinc-300 text-xs font-medium tracking-wide">Secure Link Active</span>
                </div>
            </div>
            )}
        </div>

        {/* Footer Toggle */}
        <div className="flex justify-center h-10">
            {!showManualInput && (
                <button 
                onClick={() => setShowManualInput(true)} 
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-violet-400 transition-colors"
                >
                <Keyboard size={14} /> Switch to Manual Entry
                </button>
            )}
        </div>
      </div>

      <style>{`
        #qr-reader video { object-fit: cover; height: 100%; width: 100%; transform: scaleX(-1); }
        @keyframes loading { from { width: 100%; } to { width: 0%; } }
        @keyframes scan { 
            0% { top: 0%; opacity: 0; } 
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; } 
        }
      `}</style>
    </div>
  );
};
