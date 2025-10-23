const express = require('express');
const router = express.Router();
const axios = require('axios');

// KIE.ai API endpoint
const KIE_AI_API_URL = 'https://api.kie.ai/v1';

// Route for AI generation
router.post('/generate', async (req, res) => {
  try {
    const { type, prompt, options } = req.body;
    
    // Validate request
    if (!type || !prompt) {
      return res.status(400).json({
        error: 'Missing required parameters: type and prompt',
        success: false
      });
    }

    // Prepare request to KIE.ai
    const requestData = {
      provider: 'kie.ai',
      type,
      prompt,
      options: options || {}
    };

    // Call KIE.ai API
    const response = await axios.post(`${KIE_AI_API_URL}/generate`, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_AI_API_KEY || ''}`
      }
    });

    // Return the generated content
    return res.status(200).json({
      success: true,
      data: response.data,
      type
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return res.status(500).json({
      error: 'Failed to generate content',
      success: false,
      details: error.message
    });
  }
});

module.exports = router;


