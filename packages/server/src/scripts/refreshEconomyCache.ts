import { connectDatabase } from '../config/database';
import { Empire } from '../models/Empire';
import { EmpireEconomyService } from '../services/empireEconomyService';
import { EconomyService } from '../services/economyService';
import mongoose from 'mongoose';

async function refreshEconomyCache() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    
    const empire = await Empire.findOne({}).sort({ createdAt: -1 });
    
    if (!empire) {
      console.log('❌ No empire found!');
      process.exit(1);
    }
    
    const empireId = (empire._id as mongoose.Types.ObjectId).toString();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   EMPIRE ECONOMY CACHE REFRESH         ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    console.log(`Empire: ${empire.name}`);
    console.log(`Empire ID: ${empireId}\n`);
    
    // Show OLD cached value
    console.log('📊 BEFORE REFRESH:');
    console.log(`   Cached Economy/Hour: ${empire.economyPerHour || 0}`);
    console.log(`   Current Credits: ${empire.resources?.credits || 0}\n`);
    
    // Calculate fresh economy
    console.log('🔄 Calculating fresh economy...\n');
    const economyBreakdown = await EconomyService.computeEmpireEconomy(empireId);
    const researchBonuses = await EconomyService.getResearchCreditBonuses(empireId);
    
    console.log('💰 ECONOMY BREAKDOWN:');
    console.log(`   Base Production: ${economyBreakdown.totalCreditsPerHour} credits/hour`);
    console.log(`   Research Bonuses: ${researchBonuses} credits/hour`);
    console.log(`   ────────────────────────`);
    console.log(`   TOTAL: ${economyBreakdown.totalCreditsPerHour + researchBonuses} credits/hour\n`);
    
    // Show base-level breakdown
    if (economyBreakdown.bases && economyBreakdown.bases.length > 0) {
      console.log('📍 PER-BASE BREAKDOWN:');
      for (const base of economyBreakdown.bases) {
        console.log(`\n   Base: ${base.coord}`);
        console.log(`   - Metal Refineries: ${base.metalRefineries} credits/hour`);
        console.log(`   - Crystal Labs: ${base.crystalLabs} credits/hour`);
        console.log(`   - Nanite Factories: ${base.naniteFactories} credits/hour`);
        console.log(`   - Subtotal: ${base.totalCreditsPerHour} credits/hour`);
      }
      console.log('');
    }
    
    // Update the cache
    console.log('💾 Updating cache...');
    const newEconomy = await EmpireEconomyService.updateEmpireEconomy(empireId);
    
    // Reload empire to show new value
    const updatedEmpire = await Empire.findById(empireId);
    
    console.log('\n✅ AFTER REFRESH:');
    console.log(`   Cached Economy/Hour: ${updatedEmpire?.economyPerHour || 0}`);
    console.log(`   Current Credits: ${updatedEmpire?.resources?.credits || 0}\n`);
    
    if ((updatedEmpire?.economyPerHour || 0) > 0) {
      console.log('🎉 SUCCESS! Your economy cache is now updated.');
      console.log('   Credit payouts should start appearing in your history.');
      console.log(`   Expected payout: ${Math.floor((updatedEmpire?.economyPerHour || 0) / 60)} credits per minute\n`);
    } else {
      console.log('⚠️  Economy is still 0. You need to build:');
      console.log('   - Metal Refineries (process metal into credits)');
      console.log('   - Crystal Labs (process crystals into credits)');
      console.log('   - Nanite Factories (high-tier income)\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

refreshEconomyCache();
