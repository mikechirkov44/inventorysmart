const express = require('express');
const router = express.Router();
const Employee = require('../models/employee');

// GET all employees with optional filtering
router.get('/', (req, res) => {
  try {
    let employees = Employee.findAll();
    const { lastName, position, search } = req.query;

    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(e =>
        e.lastName.toLowerCase().includes(s) ||
        e.firstName.toLowerCase().includes(s) ||
        (e.position && e.position.toLowerCase().includes(s))
      );
    }
    if (lastName) {
      employees = employees.filter(e => e.lastName.toLowerCase().includes(lastName.toLowerCase()));
    }
    if (position) {
      employees = employees.filter(e => e.position === position);
    }

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET employee by ID
router.get('/:id', (req, res) => {
  try {
    const employee = Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create employee
router.post('/', (req, res) => {
  try {
    const employee = Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update employee
router.put('/:id', (req, res) => {
  try {
    const employee = Employee.update(req.params.id, req.body);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE employee
router.delete('/:id', (req, res) => {
  try {
    const deleted = Employee.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
