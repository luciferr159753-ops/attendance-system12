const Subject = require('../models/Subject');

const createSubject = async (req, res) => {
    try {
        const { name, code, teacher, department, semester } = req.body;
        
        // Prevent duplicate codes
        const codeExists = await Subject.findOne({ code });
        if (codeExists) {
            return res.status(400).json({ message: 'A subject with this Subject Code already exists' });
        }

        const subject = await Subject.create({
            name,
            code,
            teacher: teacher || null,
            department,
            semester
        });

        // Return populated teacher data
        const populated = await Subject.findById(subject._id).populate('teacher', 'name email');
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create subject', error: error.message });
    }
};

const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({}).populate('teacher', 'name email');
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch subjects', error: error.message });
    }
};

module.exports = { createSubject, getSubjects };
