const goalService = require('../services/goal.service');
const apiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

exports.getAll = catchAsync(async (req, res) => {
  const goals = await goalService.getAll(req.user.id);
  return apiResponse.success(res, { data: goals });
});

exports.getById = catchAsync(async (req, res) => {
  const goal = await goalService.getById(req.params.id, req.user.id);
  return apiResponse.success(res, goal);
});

exports.create = catchAsync(async (req, res) => {
  const goal = await goalService.create(req.user.id, req.body);
  return apiResponse.success(res, goal, 201);
});

exports.update = catchAsync(async (req, res) => {
  const goal = await goalService.update(req.params.id, req.user.id, req.body);
  return apiResponse.success(res, goal);
});

exports.delete = catchAsync(async (req, res) => {
  await goalService.delete(req.params.id, req.user.id);
  return apiResponse.noContent(res);
});
