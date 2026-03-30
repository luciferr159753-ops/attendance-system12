import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Users, Search, Send, Calendar as CalendarIcon, Filter, AlertCircle, ChevronDown, ChevronRight, Hash, Layers, ListFilter, ClipboardCheck, BarChart2, Download } from 'lucide-react';




const TeacherDashboard = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [section, setSection] = useState('Regular Class');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // View state
    const [view, setView] = useState('attendance');
    const [logs, setLogs] = useState([]);
    const [activeLogKey, setActiveLogKey] = useState(null);
    const [activeReportKey, setActiveReportKey] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Filter System States
    const [showFilters, setShowFilters] = useState(false);
    const [attFilter, setAttFilter] = useState({ departments: [], semesters: [], remember: false });
    const [qaFilter, setQaFilter] = useState({ departments: [], semesters: [], digitsIds: '' });

    // Load persistent filters
    useEffect(() => {
        const saved = localStorage.getItem('ams_attendance_filters');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.remember) setAttFilter(parsed);
        }
    }, []);

    useEffect(() => {
        if (attFilter.remember) {
            localStorage.setItem('ams_attendance_filters', JSON.stringify(attFilter));
        } else {
            localStorage.removeItem('ams_attendance_filters');
        }
    }, [attFilter]);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const { data } = await axios.get('/api/attendance/students');
                setStudents(data);
                
                const initial = {};
                data.forEach(s => initial[s._id] = 'Present');
                setAttendance(initial);
                
                const existing = await axios.get(`/api/attendance/teacher?date=${date}&section=${encodeURIComponent(section)}`);
                if (existing.data.length > 0) {
                    const existingMap = {};
                    existing.data.forEach(record => {
                        existingMap[record.student._id] = record.status;
                    });
                    setAttendance(prev => ({ ...prev, ...existingMap }));
                }

                // Fetch Logs if we enter log view
                const logsData = await axios.get('/api/attendance/teacher/logs');
                setLogs(logsData.data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudents();
    }, [date]);

    const handleStatusChange = (studentId, status) => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setMessage({ type: '', text: '' });
        
        try {
            const studentsAttendance = Object.keys(attendance).map(id => ({
                studentId: id,
                status: attendance[id]
            }));
            
            await axios.post('/api/attendance/mark', { studentsAttendance, date, section });
            setMessage({ type: 'success', text: 'Attendance records serialized & saved.' });
            
            // Refetch logs to stay updated
            const logsData = await axios.get('/api/attendance/teacher/logs');
            setLogs(logsData.data);
            
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to synchronize with server' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (s.rollNumber && s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()));
                              
        const matchesDept = attFilter.departments.length === 0 || attFilter.departments.includes(s.department);
        const matchesSem = attFilter.semesters.length === 0 || attFilter.semesters.includes(s.semester);
        
        return matchesSearch && matchesDept && matchesSem;
    });

    const availableDepartments = [...new Set(students.map(s => s.department).filter(Boolean))];
    const availableSemesters = [...new Set(students.map(s => s.semester).filter(Boolean))].sort();

    const handleQuickAbsent = () => {
        if (!qaFilter.digitsIds.trim()) {
            setMessage({ type: 'error', text: 'Please enter roll terminal digits.' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return;
        }
        
        const digitList = qaFilter.digitsIds.split(',').map(d => d.trim()).filter(Boolean);
        const newAttendance = { ...attendance };
        let markedCount = 0;
        
        students.forEach(s => {
            const matchesDept = qaFilter.departments.length === 0 || qaFilter.departments.includes(s.department);
            const matchesSem = qaFilter.semesters.length === 0 || qaFilter.semesters.includes(s.semester);
            
            if (matchesDept && matchesSem && s.rollNumber) {
                const endsWithDigit = digitList.some(digit => s.rollNumber.endsWith(digit));
                if (endsWithDigit) {
                    newAttendance[s._id] = 'Absent';
                    markedCount++;
                }
            }
        });
        
        setAttendance(newAttendance);
        setMessage({ type: 'success', text: `Quick Assessed: ${markedCount} mapped students forced absent.` });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        setShowFilters(false);
    };

    const stats = {
        total: students.length,
        present: Object.values(attendance).filter(s => s === 'Present').length,
        absent: Object.values(attendance).filter(s => s === 'Absent').length,
        late: Object.values(attendance).filter(s => s === 'Late').length,
    };

    // Group logs by Date AND Section
    const groupedLogs = logs.reduce((acc, log) => {
        const dStr = new Date(log.date).toLocaleDateString();
        const key = `${dStr}::${log.section}`;
        if (!acc[key]) {
            acc[key] = { dateStr: dStr, section: log.section, total: 0, present: 0, absent: 0, late: 0, records: [] };
        }
        acc[key].records.push(log);
        acc[key].total++;
        if (log.status === 'Present') acc[key].present++;
        if (log.status === 'Absent') acc[key].absent++;
        if (log.status === 'Late') acc[key].late++;
        return acc;
    }, {});

    // Compute explicit report data for individual analysis
    const reportList = filteredStudents.map(student => {
        const history = logs.filter(l => l.student && l.student._id === student._id);
        const present = history.filter(h => h.status === 'Present').length;
        const absent = history.filter(h => h.status === 'Absent').length;
        const late = history.filter(h => h.status === 'Late').length;
        const total = history.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        
        const monthly = history.reduce((acc, h) => {
            const m = new Date(h.date).toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!acc[m]) acc[m] = { present: 0, absent: 0, late: 0, total: 0 };
            acc[m].total++;
            if (h.status === 'Present') acc[m].present++;
            if (h.status === 'Absent') acc[m].absent++;
            if (h.status === 'Late') acc[m].late++;
            return acc;
        }, {});
        
        return { student, history, present, absent, late, total, percentage, monthly };
    });

    // Excel Export Configuration Algorithm
    const downloadExcelReport = async () => {
        try {
            const XLSX = await import('xlsx');
            
            // Extract and format all unique dates dynamically based on history records
            const rawDates = [];
            const dateMap = new Map(); // Keep reference to log object conditions
            
            logs.forEach(log => {
                const dateRaw = new Date(log.date);
                const day = String(dateRaw.getDate()).padStart(2, '0');
                const monthInfo = dateRaw.toLocaleString('default', { month: 'short' });
                // Format: "03 Feb" or "04 Mar" based on the Excel pic requested
                let label = `${day} ${monthInfo}`;
                
                // If section exists and is not Regular, append it
                if (log.section !== 'Regular Class') {
                    label += ` (${log.section.substring(0, 1)})`;
                }
                
                if (!rawDates.includes(label)) {
                    rawDates.push(label);
                    // To easily match back later
                    dateMap.set(label, { 
                        dateCode: dateRaw.toLocaleDateString(), 
                        section: log.section 
                    });
                }
            });
            
            // Sort Chronologically
            rawDates.sort((a, b) => new Date(dateMap.get(a).dateCode) - new Date(dateMap.get(b).dateCode));
            
            // Build the worksheet structure 
            const wsData = [];
            
            const r1 = Array(9).fill(''); r1.push("PACIFIC SCHOOL OF ENGINEERING, SURAT"); wsData.push(r1);
            const r2 = Array(9).fill(''); r2.push("Attendance Sheet for Computer Science Department"); wsData.push(r2);
            wsData.push([]);
            
            const r4 = Array(9).fill(''); 
            r4[0] = `Sem: ${attFilter.semesters.join(', ') || 'All'}`; 
            r4[2] = `Subject: ${user.subject}`; 
            wsData.push(r4);
            wsData.push([]);
            
            const r6 = Array(9).fill(''); r6.push(`Faculty Name: ${user.name}`); wsData.push(r6);
            wsData.push([]);
            
            // Columns
            const headerRow = ["Sr. No", "Enrollment No", "Student Name", ...rawDates];
            wsData.push(headerRow);
            
            // Student Data population
            filteredStudents.forEach((student, index) => {
                const row = [
                    index + 1,
                    student.rollNumber || 'N/A',
                    student.name,
                ];
                
                // Map attendance per unique date block
                rawDates.forEach(dateLabel => {
                    const matchData = dateMap.get(dateLabel);
                    const match = logs.find(l => 
                        new Date(l.date).toLocaleDateString() === matchData.dateCode 
                        && l.section === matchData.section
                        && l.student && l.student._id === student._id
                    );
                    
                    if (match) {
                        row.push(match.status === 'Present' ? 'P' : match.status === 'Absent' ? 'A' : 'L');
                    } else {
                        row.push(''); // Empty per excel specification
                    }
                });
                
                wsData.push(row);
            });
            
            // Create workbook and export
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Columns Width constraints simulating Excel view structure
            ws['!cols'] = [
                { wch: 8 },  // Sr. No
                { wch: 15 }, // Enrollment
                { wch: 25 }, // Name
                ...rawDates.map(() => ({ wch: 10 })) // Dates
            ];
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance Sheet");
            XLSX.writeFile(wb, `${user.subject.replace(/[^a-zA-Z0-9]/g, '_')}_Attendance.xlsx`);
            
            setMessage({ type: 'success', text: 'Excel Report generated successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        } catch (err) {
            console.error("Error generating Excel: ", err);
            setMessage({ type: 'error', text: 'Failed to generate Excel document. Process interrupted.' });
        }
    };

    if (isLoading) return <div className="loading-screen text-primary flex-center" style={{ height: '80vh', fontWeight: '700' }}>Initializing Class Roster...</div>;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="teacher-dashboard"
        >
            <div className="dashboard-nav">
                <button className={`nav-tab ${view === 'attendance' ? 'active' : ''}`} onClick={() => setView('attendance')}>
                    <ClipboardCheck size={18} /> Mark Attendance
                </button>
                <button className={`nav-tab ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>
                    <BarChart2 size={18} /> Reports
                </button>
                <button className={`nav-tab ${view === 'log' ? 'active' : ''}`} onClick={() => setView('log')}>
                    <Layers size={18} /> Daily Logs
                </button>
            </div>

            <header className="dashboard-header flex justify-between align-center">
                <div className="header-text">
                    <h1>{view === 'attendance' ? 'Class Attendance' : view === 'reports' ? 'Student Analytical Reports' : 'Historical Tracking Log'}</h1>
                    <p className="subtitle">Managing: <strong className="text-main">{user.subject}</strong></p>
                </div>
                
                {view === 'log' && (
                    <button 
                        className="btn-primary export-excel-btn" 
                        onClick={downloadExcelReport}
                        style={{ gap: '0.6rem', display: 'flex', alignItems: 'center', height: '42px', padding: '0 1.2rem', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.25)', fontWeight: '600', letterSpacing: '0.01em' }}
                    >
                        <Download size={18} /> Generate Excel Report
                    </button>
                )}
                
                {view === 'attendance' && (
                    <div className="mode-selectors" style={{ display: 'flex', gap: '1rem' }}>
                        <div className="date-picker glass-card">
                            <div className="dp-icon-wrapper">
                                <Hash size={20} className="text-primary" />
                            </div>
                            <select value={section} onChange={(e) => setSection(e.target.value)} className="date-input" style={{ width: '160px' }}>
                                <option value="Regular Class">Regular Class</option>
                                <option value="Morning Session">Morning Session</option>
                                <option value="Afternoon Session">Afternoon Session</option>
                                <option value="Lab Practical">Lab Practical</option>
                            </select>
                        </div>
                        <div className="date-picker glass-card">
                            <div className="dp-icon-wrapper">
                                <CalendarIcon size={20} className="text-primary" />
                            </div>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                className="date-input" 
                            />
                        </div>
                    </div>
                )}
            </header>

            <AnimatePresence mode="wait">
            {(view === 'attendance' || view === 'reports') && (
                <motion.div key="attendance-reports-view" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>

            <section className="stats-grid">
                <div className="stat-card glass-card">
                    <div className="stat-icon bg-primary-light text-primary"><Users /></div>
                    <div className="stat-content">
                        <h3>{stats.total}</h3>
                        <p>Total Class</p>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <div className="stat-icon bg-success-light text-success"><CheckCircle2 /></div>
                    <div className="stat-content">
                        <h3>{stats.present}</h3>
                        <p>Present</p>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <div className="stat-icon bg-error-light text-error"><XCircle /></div>
                    <div className="stat-content">
                        <h3>{stats.absent}</h3>
                        <p>Absent</p>
                    </div>
                </div>
                <div className="stat-card glass-card">
                    <div className="stat-icon bg-warning-light text-warning"><Clock /></div>
                    <div className="stat-content">
                        <h3>{stats.late}</h3>
                        <p>Late</p>
                    </div>
                </div>
            </section>

            <div className="attendance-container glass-card">
                <div className="table-header flex justify-between align-center mb-2">
                    <div className="search-box border-light">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            className="input-field"
                            placeholder="Find by name or Roll ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="action-cluster" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div className="filter-wrapper" style={{ position: 'relative' }}>
                            <button 
                                className={`filter-btn ${showFilters ? 'active' : ''}`}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter size={18} />
                                <span>Options</span>
                            </button>
                            
                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="filter-dropdown glass-card"
                                    >
                                        <div className="filter-section">
                                            <h4>1. Attendance Filtering</h4>
                                            
                                            <div className="filter-group">
                                                <p className="filter-label">Departments Mode</p>
                                                <div className="checkbox-grid">
                                                    {availableDepartments.map(dept => (
                                                        <label key={dept} className="checkbox-label">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={attFilter.departments.includes(dept)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setAttFilter({...attFilter, departments: [...attFilter.departments, dept]});
                                                                    else setAttFilter({...attFilter, departments: attFilter.departments.filter(d => d !== dept)});
                                                                }}
                                                            />
                                                            <span>{dept}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="filter-group">
                                                <p className="filter-label">Semester Mode</p>
                                                <div className="checkbox-grid">
                                                    {availableSemesters.map(sem => (
                                                        <label key={sem} className="checkbox-label">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={attFilter.semesters.includes(sem)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setAttFilter({...attFilter, semesters: [...attFilter.semesters, sem]});
                                                                    else setAttFilter({...attFilter, semesters: attFilter.semesters.filter(s => s !== sem)});
                                                                }}
                                                            />
                                                            <span>Sem {sem}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <label className="checkbox-label remember-check">
                                                <input 
                                                    type="checkbox" 
                                                    checked={attFilter.remember}
                                                    onChange={(e) => setAttFilter({...attFilter, remember: e.target.checked})}
                                                />
                                                <span>Remember my settings</span>
                                            </label>
                                        </div>

                                        <div className="filter-divider"></div>

                                        <div className="filter-section">
                                            <h4>2. Quick Absent Protocol</h4>
                                            <p className="filter-desc">Mark missing assigned roll endings as absent instantly.</p>
                                            
                                            <div className="filter-group">
                                                <p className="filter-label">Target Departments</p>
                                                <div className="checkbox-grid">
                                                    {availableDepartments.map(dept => (
                                                        <label key={`qa-${dept}`} className="checkbox-label">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={qaFilter.departments.includes(dept)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setQaFilter({...qaFilter, departments: [...qaFilter.departments, dept]});
                                                                    else setQaFilter({...qaFilter, departments: qaFilter.departments.filter(d => d !== dept)});
                                                                }}
                                                            />
                                                            <span>{dept}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="filter-group">
                                                <p className="filter-label">Target Semester</p>
                                                <div className="checkbox-grid">
                                                    {availableSemesters.map(sem => (
                                                        <label key={`qa-${sem}`} className="checkbox-label">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={qaFilter.semesters.includes(sem)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setQaFilter({...qaFilter, semesters: [...qaFilter.semesters, sem]});
                                                                    else setQaFilter({...qaFilter, semesters: qaFilter.semesters.filter(s => s !== sem)});
                                                                }}
                                                            />
                                                            <span>Sem {sem}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="filter-group" style={{ marginTop: '1.25rem' }}>
                                                <p className="filter-label">Roll Terminals (Comma Separated)</p>
                                                <input 
                                                    type="text" 
                                                    className="quick-input"
                                                    placeholder="e.g. 05, 12, 19"
                                                    value={qaFilter.digitsIds}
                                                    onChange={(e) => setQaFilter({...qaFilter, digitsIds: e.target.value})}
                                                />
                                            </div>
                                            
                                            <button 
                                                className="btn-primary w-100 flex-center" 
                                                style={{ marginTop: '1rem', background: 'var(--error)', width: '100%', gap: '0.5rem' }} 
                                                onClick={handleQuickAbsent}
                                            >
                                                <XCircle size={18} />
                                                <span>Execute Auto-Absent</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {view === 'attendance' && (
                            <button 
                                className="btn-primary" 
                                style={{ height: '100%' }}
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="spinner"></span>
                                ) : (
                                    <>
                                        <span>Save Records</span>
                                        <Send size={18} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {message.text && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
                        >
                            <div className="alert-content">
                                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                <span>{message.text}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="table-responsive">
                    <table className="light-table">
                        <thead>
                            <tr>
                                <th>Student Details</th>
                                <th>Roll Identity</th>
                                {view === 'reports' ? (
                                    <>
                                        <th>Overall Perf.</th>
                                        <th>Overview</th>
                                        <th>Action</th>
                                    </>
                                ) : (
                                    <>
                                        <th>Current Status</th>
                                        <th>Mark Attendance</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {view === 'attendance' ? (
                                filteredStudents.map((student, idx) => (
                                    <motion.tr 
                                        key={`att-${student._id}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.03 }}
                                    >
                                        <td className="font-semibold text-main">{student.name}</td>
                                        <td>
                                            <div className="roll-pill">{student.rollNumber}</div>
                                        </td>
                                        <td>
                                            <div className="status-indicator">
                                                <span className={`status-dot ${attendance[student._id]?.toLowerCase()}`}></span>
                                                <span className={`badge badge-${attendance[student._id]?.toLowerCase()}`}>
                                                    {attendance[student._id]}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button 
                                                    className={`action-btn p ${attendance[student._id] === 'Present' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(student._id, 'Present')}
                                                    title="Mark Present"
                                                >
                                                    P
                                                </button>
                                                <button 
                                                    className={`action-btn a ${attendance[student._id] === 'Absent' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(student._id, 'Absent')}
                                                    title="Mark Absent"
                                                >
                                                    A
                                                </button>
                                                <button 
                                                    className={`action-btn l ${attendance[student._id] === 'Late' ? 'active' : ''}`}
                                                    onClick={() => handleStatusChange(student._id, 'Late')}
                                                    title="Mark Late"
                                                >
                                                    L
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                reportList.map((rep, idx) => (
                                    <React.Fragment key={`rep-${rep.student._id}`}>
                                        <motion.tr 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                            style={{ background: activeReportKey === rep.student._id ? 'var(--highlight-bg)' : 'transparent' }}
                                        >
                                            <td className="font-semibold text-main">{rep.student.name}</td>
                                            <td><div className="roll-pill">{rep.student.rollNumber}</div></td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="progress-bar-bg" style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div className="progress-bar-fill" style={{ width: `${rep.percentage}%`, height: '100%', background: rep.percentage >= 75 ? 'var(--success)' : rep.percentage >= 50 ? 'var(--warning)' : 'var(--error)' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>{rep.percentage}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="metrics-cluster flex gap-1">
                                                    <span className="metric-pill" style={{ color: 'var(--success)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--success-bg)' }}>{rep.present} P</span>
                                                    <span className="metric-pill" style={{ color: 'var(--error)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--error-bg)' }}>{rep.absent} A</span>
                                                </div>
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn-secondary" 
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: '1px solid var(--border)', background: 'white' }}
                                                    onClick={() => setActiveReportKey(activeReportKey === rep.student._id ? null : rep.student._id)}
                                                >
                                                    {activeReportKey === rep.student._id ? 'Close Reports' : 'View Reports'}
                                                </button>
                                            </td>
                                        </motion.tr>
                                        
                                        <AnimatePresence>
                                            {activeReportKey === rep.student._id && (
                                                <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                    <td colSpan="5" style={{ padding: 0 }}>
                                                        <div className="report-dropdown-details" style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.015)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                                                            <div className="rd-header mb-2 flex justify-between align-center">
                                                                <h4 className="text-main font-semibold" style={{ margin: 0, fontSize: '0.95rem' }}>Analytical Overview &middot; {user.subject}</h4>
                                                                <div className="rd-meta flex gap-2">
                                                                    <div className="metric-pill" style={{ background: 'white', border: '1px solid var(--border)' }}>Total Logged Items: {rep.total}</div>
                                                                    <div className="metric-pill" style={{ background: 'white', border: '1px solid var(--border)' }}>Historical Lates: {rep.late}</div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="monthly-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                                                {Object.keys(rep.monthly).length > 0 ? Object.keys(rep.monthly).map(month => (
                                                                    <div key={month} className="month-card glass-card" style={{ padding: '0.85rem', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                                                                        <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{month}</h5>
                                                                        <div className="flex justify-between" style={{ fontSize: '0.85rem' }}>
                                                                            <span style={{ color: 'var(--success)', fontWeight: '600' }}>{rep.monthly[month].present} Present</span>
                                                                            <span style={{ color: 'var(--error)', fontWeight: '600' }}>{rep.monthly[month].absent} Absent</span>
                                                                        </div>
                                                                        <div className="progress-bar-bg" style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem' }}>
                                                                            <div className="progress-bar-fill" style={{ width: `${Math.round((rep.monthly[month].present / rep.monthly[month].total) * 100)}%`, height: '100%', background: 'var(--primary)' }}></div>
                                                                        </div>
                                                                    </div>
                                                                )) : (
                                                                    <div className="text-dim" style={{ fontSize: '0.85rem', padding: '0.5rem 0' }}>No historical logs retrieved for this student context.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </motion.div>
            )}

            {view === 'log' && (
                <motion.div key="log-view" initial={{opacity: 0, x: 20}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: -20}}>
                    <div className="logs-container">
                        {Object.keys(groupedLogs).length === 0 ? (
                            <div className="empty-state text-dim flex-center mt-3" style={{ height: '20vh', fontWeight: '600' }}>No attendance records found yet.</div>
                        ) : Object.keys(groupedLogs).map((key) => {
                            const grp = groupedLogs[key];
                            const isActive = activeLogKey === key;
                            return (
                                <div key={key} className="log-panel glass-card mb-2" style={{ padding: '0', overflow: 'hidden' }}>
                                    <div className="log-header" onClick={() => setActiveLogKey(isActive ? null : key)} style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isActive ? 'rgba(15, 23, 42, 0.02)' : 'transparent' }}>
                                        <div className="lh-main flex align-center gap-1">
                                            <div className="lh-icon bg-primary-light text-primary" style={{ padding: '0.65rem', borderRadius: '0.75rem' }}><CalendarIcon size={20} /></div>
                                            <div>
                                                <h3 className="text-main font-semibold" style={{ fontSize: '1.1rem', marginBottom: '0.2rem' }}>{grp.dateStr}</h3>
                                                <p className="text-dim" style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{grp.section}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="lh-metrics flex gap-1 align-center">
                                            <div className="metric-pill" style={{ color: 'var(--success)', background: 'var(--success-bg)' }}>{grp.present} P</div>
                                            <div className="metric-pill" style={{ color: 'var(--error)', background: 'var(--error-bg)' }}>{grp.absent} A</div>
                                            <div className="metric-pill" style={{ color: 'var(--text-dim)', background: 'rgba(15, 23, 42, 0.05)' }}>Total: {grp.total}</div>
                                            <button className="btn-secondary" style={{ padding: '0.5rem 1rem', marginLeft: '1rem', border: 'none', background: 'white', border: '1px solid var(--border)' }}>
                                                {isActive ? 'Hide Details' : 'View Details'}
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                                                <div className="log-details" style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '1.5rem' }}>
                                                    <table className="light-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Roll Identity</th>
                                                                <th>Student Name</th>
                                                                <th>Recorded Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {grp.records.map((r, i) => (
                                                                <tr key={i}>
                                                                    <td className="font-semibold">{window.location.host ? r.student?.rollNumber : ''} {r.student?.rollNumber}</td>
                                                                    <td className="text-main">{r.student?.name}</td>
                                                                    <td>
                                                                        <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{ __html: `
                .teacher-dashboard {
                    padding: 1rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                
                .dashboard-nav {
                    display: flex;
                    gap: 0.5rem;
                    background: rgba(255, 255, 255, 0.5);
                    padding: 0.5rem;
                    border-radius: 1.25rem;
                    margin-bottom: 2rem;
                    width: max-content;
                    border: 1px solid var(--border);
                }
                
                .nav-tab {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.85rem;
                    color: var(--text-dim);
                    font-weight: 700;
                    font-size: 0.95rem;
                    transition: all 0.3s;
                }
                
                .nav-tab:hover { color: var(--text-main); background: rgba(15, 23, 42, 0.05); }
                .nav-tab.active { background: white; color: var(--primary); box-shadow: var(--shadow-sm); }
                
                
                .dashboard-header {
                    margin-bottom: 2.5rem;
                }
                
                .dashboard-header h1 {
                    font-size: 2.25rem;
                    font-weight: 800;
                    margin-bottom: 0.25rem;
                }
                
                .subtitle {
                    color: var(--text-dim);
                    font-weight: 500;
                    font-size: 0.95rem;
                }
                
                .date-picker {
                    display: flex;
                    align-items: center;
                    padding: 0.5rem;
                    border-radius: 1.25rem;
                    gap: 0.5rem;
                    box-shadow: var(--shadow-sm);
                }
                
                .dp-icon-wrapper {
                    background: #e0e7ff;
                    width: 40px; height: 40px;
                    border-radius: 0.85rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .date-input {
                    background: transparent;
                    border: none;
                    color: var(--text-main);
                    outline: none;
                    font-weight: 700;
                    font-size: 1rem;
                    padding: 0.5rem 0.75rem;
                    font-family: inherit;
                    cursor: pointer;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2.5rem;
                }
                
                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    padding: 1.5rem;
                    border-radius: 1.5rem;
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                
                .stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
                
                .stat-icon {
                    width: 52px; height: 52px;
                    border-radius: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .stat-icon svg { stroke-width: 2.5; }
                
                .bg-primary-light { background: #e0e7ff; }
                .bg-success-light { background: var(--success-bg); }
                .bg-error-light { background: var(--error-bg); }
                .bg-warning-light { background: var(--warning-bg); }
                
                .stat-content h3 { font-size: 1.75rem; font-weight: 800; line-height: 1; margin-bottom: 0.25rem; }
                .stat-content p { font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
                
                .attendance-container {
                    padding: 1.5rem;
                }
                
                .table-header {
                    display: flex;
                    gap: 1.5rem;
                    flex-wrap: wrap;
                }
                
                .search-box {
                    position: relative;
                    flex: 1;
                    max-width: 450px;
                }
                
                .search-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-dim);
                    z-index: 10;
                }
                
                .search-box .input-field {
                    padding-left: 3rem !important;
                    background: rgba(15, 23, 42, 0.02);
                    box-shadow: none;
                }
                
                .action-cluster { z-index: 50; }
                
                .filter-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    background: white;
                    border: 1px solid var(--border);
                    border-radius: 1rem;
                    color: var(--text-main);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    height: 100%;
                }
                
                .filter-btn:hover { background: rgba(15, 23, 42, 0.02); border-color: rgba(15, 23, 42, 0.1); }
                .filter-btn.active { background: rgba(79, 70, 229, 0.08); color: var(--primary); border-color: rgba(79, 70, 229, 0.2); }
                
                .filter-dropdown {
                    position: absolute;
                    top: calc(100% + 12px);
                    right: 0;
                    width: 320px;
                    padding: 1.5rem;
                    background: white;
                    border-radius: 1.25rem;
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15);
                    border: 1px solid var(--border);
                    z-index: 100;
                    max-height: 70vh;
                    overflow-y: auto;
                    cursor: default;
                }
                
                .filter-dropdown::-webkit-scrollbar { width: 6px; }
                .filter-dropdown::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.1); border-radius: 10px; }
                
                .filter-section h4 { font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem; }
                .filter-desc { font-size: 0.75rem; color: var(--text-dim); margin-bottom: 1.25rem; line-height: 1.4; }
                
                .filter-group { margin-bottom: 1rem; }
                .filter-label { font-size: 0.75rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.65rem; }
                
                .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
                .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; color: var(--text-main); }
                .checkbox-label input { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; }
                
                .remember-check { margin-top: 1.25rem; color: var(--primary); font-weight: 600; padding: 0.75rem; background: rgba(79, 70, 229, 0.05); border-radius: 0.75rem; }
                
                .filter-divider { height: 1px; background: var(--border); margin: 1.5rem 0; }
                
                .quick-input { width: 100%; padding: 0.85rem; border: 1px solid var(--border); border-radius: 0.85rem; font-size: 0.95rem; margin-top: 0.5rem; outline: none; transition: all 0.2s; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 0.05em; }
                .quick-input:focus { border-color: var(--primary); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
                
                .w-100 { width: 100%; padding-top: 0.85rem; padding-bottom: 0.85rem; }
                
                .table-responsive { overflow-x: auto; }
                
                .light-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    text-align: left;
                }
                
                .light-table th {
                    padding: 1.25rem 1rem;
                    color: var(--text-dim);
                    font-weight: 700;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid var(--border);
                }
                
                .light-table td {
                    padding: 1.25rem 1rem;
                    color: var(--text-dim);
                    font-weight: 500;
                    font-size: 0.95rem;
                    border-bottom: 1px solid rgba(15, 23, 42, 0.03);
                }
                
                .light-table tr:hover td {
                    background: rgba(15, 23, 42, 0.01);
                }
                
                .font-semibold { font-weight: 600!important; }
                .text-main { color: var(--text-main)!important; }
                
                .roll-pill {
                    display: inline-flex;
                    padding: 0.35rem 0.75rem;
                    background: rgba(15, 23, 42, 0.04);
                    border-radius: 0.5rem;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-main);
                    border: 1px solid rgba(15, 23, 42, 0.06);
                }
                
                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .status-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                }
                .status-dot.present { background: var(--success); box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }
                .status-dot.absent { background: var(--error); box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); }
                .status-dot.late { background: var(--warning); box-shadow: 0 0 8px rgba(245, 158, 11, 0.5); }
                
                .action-buttons {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(15, 23, 42, 0.03);
                    padding: 0.25rem;
                    border-radius: 0.75rem;
                    display: inline-flex;
                }
                
                .action-btn {
                    width: 36px; height: 36px;
                    border-radius: 0.6rem;
                    font-weight: 800;
                    color: var(--text-dim);
                    background: transparent;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .action-btn:hover { background: white; color: var(--text-main); box-shadow: var(--shadow-sm); }
                
                .action-btn.p.active { color: var(--success); background: white; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.2); }
                .action-btn.a.active { color: var(--error); background: white; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.2); }
                .action-btn.l.active { color: var(--warning); background: white; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.2); }
                
                .alert-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.85rem 1.25rem;
                    border-radius: 1rem;
                    font-size: 0.95rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                }
                
                .alert-success .alert-content { background: var(--success-bg); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); }
                .alert-error .alert-content { background: var(--error-bg); color: var(--error); border: 1px solid rgba(239, 68, 68, 0.2); }
                
                .spinner {
                    display: inline-block;
                    width: 20px; height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                
                @media (max-width: 768px) {
                    .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
                    .table-header { flex-direction: column; align-items: stretch; }
                    .search-box { max-width: 100%; }
                }
            `}} />
        </motion.div>
    );
};

export default TeacherDashboard;
