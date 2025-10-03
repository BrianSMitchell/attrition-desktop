import mongoose from 'mongoose';
import { Colony } from '../models/Colony';
import { CapacityService } from './capacityService';

/**
 * BaseCitizenService - maintains citizen accrual per base.
 * Uses aligned payout periods with milli-citizens remainder to avoid fractional loss,
 * similar to Empire credits.
 */
export class BaseCitizenService {
  /** Update citizens for all colonies owned by an empire */
  static async updateEmpireBases(empireId: string): Promise<{ updated: number; errors: number }> {
    let updated = 0;
    let errors = 0;
    try {
      const colonies = await Colony.find({ empireId: new mongoose.Types.ObjectId(empireId) })
        .select('_id locationCoord citizens lastCitizenUpdate citizenRemainderMilli createdAt')
        .lean();

      for (const c of colonies || []) {
        try {
          const coord = String((c as any).locationCoord || '');
          if (!coord) continue;

          // Determine aligned period (default 1 minute)
          const periodMinutes = parseInt(process.env.CITIZEN_PAYOUT_PERIOD_MINUTES || '1', 10);
          const periodMs = Math.max(60000, periodMinutes * 60 * 1000); // ensure >= 60s
          const now = new Date();
          const getBoundary = (date: Date) => new Date(Math.floor(date.getTime() / periodMs) * periodMs);

          const lastUpdate: Date = (c as any).lastCitizenUpdate || (c as any).createdAt || now;
          const lastBoundary = getBoundary(lastUpdate);
          const currentBoundary = getBoundary(now);
          const periodsElapsed = Math.floor((currentBoundary.getTime() - lastBoundary.getTime()) / periodMs);

          if (periodsElapsed <= 0) {
            continue;
          }

          // Get per-hour citizen generation
          const caps = await CapacityService.getBaseCapacities(empireId, coord);
          const perHour = Math.max(0, Number((caps as any)?.citizen?.value || 0));
          if (!(perHour > 0)) {
            // Still advance lastCitizenUpdate so we don't accumulate infinite periods
            await Colony.updateOne(
              { _id: (c as any)._id },
              { $set: { lastCitizenUpdate: new Date(lastBoundary.getTime() + periodsElapsed * periodMs) } }
            );
            continue;
          }

          // Micro-citizens per period (milli-units)
          const microPerPeriod = Math.round(perHour * (periodMs / (60 * 60 * 1000)) * 1000);
          const totalMicro = microPerPeriod * periodsElapsed;

          const prevRema = Math.max(0, Number((c as any).citizenRemainderMilli || 0));
          const newMicroWithRema = prevRema + totalMicro;
          const wholeCitizens = Math.floor(newMicroWithRema / 1000);
          const newRema = newMicroWithRema % 1000;

          const newCount = Math.max(0, Number((c as any).citizens || 0)) + wholeCitizens;

          await Colony.updateOne(
            { _id: (c as any)._id },
            {
              $set: {
                citizens: newCount,
                citizenRemainderMilli: newRema,
                lastCitizenUpdate: new Date(lastBoundary.getTime() + (periodsElapsed * periodMs)),
              },
            }
          );

          updated++;
        } catch (e) {
          errors++;
          console.error('[BaseCitizenService] update colony error', e);
        }
      }
    } catch (e) {
      console.error('[BaseCitizenService] top-level error', e);
    }
    return { updated, errors };
  }
}
