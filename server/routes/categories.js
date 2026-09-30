const express = require('express');
const { categoryCounts, listEvents } = require('../db/helpers');

const router = express.Router();

/** GET /api/categories — all categories with event counts */
router.get('/', (_req, res) => {
  res.json({ categories: categoryCounts() });
});

/** GET /api/categories/:slug — category detail + its events */
router.get('/:slug', (req, res) => {
  const categories = categoryCounts();
  const category = categories.find((c) => c.slug === req.params.slug);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  const { events, total } = listEvents({ category: category.slug, limit: 24 });
  res.json({ category, events, total });
});

module.exports = router;
