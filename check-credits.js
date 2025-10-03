// Quick diagnostic script to check your credit production
// Run with: node check-credits.js

const mongoose = require('mongoose');

async function checkCredits() {
  try {
    // Connect to your database (adjust connection string as needed)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attrition');
    
    const Empire = mongoose.model('Empire', new mongoose.Schema({}, { strict: false }));
    const CreditTransaction = mongoose.model('CreditTransaction', new mongoose.Schema({}, { strict: false }));
    
    // Find your empire (adjust query as needed)
    const empire = await Empire.findOne({}).sort({ createdAt: -1 });
    
    if (!empire) {
      console.log('No empire found!');
      return;
    }
    
    console.log('\n=== Empire Credit Status ===');
    console.log('Empire Name:', empire.name);
    console.log('Current Credits:', empire.resources?.credits || 0);
    console.log('Economy Per Hour:', empire.economyPerHour || 0);
    console.log('Last Resource Update:', empire.lastResourceUpdate);
    console.log('Last Credit Payout:', empire.lastCreditPayout);
    console.log('Credits Remainder (milli):', empire.creditsRemainderMilli || 0);
    
    // Check recent credit transactions
    console.log('\n=== Recent Credit Transactions ===');
    const transactions = await CreditTransaction.find({ empireId: empire._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    if (transactions.length === 0) {
      console.log('No credit transactions found!');
      console.log('\nPossible reasons:');
      console.log('1. Credits/hour is 0 (no income)');
      console.log('2. Not enough time has elapsed for a payout');
      console.log('3. Game loop is not running');
    } else {
      transactions.forEach((tx, i) => {
        console.log(`\n${i + 1}. ${tx.type.toUpperCase()}`);
        console.log('   Amount:', tx.amount);
        console.log('   Balance After:', tx.balanceAfter);
        console.log('   Note:', tx.note);
        console.log('   Created:', tx.createdAt);
      });
    }
    
    // Count transaction types
    console.log('\n=== Transaction Type Summary ===');
    const typeCounts = await CreditTransaction.aggregate([
      { $match: { empireId: empire._id } },
      { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);
    
    typeCounts.forEach(tc => {
      console.log(`${tc._id}: ${tc.count} transactions, Total: ${tc.total} credits`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCredits();
