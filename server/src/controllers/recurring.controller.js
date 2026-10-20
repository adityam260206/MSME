const recurringService = require('../services/recurring.service');
const apiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

exports.getAll = catchAsync(async (req, res) => {
  const recurring = await recurringService.getAll(req.user.id);
  return apiResponse.success(res, { data: recurring });
});

exports.getById = catchAsync(async (req, res) => {
  const recurring = await recurringService.getById(req.params.id, req.user.id);
  return apiResponse.success(res, recurring);
});

exports.create = catchAsync(async (req, res) => {
  const recurring = await recurringService.create(req.user.id, req.body);
  return apiResponse.success(res, recurring, 201);
});

exports.update = catchAsync(async (req, res) => {
  const recurring = await recurringService.update(req.params.id, req.user.id, req.body);
  return apiResponse.success(res, recurring);
});

exports.delete = catchAsync(async (req, res) => {
  await recurringService.delete(req.params.id, req.user.id);
  return apiResponse.noContent(res);
});

exports.toggleStatus = catchAsync(async (req, res) => {
  const recurring = await recurringService.toggleStatus(req.params.id, req.user.id);
  return apiResponse.success(res, recurring);
});
