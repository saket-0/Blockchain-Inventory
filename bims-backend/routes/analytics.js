// bims-backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const { rebuildStateAt } = require('../chain-utils');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
};

// SQL query to select columns and alias them to camelCase
const SELECT_BLOCKCHAIN_FIELDS = `
    SELECT 
        index, 
        timestamp, 
        transaction, 
        previous_hash AS "previousHash", 
        hash 
    FROM blockchain
`;

module.exports = (pool) => {

    /**
     * FEATURE 1: Predictive Low-Stock
     * GET /api/analytics/low-stock-predictions
     * Analyzes stock-out velocity over the last 30 days to predict
     * when items will run out of stock.
     */
    router.get('/low-stock-predictions', isAuthenticated, async (req, res) => {
        console.log('📈 Generating low-stock predictions...');
        
        try {
            // 1. Get the full chain
            const chainResult = await pool.query(`${SELECT_BLOCKCHAIN_FIELDS} ORDER BY index ASC`);
            const currentChain = chainResult.rows;

            if (currentChain.length <= 1) {
                return res.json([]); // Not enough data
            }

            // 2. Rebuild the CURRENT inventory state
            const { inventory } = rebuildStateAt(currentChain, new Date().toISOString());
            
            // 3. Calculate STOCK_OUT velocity for the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const velocityMap = new Map(); // Map<itemSku, totalStockOut>

            currentChain.forEach(block => {
                const tx = block.transaction;
                const blockDate = new Date(block.timestamp);
                
                if (tx.txType === 'STOCK_OUT' && blockDate > thirtyDaysAgo) {
                    const currentVelocity = velocityMap.get(tx.itemSku) || 0;
                    velocityMap.set(tx.itemSku, currentVelocity + tx.quantity);
                }
            });

            // 4. Generate predictions
            const predictions = [];
            const PREDICTION_THRESHOLD_DAYS = 7; // Warn if stock will be low within 7 days

            inventory.forEach((product, sku) => {
                let totalStock = 0;
                product.locations.forEach(qty => totalStock += qty);

                const totalStockOut = velocityMap.get(sku) || 0;
                
                if (totalStockOut > 0) { // Only predict if there is velocity
                    const dailyVelocity = totalStockOut / 30;
                    const daysToEmpty = Math.floor(totalStock / dailyVelocity);

                    if (daysToEmpty <= PREDICTION_THRESHOLD_DAYS) {
                        predictions.push({
                            id: sku,
                            name: product.productName,
                            stock: totalStock,
                            daysToEmpty: daysToEmpty
                        });
                    }
                }
            });

            // Sort by most urgent
            predictions.sort((a, b) => a.daysToEmpty - b.daysToEmpty);
            
            console.log(`✅ Found ${predictions.length} proactive warnings.`);
            res.status(200).json(predictions);

        } catch (e) {
            console.error('❌ Error generating predictions:', e);
            res.status(500).json({ message: e.message });
        }
    });

    /**
     * FEATURE 2: Anomaly Detection
     * GET /api/analytics/anomalies
     * Scans the entire blockchain for transactions that are
     * technically valid but break business logic rules.
     */
    router.get('/anomalies', isAuthenticated, async (req, res) => {
        console.log('🛡️ Running anomaly detection scan...');
        
        // This feature is for auditors/admins
        if (req.session.user.role !== 'Admin' && req.session.user.role !== 'Auditor') {
            return res.status(403).json({ message: 'Forbidden: Admin or Auditor access required' });
        }

        try {
            // 1. Get all users to map names to roles
            const usersResult = await pool.query('SELECT name, role FROM users');
            const userRoleMap = new Map(usersResult.rows.map(u => [u.name, u.role]));
            
            // 2. Get the full chain
            const chainResult = await pool.query(`${SELECT_BLOCKCHAIN_FIELDS} ORDER BY index ASC`);
            const anomalies = [];

            // 3. Define and run rules against every block
            for (const block of chainResult.rows) {
                if (block.index === 0) continue; // Skip Genesis

                const tx = block.transaction;
                const reasons = [];

                // Rule 1: Unusual Time (10 PM - 6 AM UTC)
                const hour = new Date(block.timestamp).getUTCHours();
                if (hour < 6 || hour > 22) {
                    reasons.push(`Transaction occurred at an unusual time (${hour}:00 UTC).`);
                }
                
                // Rule 2: Unusual Role for Action
                const userRole = userRoleMap.get(tx.userName);
                if (tx.txType === 'MOVE' && userRole === 'Admin') {
                    reasons.push(`MOVE operation performed by an Admin, not a Manager.`);
                }

                // Rule 3: Unusual Logistics (Supplier -> Retailer)
                if (tx.txType === 'MOVE' && tx.fromLocation === 'Supplier' && tx.toLocation === 'Retailer') {
                    reasons.push(`Logistics anomaly: Skipped Warehouse (Supplier -> Retailer).`);
                }
                
                // If any rules were triggered, add to list
                if (reasons.length > 0) {
                    anomalies.push({ block, reasons });
                }
            }
            
            console.log(`✅ Anomaly scan complete. Found ${anomalies.length} flags.`);
            // Return newest anomalies first
            res.status(200).json(anomalies.reverse());

        } catch (e) {
            console.error('❌ Error scanning for anomalies:', e);
            res.status(500).json({ message: e.message });
        }
    });

    return router;
};