import { connectDatabase } from '../config/database';
import { Empire } from '../models/Empire';
import { CreditTransaction } from '../models/CreditTransaction';
import mongoose from 'mongoose';

async function diagnoseCreditHistory() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    
    // Find the most recent empire (or you can search by name/userId)
    const empire = await Empire.findOne({}).sort({ createdAt: -1 });
    
    if (!empire) {
      console.log('❌ No empire found in database!');
      process.exit(1);
    }
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     EMPIRE CREDIT STATUS               ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log(`Empire Name: ${empire.name}`);
    console.log(`Empire ID: ${empire._id}`);
    console.log(`Current Credits: ${empire.resources?.credits || 0}`);
    console.log(`Economy Per Hour: ${(empire as any).economyPerHour || 0}`);
    console.log(`Last Resource Update: ${empire.lastResourceUpdate || 'Never'}`);
    console.log(`Last Credit Payout: ${(empire as any).lastCreditPayout || 'Never'}`);
    console.log(`Credits Remainder (milli): ${(empire as any).creditsRemainderMilli || 0}`);
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     RECENT CREDIT TRANSACTIONS         ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const transactions = await CreditTransaction.find({ empireId: empire._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    if (transactions.length === 0) {
      console.log('⚠️  NO CREDIT TRANSACTIONS FOUND!');
      console.log('\nPossible reasons:');
      console.log('1. 📉 Credits/hour production is 0 (no buildings generating income)');
      console.log('2. ⏰ Not enough time has elapsed for a payout period');
      console.log('3. 🛑 Game loop is not running');
      console.log('4. 🏭 No structures built to generate credits');
      
      // Check for buildings
      const { Building } = await import('../models/Building');
      const buildings = await Building.find({ empireId: empire._id, isActive: true });
      console.log(`\n📊 Active Buildings: ${buildings.length}`);
      if (buildings.length === 0) {
        console.log('   ⚠️  You have no active buildings! Build structures to generate credits.');
      }
    } else {
      console.log(`Found ${transactions.length} transactions:\n`);
      
      const payoutCount = transactions.filter((t: any) => t.type === 'payout').length;
      const deductionCount = transactions.filter((t: any) => t.type !== 'payout').length;
      
      console.log(`💰 Payout transactions: ${payoutCount}`);
      console.log(`💸 Deduction transactions: ${deductionCount}\n`);
      
      transactions.forEach((tx: any, i: number) => {
        const icon = tx.amount >= 0 ? '💰' : '💸';
        const sign = tx.amount >= 0 ? '+' : '';
        console.log(`${i + 1}. ${icon} ${tx.type.toUpperCase()}`);
        console.log(`   Amount: ${sign}${tx.amount} credits`);
        console.log(`   Balance After: ${tx.balanceAfter !== undefined ? tx.balanceAfter : 'N/A'}`);
        console.log(`   Note: ${tx.note || 'None'}`);
        console.log(`   Created: ${new Date(tx.createdAt).toLocaleString()}`);
        if (tx.meta) {
          console.log(`   Meta: ${JSON.stringify(tx.meta)}`);
        }
        console.log('');
      });
    }
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     TRANSACTION TYPE SUMMARY           ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const typeCounts = await CreditTransaction.aggregate([
      { $match: { empireId: empire._id } },
      { $group: { 
        _id: '$type', 
        count: { $sum: 1 }, 
        totalAmount: { $sum: '$amount' } 
      }},
      { $sort: { count: -1 } }
    ]);
    
    if (typeCounts.length === 0) {
      console.log('No transaction types found.');
    } else {
      typeCounts.forEach((tc: any) => {
        const icon = tc.totalAmount >= 0 ? '💰' : '💸';
        console.log(`${icon} ${tc._id}:`);
        console.log(`   Count: ${tc.count} transactions`);
        console.log(`   Total: ${tc.totalAmount >= 0 ? '+' : ''}${tc.totalAmount} credits\n`);
      });
    }
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     SYSTEM STATUS                      ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Credit Payout Period: ${process.env.CREDIT_PAYOUT_PERIOD_MINUTES || '1'} minutes`);
    console.log(`Debug Resources: ${process.env.DEBUG_RESOURCES || 'false'}`);
    
  } catch (error) {
    console.error('\n❌ Error running diagnostic:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

diagnoseCreditHistory();
