import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Calendar, Award, AlertTriangle, CheckCircle, UserCheck } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

const StudentDashboard = () => {
    const { user } = useAuth();
    const [attendance, setAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const { data } = await axios.get('/api/attendance/student');
                setAttendance(data);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAttendance();
    }, []);

    const stats = {
        present: attendance.filter(a => a.status === 'Present').length,
        absent: attendance.filter(a => a.status === 'Absent').length,
        late: attendance.filter(a => a.status === 'Late').length,
        total: attendance.length
    };

    const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

    const chartData = {
        labels: ['Present', 'Absent', 'Late'],
        datasets: [
            {
                data: [stats.present, stats.absent, stats.late],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.85)', /* Emerald */
                    'rgba(239, 68, 68, 0.85)',  /* Red */
                    'rgba(245, 158, 11, 0.85)', /* Amber */
                ],
                borderColor: ['#fff', '#fff', '#fff'],
                borderWidth: 3,
            },
        ],
    };

    const chartOptions = {
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: { display: false }
        }
    };

    if (isLoading) return <div className="loading-screen text-primary flex-center" style={{ height: '80vh', fontWeight: '700' }}>Retrieving your records...</div>;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="student-dashboard"
        >
            <header className="dashboard-header">
                <div>
                    <h1>Welcome, {user.name}</h1>
                    <p className="student-badge">ID: {user.rollNumber}</p>
                </div>
                <div className="header-icon">
                    <UserCheck size={32} className="text-primary" />
                </div>
            </header>

            <div className="dashboard-grid">
                <div className="left-column">
                    <section className="summary-cards">
                        <div className="stat-card glass-card">
                            <div className="stat-icon bg-success-light">
                                <Award className={percentage >= 75 ? "text-success" : "text-error"} size={26} />
                            </div>
                            <div className="stat-info">
                                <h3>{percentage}%</h3>
                                <p>Overall Record</p>
                            </div>
                        </div>
                        <div className="stat-card glass-card">
                            <div className="stat-icon bg-primary-light">
                                <CheckCircle className="text-primary" size={26} />
                            </div>
                            <div className="stat-info">
                                <h3>{stats.present}</h3>
                                <p>Days Present</p>
                            </div>
                        </div>
                        <div className="stat-card glass-card">
                            <div className="stat-icon bg-error-light">
                                <AlertTriangle className="text-error" size={26} />
                            </div>
                            <div className="stat-info">
                                <h3>{stats.absent}</h3>
                                <p>Days Absent</p>
                            </div>
                        </div>
                    </section>

                    <section className="history-section mt-2">
                        <div className="section-title">
                            <Calendar size={20} className="text-primary" />
                            <h2>Recent Activity</h2>
                        </div>
                        <div className="table-card glass-card">
                            <div className="table-responsive">
                                <table className="light-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Subject</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.slice(0, 10).map((record, index) => (
                                            <motion.tr 
                                                key={record._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <td className="font-semibold text-main">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                                                <td>{record.teacher?.subject || 'General'}</td>
                                                <td>
                                                    <span className={`badge badge-${record.status.toLowerCase()}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                        {attendance.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="empty-state">
                                                    No attendance records found yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>

                <aside className="right-column">
                    <div className="analysis-card glass-card">
                        <h3>Visual Analysis</h3>
                        <div className="chart-wrapper">
                            {stats.total > 0 ? (
                                <>
                                    <Pie data={chartData} options={chartOptions} />
                                    <div className="chart-center-text">
                                        <span className="value">{percentage}%</span>
                                    </div>
                                </>
                            ) : (
                                <div className="no-data flex-center">
                                    <p>Insufficient data to generate chart.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="custom-legend mt-2">
                            <div className="legend-row">
                                <div className="legend-label">
                                    <span className="dot dot-success"></span>
                                    Present
                                </div>
                                <span className="legend-value">{stats.present}</span>
                            </div>
                            <div className="legend-row">
                                <div className="legend-label">
                                    <span className="dot dot-error"></span>
                                    Absent
                                </div>
                                <span className="legend-value">{stats.absent}</span>
                            </div>
                            <div className="legend-row">
                                <div className="legend-label">
                                    <span className="dot dot-warning"></span>
                                    Late
                                </div>
                                <span className="legend-value">{stats.late}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .student-dashboard {
                    padding: 1rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2.5rem;
                }
                
                .dashboard-header h1 {
                    font-size: 2.25rem;
                    font-weight: 800;
                    margin-bottom: 0.5rem;
                }
                
                .student-badge {
                    display: inline-block;
                    background: var(--primary-glow);
                    color: var(--primary);
                    padding: 0.35rem 0.85rem;
                    border-radius: 2rem;
                    font-weight: 700;
                    font-size: 0.85rem;
                    letter-spacing: 0.05em;
                }
                
                .header-icon {
                    width: 64px; height: 64px;
                    background: white;
                    border-radius: 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--shadow-md);
                    border: 1px solid rgba(15, 23, 42, 0.05);
                }
                
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr 380px;
                    gap: 2rem;
                }
                
                .summary-cards {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                }
                
                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    padding: 1.5rem;
                    transition: transform 0.2s;
                }
                
                .stat-card:hover { transform: translateY(-3px); }
                
                .stat-icon {
                    width: 54px; height: 54px;
                    border-radius: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .bg-success-light { background: var(--success-bg); }
                .bg-primary-light { background: #e0e7ff; }
                .bg-error-light { background: var(--error-bg); }
                
                .stat-info h3 {
                    font-size: 1.75rem;
                    font-weight: 800;
                    line-height: 1.1;
                }
                
                .stat-info p {
                    font-size: 0.8rem;
                    color: var(--text-dim);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-top: 0.25rem;
                }
                
                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1.25rem;
                }
                
                .section-title h2 {
                    font-size: 1.25rem;
                    font-weight: 700;
                }
                
                .table-card { padding: 0.5rem; }
                
                .table-responsive { overflow-x: auto; }
                
                .light-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                }
                
                .light-table th {
                    padding: 1rem 1.25rem;
                    color: var(--text-dim);
                    font-weight: 700;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid var(--border);
                }
                
                .light-table td {
                    padding: 1.1rem 1.25rem;
                    border-bottom: 1px solid var(--border);
                    color: var(--text-dim);
                    font-weight: 500;
                    font-size: 0.95rem;
                }
                
                .light-table tr:last-child td { border-bottom: none; }
                
                .font-semibold { font-weight: 600!important; }
                .text-main { color: var(--text-main)!important; }
                
                .empty-state {
                    text-align: center;
                    padding: 3rem !important;
                    color: var(--text-dim) !important;
                    font-weight: 500 !important;
                }
                
                .analysis-card {
                    padding: 2rem;
                    position: sticky;
                    top: 2rem;
                }
                
                .analysis-card h3 {
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin-bottom: 2rem;
                    text-align: center;
                }
                
                .chart-wrapper {
                    position: relative;
                    height: 240px;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    margin-bottom: 2rem;
                }
                
                .chart-center-text {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                }
                
                .chart-center-text .value {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: var(--text-main);
                    letter-spacing: -0.05em;
                }
                
                .custom-legend {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    background: rgba(15, 23, 42, 0.03);
                    padding: 1.25rem;
                    border-radius: 1rem;
                }
                
                .legend-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.95rem;
                    font-weight: 600;
                }
                
                .legend-label {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: var(--text-dim);
                }
                
                .legend-value {
                    color: var(--text-main);
                    font-weight: 800;
                    background: white;
                    padding: 0.2rem 0.6rem;
                    border-radius: 0.5rem;
                    box-shadow: var(--shadow-sm);
                }
                
                .dot { width: 12px; height: 12px; border-radius: 4px; }
                .dot-success { background: var(--success); }
                .dot-error { background: var(--error); }
                .dot-warning { background: var(--warning); }
                
                @media (max-width: 1024px) {
                    .dashboard-grid { grid-template-columns: 1fr; gap: 2.5rem; }
                    .summary-cards { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
                    .analysis-card { position: relative; top: 0; max-width: 400px; margin: 0 auto; width: 100%;}
                }
                @media (max-width: 640px) {
                    .dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
                    .header-icon { display: none; }
                }
            `}} />
        </motion.div>
    );
};

export default StudentDashboard;
