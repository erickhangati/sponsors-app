'use client';

import { SponsorChildrenStats } from './sponsor-children-stats';
import { SponsorPaymentsStats } from './sponsor-payments-stats';
import { SponsorReportsStats } from './sponsor-reports-stats';

export function SponsorDashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <SponsorChildrenStats />
      <SponsorPaymentsStats />
      <SponsorReportsStats />
    </div>
  );
}
