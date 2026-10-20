const aiService = require('../services/ai.service');
const apiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Handle AI chat completions
 * POST /api/v1/ai/chat
 */
const chat = catchAsync(async (req, res) => {
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    throw AppError.badRequest('Messages array is required');
  }

  const aiMessage = await aiService.generateChatResponse(messages);
  
  return apiResponse.success(res, { message: aiMessage });
});

module.exports = {
  chat
};
