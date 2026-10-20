const Goal = require('../models/Goal.model');
const AppError = require('../utils/AppError');

const mapLinkedGoal = (goal) => {
  const g = goal.toObject({ virtuals: true });
  if (g.linkedAccountId && g.linkedAccountId.currentBalance !== undefined) {
    g.currentAmount = g.linkedAccountId.currentBalance;
    // Recalculate virtuals manually since we altered the field after hydration
    g.completionPercentage = g.targetAmount === 0 ? 0 : Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
    g.remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
    if (g.currentAmount >= g.targetAmount && g.status === 'active') {
      g.status = 'completed';
    }
  }
  return g;
};

exports.getAll = async (userId) => {
  const goals = await Goal.find({ user: userId })
    .populate('linkedAccountId', 'name currentBalance')
    .sort({ status: 1, priority: -1, deadline: 1 }); 
  
  return goals.map(mapLinkedGoal);
};

exports.getById = async (id, userId) => {
  const goal = await Goal.findOne({ _id: id, user: userId }).populate('linkedAccountId', 'name currentBalance');
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }
  return mapLinkedGoal(goal);
};

exports.create = async (userId, data) => {
  const goal = await Goal.create({ ...data, user: userId });
  return goal;
};

exports.update = async (id, userId, data) => {
  const goal = await Goal.findOne({ _id: id, user: userId });
  
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }

  // Auto-complete if target reached (only if not linked, since linked is dynamic)
  if (!data.linkedAccountId) {
    if (data.currentAmount !== undefined && data.currentAmount >= (data.targetAmount || goal.targetAmount)) {
      data.status = 'completed';
      data.currentAmount = data.targetAmount || goal.targetAmount;
    } else if (data.status === 'completed' && data.currentAmount < (data.targetAmount || goal.targetAmount)) {
      data.status = 'active';
    }
  } else {
    // If linking an account, remove manual currentAmount
    delete data.currentAmount;
  }

  const updatedGoal = await Goal.findOneAndUpdate(
    { _id: id, user: userId },
    data,
    { new: true, runValidators: true }
  ).populate('linkedAccountId', 'name currentBalance');

  return mapLinkedGoal(updatedGoal);
};

exports.delete = async (id, userId) => {
  const goal = await Goal.findOneAndDelete({ _id: id, user: userId });
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }
  return true;
};
