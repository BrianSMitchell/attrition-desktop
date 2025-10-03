import { connectDatabase } from '../config/database';
import { Empire } from '../models/Empire';
import { CreditTransaction } from '../models/CreditTransaction';
import mongoose from 'mongoose';

async function monitorPayouts() {
  try {
    console.log('Connecting to database...\n');
    await connectDatabase();
    
    const empire = await Empire.findOne({}).sort({ createdAt: -1 });
    
    if (!empire) {
      console.log('No empire found!');
      process.exit(1);
    }
    
    console.log(`Monitoring payouts for: ${empire.name}`);
    console.log(`Economy/Hour: ${empire.economyPerHour || 0} credits/hour`);
    console.log(`Current Credits: ${empire.resources?.credits || 0}`);
    console.log(`Credits Remainder: ${(empire as any).creditsRemainderMilli || 0} milli-credits`);
    console.log(`Last Payout: ${(empire as any).lastCreditPayout || 'Never'}\n`);
    
    // Show recent transactions including payouts
    const recentTxns = await CreditTransaction.find({ empireId: empire._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    console.log('=== LAST 5 TRANSACTIONS ===\n');
    
    if (recentTxns.length === 0) {
      console.log('No transactions yet.\n');
    } else {
      recentTxns.forEach((tx: any, i: number) => {
        const icon = tx.amount >= 0 ? '💰' : '💸';
        const sign = tx.amount >= 0 ? '+' : '';
        console.log(`${i + 1}. ${icon} ${tx.type.toUpperCase()}`);
        console.log(`   Amount: ${sign}${tx.amount}`);
        console.log(`   Time: ${new Date(tx.createdAt).toLocaleString()}`);
        console.log('');
      });
    }
    
    // Check for payout transactions
    const payoutCount = await CreditTransaction.countDocuments({ 
      empireId: empire._id, 
      type: 'payout' 
    });
    
    console.log(`\n📊 PAYOUT SUMMARY:`);
    console.log(`   Total Payout Transactions: ${payoutCount}`);
    
    if (payoutCount === 0) {
      console.log('\n⏰ WAITING FOR FIRST PAYOUT...');
      console.log(`   With ${empire.economyPerHour || 0} credits/hour:`);
      console.log(`   - You earn ${((empire.economyPerHour || 0) / 60).toFixed(2)} credits per minute`);
      console.log(`   - Payouts happen when you accumulate 1+ whole credits`);
      console.log(`   - Estimated time until payout: ~${Math.ceil(60 / (empire.economyPerHour || 1))} minutes`);
      console.log('\n💡 TIP: Build more Metal Refineries or Crystal Labs to increase income!');
    } else {
      const lastPayout = await CreditTransaction.findOne({ 
        empireId: empire._id, 
        type: 'payout' 
      }).sort({ createdAt: -1 });
      
      if (lastPayout) {
        const timeSince = Date.now() - new Date((lastPayout as any).createdAt).getTime();
        const minutesSince = Math.floor(timeSince / 60000);
        
        console.log(`   Last Payout: ${(lastPayout as any).amount} credits (${minutesSince} minutes ago)`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

monitorPayouts();
