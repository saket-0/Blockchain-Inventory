// Lap - Perfection copy/bims-backend/routes/locations.js
// bims-backend/routes/locations.js
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
    // GET (Get all locations)
    router.get('/', async (req, res) => {
        try {
            // Admins see all, others see only non-archived
            // *** MODIFIED: Sort by is_archived first ***
            const query = (req.session.user && req.session.user.role === 'Admin')
                ? 'SELECT * FROM locations ORDER BY is_archived ASC, name ASC'
                : 'SELECT * FROM locations WHERE is_archived = false ORDER BY name';
            const result = await pool.query(query);
            res.status(200).json(result.rows);
        } catch (e) { res.status(500).json({ message: e.message }); }
    });

    // POST (Create or Un-archive a new location)
    router.post('/', isAdmin, async (req, res) => {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Location name is required.' });
        }
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Check if the location exists
            const checkResult = await client.query('SELECT * FROM locations WHERE name = $1', [name]);
            
            let location;
            
            if (checkResult.rows.length === 0) {
                // Case 1: Doesn't exist. Create it.
                const insertResult = await client.query(
                    'INSERT INTO locations (name) VALUES ($1) RETURNING *', 
                    [name]
                );
                location = insertResult.rows[0];
            } else if (checkResult.rows[0].is_archived) {
                // Case 2: Exists and is archived. Un-archive it.
                const updateResult = await client.query(
                    'UPDATE locations SET is_archived = false WHERE id = $1 RETURNING *', 
                    [checkResult.rows[0].id]
                );
                location = updateResult.rows[0];
            } else {
                // Case 3: Exists and is active. Throw an error.
                throw new Error('Location name already exists and is active.');
            }
            
            await client.query('COMMIT');
            res.status(200).json(location); // Send 200 (OK) for both create and update

        } catch (e) {
            await client.query('ROLLBACK');
            // Check for unique constraint race condition
            if (e.code === '23505') {
                return res.status(409).json({ message: 'Location name already exists.' });
            }
            // Send our custom error message
            res.status(409).json({ message: e.message });
        } finally {
            client.release();
        }
    });

    // PUT (Rename a location)
    router.put('/:id', isAdmin, async (req, res) => {
        const { name } = req.body;
        try {
            const result = await pool.query('UPDATE locations SET name = $1 WHERE id = $2 RETURNING *', [name, req.params.id]);
            res.status(200).json(result.rows[0]);
        } catch (e) {
            if (e.code === '23505') return res.status(409).json({ message: 'Location name already exists.' });
            res.status(500).json({ message: e.message });
        }
    });

    // *** MODIFIED: DELETE (Smart Delete: Archive or Hard Delete) ***
    router.delete('/:id', isAdmin, async (req, res) => {
        const { id } = req.params;
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Get the location name
            const locResult = await client.query('SELECT name FROM locations WHERE id = $1', [id]);
            if (locResult.rows.length === 0) {
                throw new Error('Location not found.');
            }
            const { name } = locResult.rows[0];

            // 2. Check if this location has ANY *movement* history
            // *** THIS IS THE FIX: Removed 'CREATE_ITEM' from the check ***
            // A location is only "used" if it was part of an active stock move,
            // not just the creation of an item.
            const historyCheck = await client.query(
                `SELECT 1 FROM blockchain 
                 WHERE transaction->>'txType' IN ('STOCK_IN', 'STOCK_OUT', 'MOVE') 
                 AND (
                    transaction->>'location' = $1 OR
                    transaction->>'fromLocation' = $1 OR
                    transaction->>'toLocation' = $1
                 ) LIMIT 1`,
                [name]
            );

            let message;
            if (historyCheck.rows.length > 0) {
                // 3a. It has history. Soft-delete (Archive) it.
                await client.query('UPDATE locations SET is_archived = true WHERE id = $1', [id]);
                message = `Location "${name}" archived (it has transaction history).`;
            } else {
                // 3b. No history. It's safe to permanently delete.
                await client.query('DELETE FROM locations WHERE id = $1', [id]);
                message = `Location "${name}" permanently deleted.`;
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