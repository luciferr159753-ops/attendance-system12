import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, LayoutDashboard, Calendar, ClipboardCheck, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user) return null;

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <motion.nav 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="navbar glass-card"
        >
            <div className="navbar-brand">
                <div className="brand-icon-wrapper">
                    <GraduationCap size={24} className="text-primary" />
                </div>
                <span className="brand-text text-gradient">AMS Portal</span>
            </div>
            
            <div className="navbar-links">
                {user.role === 'admin' && (
                    <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
                        <LayoutDashboard size={18} />
                        <span>Overview</span>
                    </Link>
                )}
                
                {user.role === 'teacher' && (
                    <>
                        <Link to="/teacher" className={`nav-link ${isActive('/teacher') && location.pathname === '/teacher' ? 'active' : ''}`}>
                            <ClipboardCheck size={18} />
                            <span>Attendance</span>
                        </Link>
                    </>
                )}
                
                {user.role === 'student' && (
                    <Link to="/student" className={`nav-link ${isActive('/student') ? 'active' : ''}`}>
                        <Calendar size={18} />
                        <span>My Records</span>
                    </Link>
                )}
            </div>

            <div className="navbar-user">
                <div className="user-info">
                    <div className="user-avatar">
                        <User size={16} />
                    </div>
                    <div className="user-text">
                        <span className="user-name">{user.name}</span>
                        <span className={`user-role ${user.role}`}>{user.role}</span>
                    </div>
                </div>
                <button onClick={logout} className="logout-btn" title="Logout">
                    <LogOut size={18} />
                </button>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .navbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.75rem 1.5rem;
                    margin: 1.5rem 2rem;
                    border-radius: 1.5rem;
                    z-index: 50;
                    background: rgba(255, 255, 255, 0.85); /* Light glass */
                }
                
                .navbar-brand {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 1.5rem;
                    font-weight: 800;
                    letter-spacing: -0.025em;
                }
                
                .brand-icon-wrapper {
                    background: #e0e7ff;
                    padding: 0.5rem;
                    border-radius: 0.75rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .navbar-links {
                    display: flex;
                    gap: 0.5rem;
                    background: rgba(15, 23, 42, 0.03);
                    padding: 0.35rem;
                    border-radius: 1rem;
                }
                
                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-dim);
                    font-size: 0.9rem;
                    font-weight: 700;
                    transition: all 0.2s;
                    padding: 0.5rem 1.25rem;
                    border-radius: 0.75rem;
                }
                
                .nav-link:hover {
                    color: var(--text-main);
                    background: rgba(15, 23, 42, 0.05);
                }
                
                .nav-link.active {
                    color: white;
                    background: var(--text-main);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }
                
                .navbar-user {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.35rem 1rem 0.35rem 0.35rem;
                    background: rgba(15, 23, 42, 0.03);
                    border-radius: 2rem;
                    border: 1px solid rgba(15, 23, 42, 0.05);
                }
                
                .user-avatar {
                    background: white;
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                
                .user-text {
                    display: flex;
                    flex-direction: column;
                }
                
                .user-name {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-main);
                    line-height: 1.2;
                }
                
                .user-role {
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .user-role.admin { color: var(--accent); }
                .user-role.teacher { color: var(--secondary); }
                .user-role.student { color: var(--primary); }
                
                .logout-btn {
                    color: var(--text-dim);
                    background: rgba(239, 68, 68, 0.1);
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                
                .logout-btn:hover {
                    color: white;
                    background: #ef4444;
                    transform: rotate(10deg);
                }
                
                @media (max-width: 768px) {
                    .navbar {
                        margin: 1rem;
                        flex-direction: column;
                        gap: 1.5rem;
                    }
                }
            `}} />
        </motion.nav>
    );
};

export default Navbar;
