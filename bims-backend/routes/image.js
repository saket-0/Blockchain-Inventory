// bims-backend/routes/image.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
};

module.exports = (pool) => {
    /**
     * POST /api/image/proxy
     * Fetches a remote image URL, converts it to Base64, and returns it.
     * This bypasses client-side CORS restrictions.
     */
    router.post('/proxy', isAuthenticated, async (req, res) => {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ message: 'Image URL is required.' });
        }

        try {
            // Validate the URL format (basic check)
            new URL(url);
        } catch (e) {
            console.log('❌ Invalid URL:', url);
            return res.status(400).json({ message: 'Invalid URL provided.' });
        }

        console.log(`Attempting to proxy image: ${url}`);

        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'BIMS-Image-Proxy/1.0' } // Act like a browser
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch image. Server responded with ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('Remote URL did not return an image.');
            }

            // Read the image data as a buffer
            const buffer = await response.buffer();

            // Convert buffer to Base64 data URL
            const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;

            console.log('✅ Image proxied successfully.');
            res.status(200).json({ base64: base64 });

        } catch (error) {
            console.error('❌ Image proxy error:', error.message);
            res.status(500).json({ message: `Image proxy failed: ${error.message}` });
        }
    });

    return router;
};