const express = require('express');
const router = express.Router();
const Employee = require('../models/employee');

router.get('/', async (req, res) => {
  try {
    let employees = await Employee.findAll();
    const { lastName, positionId, search } = req.query;

    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(e =>
        e.lastName.toLowerCase().includes(s) ||
        e.firstName.toLowerCase().includes(s)
      );
    }
    if (lastName) {
      employees = employees.filter(e => e.lastName.toLowerCase().includes(lastName.toLowerCase()));
    }
    if (positionId) {
      employees = employees.filter(e => e.positionId === positionId);
    }

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.update(req.params.id, req.body);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Employee.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
