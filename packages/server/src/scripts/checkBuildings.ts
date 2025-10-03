import { connectDatabase } from '../config/database';
import { Empire } from '../models/Empire';
import { Building } from '../models/Building';
import mongoose from 'mongoose';

async function checkBuildings() {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    
    const empire = await Empire.findOne({}).sort({ createdAt: -1 });
    
    if (!empire) {
      console.log('No empire found!');
      process.exit(1);
    }
    
    console.log(`\n=== Buildings for ${empire.name} ===\n`);
    
    const buildings = await Building.find({ empireId: empire._id, isActive: true })
      .sort({ catalogKey: 1, level: -1 });
    
    if (buildings.length === 0) {
      console.log('❌ NO ACTIVE BUILDINGS FOUND!');
      console.log('\nYou need to build structures that generate income:');
      console.log('- Metal Refineries (process metal into credits)');
      console.log('- Crystal Labs (process crystals into credits)');
      console.log('- Nanite Factories (high-tier income)');
    } else {
      const byType = new Map<string, Array<{level: number, location: string}>>();
      
      for (const building of buildings) {
        const key = (building as any).catalogKey || (building as any).type;
        if (!byType.has(key)) {
          byType.set(key, []);
        }
        byType.get(key)!.push({
          level: (building as any).level || 1,
          location: (building as any).locationCoord
        });
      }
      
      console.log(`Total Active Buildings: ${buildings.length}\n`);
      
      // Sort by key name
      const sortedTypes = Array.from(byType.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      
      for (const [type, instances] of sortedTypes) {
        const totalLevels = instances.reduce((sum, b) => sum + b.level, 0);
        const icon = 
          type.includes('refiner') ? '💰' :
          type.includes('crystal') ? '💎' :
          type.includes('nanite') ? '🏭' :
          type.includes('solar') || type.includes('gas') || type.includes('fusion') ? '⚡' :
          type.includes('urban') ? '🏘️' :
          type.includes('research') ? '🔬' :
          type.includes('shipyard') ? '🚀' :
          '🏗️';
        
        console.log(`${icon} ${type}: ${instances.length} buildings, Total Levels: ${totalLevels}`);
        instances.forEach((b, i) => {
          console.log(`   ${i + 1}. Level ${b.level} at ${b.location}`);
        });
        console.log('');
      }
      
      // Calculate potential income
      const metalRefineries = byType.get('metal_refineries');
      const crystalLabs = byType.get('crystal_labs');
      
      console.log('\n=== INCOME ANALYSIS ===\n');
      
      if (metalRefineries) {
        const totalMetalLevels = metalRefineries.reduce((sum, b) => sum + b.level, 0);
        console.log(`💰 Metal Refineries: ${metalRefineries.length} buildings, ${totalMetalLevels} total levels`);
      } else {
        console.log('❌ NO METAL REFINERIES - Build these to generate income!');
      }
      
      if (crystalLabs) {
        const totalCrystalLevels = crystalLabs.reduce((sum, b) => sum + b.level, 0);
        console.log(`💎 Crystal Labs: ${crystalLabs.length} buildings, ${totalCrystalLevels} total levels`);
      } else {
        console.log('⚠️  NO CRYSTAL LABS - These provide additional income');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkBuildings();
