const User = require('../models/User.model');
const Account = require('../models/Account.model');
const Transaction = require('../models/Transaction.model');
const RecurringTransaction = require('../models/RecurringTransaction.model');

/**
 * One-time migration script to transition users from a single global balance
 * to the new Multiple Accounts architecture (Feature 5).
 * 
 * For each user:
 * 1. Checks if they already have an account. If not, creates "Main Wallet".
 * 2. Finds all transactions missing an account reference and links them to the wallet.
 * 3. Calculates the true current balance of the wallet based on those transactions.
 * 4. Links any orphaned recurring transactions to the wallet.
 */
async function migrateToMultipleAccounts() {
  console.log('[migration] Starting Multiple Accounts migration check...');
  try {
    const users = await User.find();
    
    let usersMigrated = 0;
    let transactionsLinked = 0;
    
    for (const user of users) {
      // 1. Check if user already has an account
      const existingAccounts = await Account.countDocuments({ user: user._id });
      
      if (existingAccounts === 0) {
        // Create default wallet
        const mainWallet = await Account.create({
          user: user._id,
          name: 'Main Wallet',
          type: 'cash',
          initialBalance: 0,
          currentBalance: 0,
          color: '#3b82f6'
        });
        
        // 2. Link orphaned transactions
        const orphanedTx = await Transaction.find({ 
          user: user._id, 
          $or: [{ account: null }, { account: { $exists: false } }]
        });
        
        if (orphanedTx.length > 0) {
          let balance = 0;
          for (const tx of orphanedTx) {
            tx.account = mainWallet._id;
            await tx.save();
            
            if (tx.type === 'income') balance += tx.amount;
            else balance -= tx.amount;
            
            transactionsLinked++;
          }
          
          // 3. Update wallet balance
          mainWallet.currentBalance = balance;
          await mainWallet.save();
        }
        
        // 4. Link orphaned recurring transactions
        // Note: Earlier recurring tx stored account as a String ('Cash')
        const orphanedRecurring = await RecurringTransaction.find({ user: user._id });
        for (const rt of orphanedRecurring) {
          if (!rt.account || typeof rt.account === 'string') {
            rt.account = mainWallet._id;
            await rt.save();
          }
        }
        
        usersMigrated++;
      }
    }
    
    console.log(`[migration] Complete. Migrated ${usersMigrated} users and linked ${transactionsLinked} transactions.`);
  } catch (error) {
    console.error('[migration] Error during accounts migration:', error);
  }
}

module.exports = migrateToMultipleAccounts;
