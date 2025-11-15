// Lap - Perfection copy/bims-backend/routes/categories.js
// bims-backend/routes/categories.js
const express = require('express');
const router = express.Router();

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
};

module.exports = (pool) => {
    // GET (Get all categories)
    router.get('/', async (req, res) => {
        try {
            // Admins see all, others see only non-archived
            // *** MODIFIED: Sort by is_archived first ***
            const query = (req.session.user && req.session.user.role === 'Admin')
                ? 'SELECT * FROM categories ORDER BY is_archived ASC, name ASC'
                : 'SELECT * FROM categories WHERE is_archived = false ORDER BY name';
            const result = await pool.query(query);
            res.status(200).json(result.rows);
        } catch (e) { res.status(500).json({ message: e.message }); }
    });

    // POST (Create or Un-archive a new category)
    router.post('/', isAdmin, async (req, res) => {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Category name is required.' });
        }
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Check if the category exists
            const checkResult = await client.query('SELECT * FROM categories WHERE name = $1', [name]);
            
            let category;
            
            if (checkResult.rows.length === 0) {
                // Case 1: Doesn't exist. Create it.
                const insertResult = await client.query(
                    'INSERT INTO categories (name) VALUES ($1) RETURNING *', 
                    [name]
                );
                category = insertResult.rows[0];
            } else if (checkResult.rows[0].is_archived) {
                // Case 2: Exists and is archived. Un-archive it.
                const updateResult = await client.query(
                    'UPDATE categories SET is_archived = false WHERE id = $1 RETURNING *', 
                    [checkResult.rows[0].id]
                );
                category = updateResult.rows[0];
            } else {
                // Case 3: Exists and is active. Throw an error.
                throw new Error('Category name already exists and is active.');
            }
            
            await client.query('COMMIT');
            res.status(200).json(category); // Send 200 (OK) for both create and update

        } catch (e) {
            await client.query('ROLLBACK');
            // Check for unique constraint race condition
            if (e.code === '23505') {
                return res.status(409).json({ message: 'Category name already exists.' });
            }
            // Send our custom error message
            res.status(409).json({ message: e.message });
        } finally {
            client.release();
        }
    });

    // PUT (Rename a category)
    router.put('/:id', isAdmin, async (req, res) => {
        const { name } = req.body;
        try {
            const result = await pool.query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING *', [name, req.params.id]);
            res.status(200).json(result.rows[0]);
        } catch (e) {
            if (e.code === '23505') return res.status(409).json({ message: 'Category name already exists.' });
            res.status(500).json({ message: e.message });
        }
    });

    // *** MODIFIED: DELETE (Smart Delete: Archive or Hard Delete) ***
    router.delete('/:id', isAdmin, async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Get the category name
            const catResult = await client.query('SELECT name FROM categories WHERE id = $1', [id]);
            if (catResult.rows.length === 0) {
                throw new Error('Category not found.');
            }
            const { name } = catResult.rows[0];

            // 2. Check if this category has ANY transaction history
            // *** THIS IS THE FIX: This query now correctly checks for history ***
            const historyCheck = await client.query(
                `SELECT 1 FROM blockchain 
                 WHERE transaction->>'txType' IN ('CREATE_ITEM', 'ADMIN_EDIT_ITEM') 
                 AND (
                    transaction->>'category' = $1 OR
                    transaction->>'newCategory' = $1
                 ) LIMIT 1`,
                [name]
            );
            // *** END OF FIX ***

            let message;
            if (historyCheck.rows.length > 0) {
                // 3a. It has history. Soft-delete (Archive) it.
                await client.query('UPDATE categories SET is_archived = true WHERE id = $1', [id]);
                message = `Category "${name}" archived (it has transaction history).`;
            } else {
                // 3b. No history. It's safe to permanently delete.
                await client.query('DELETE FROM categories WHERE id = $1', [id]);
                message = `Category "${name}" permanently deleted.`;
            }
            
            await client.query('COMMIT');
            res.status(200).json({ message }); // Send back success message

        } catch (e) { 
            await client.query('ROLLBACK');
            res.status(500).json({ message: e.message });
        } finally {
            client.release();
        }
    });
    
    return router;
};