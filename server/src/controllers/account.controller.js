const accountService = require('../services/account.service');
const apiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

exports.getAll = catchAsync(async (req, res) => {
  const accounts = await accountService.getAll(req.user.id);
  return apiResponse.success(res, { data: accounts });
});

exports.getById = catchAsync(async (req, res) => {
  const account = await accountService.getById(req.params.id, req.user.id);
  return apiResponse.success(res, account);
});

exports.create = catchAsync(async (req, res) => {
  const account = await accountService.create(req.user.id, req.body);
  return apiResponse.success(res, account, 201);
});

exports.update = catchAsync(async (req, res) => {
  const account = await accountService.update(req.params.id, req.user.id, req.body);
  return apiResponse.success(res, account);
});

exports.delete = catchAsync(async (req, res) => {
  await accountService.delete(req.params.id, req.user.id);
  return apiResponse.noContent(res);
});

exports.transfer = catchAsync(async (req, res) => {
  const result = await accountService.transfer(req.user.id, req.body);
  return apiResponse.success(res, result);
});
