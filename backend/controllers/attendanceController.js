const Attendance = require('../models/Attendance');
const User = require('../models/User');

const markAttendance = async (req, res) => {
    try {
        const { studentsAttendance, date, section } = req.body;
        const activeSection = section || 'Regular Class';

        if (!studentsAttendance || !Array.isArray(studentsAttendance)) {
            return res.status(400).json({ message: 'Invalid attendance data' });
        }

        const attendanceDate = date ? new Date(date) : new Date();
        attendanceDate.setHours(0, 0, 0, 0);

        const results = await Promise.all(studentsAttendance.map(async (record) => {
            return await Attendance.findOneAndUpdate(
                { student: record.studentId, date: attendanceDate, teacher: req.user.id, section: activeSection },
                { status: record.status },
                { upsert: true, new: true }
            );
        }));

        res.status(201).json({ message: 'Attendance marked successfully', count: results.length });
    } catch (error) {
        res.status(500).json({ message: 'Failed to mark attendance', error: error.message });
    }
};

const getStudentAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ student: req.user.id })
            .populate('teacher', 'name subject')
            .sort({ date: -1 });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch student attendance', error: error.message });
    }
};

const getTeacherAttendance = async (req, res) => {
    try {
        const { date, section } = req.query;
        const activeSection = section || 'Regular Class';
        const attendanceDate = date ? new Date(date) : new Date();
        attendanceDate.setHours(0, 0, 0, 0);

        const attendance = await Attendance.find({ 
            teacher: req.user.id, 
            date: attendanceDate, 
            section: activeSection 
        }).populate('student', 'name email rollNumber');
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch teacher attendance', error: error.message });
    }
};

const getAllStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch students', error: error.message });
    }
};

const getTeacherLogs = async (req, res) => {
    try {
        const logs = await Attendance.find({ teacher: req.user.id })
            .populate('student', 'name rollNumber department semester')
            .sort({ date: -1, section: 1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch attendance logs', error: error.message });
    }
};

module.exports = { markAttendance, getStudentAttendance, getTeacherAttendance, getTeacherLogs, getAllStudents };
