import { sql } from '@/lib/database';

export interface APIUsage {
  api_name: string;
  request_count: number;
  last_reset_date: string;
  limit?: number;
  cost_per_request?: number;
}

export const API_LIMITS = {
  'Reed': { limit: 250, cost_per_request: 0, reset_period: 'monthly' },
  'Adzuna': { limit: 1000, cost_per_request: 0, reset_period: 'monthly' },
  'RapidAPI-JSearch': { limit: 500, cost_per_request: 0.001, reset_period: 'monthly' },
  'Arbeitnow': { limit: 1000, cost_per_request: 0, reset_period: 'daily' },
  'RemoteOK': { limit: 1000, cost_per_request: 0, reset_period: 'daily' },
  'Indeed': { limit: 1000, cost_per_request: 0, reset_period: 'daily' }, // RSS scraping
  'JSearch': { limit: 500, cost_per_request: 0.001, reset_period: 'monthly' },
  'Jooble': { limit: 1000, cost_per_request: 0, reset_period: 'daily' },
  'TheMuse': { limit: 500, cost_per_request: 0, reset_period: 'daily' }
};

export async function trackAPIUsage(apiName: string, endpoint?: string): Promise<void> {
  if (!sql) return;

  try {
    const today = new Date().toISOString().split('T')[0];

    // Update or insert API usage record
    await sql`
      INSERT INTO api_usage (api_name, endpoint, request_count, last_reset_date, updated_at)
      VALUES (${apiName}, ${endpoint || ''}, 1, ${today}, NOW())
      ON CONFLICT (api_name, last_reset_date)
      DO UPDATE SET
        request_count = api_usage.request_count + 1,
        updated_at = NOW()
    `;

    console.log(`📊 API Usage tracked: ${apiName} - ${endpoint || 'general'}`);
  } catch (error) {
    console.error('Failed to track API usage:', error);
  }
}

export async function getAPIUsage(): Promise<APIUsage[]> {
  if (!sql) return [];

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get today's usage for each API
    const usageData = await sql`
      SELECT
        api_name,
        SUM(request_count) as request_count,
        last_reset_date
      FROM api_usage
      WHERE last_reset_date = ${today}
      GROUP BY api_name, last_reset_date
      ORDER BY api_name
    `;

    // Add API limits and calculate usage percentages
    return usageData.map(usage => ({
      ...usage,
      request_count: parseInt(usage.request_count),
      limit: API_LIMITS[usage.api_name as keyof typeof API_LIMITS]?.limit,
      cost_per_request: API_LIMITS[usage.api_name as keyof typeof API_LIMITS]?.cost_per_request
    }));
  } catch (error) {
    console.error('Failed to get API usage:', error);
    return [];
  }
}

export async function getAPIUsageHistory(days: number = 7): Promise<any[]> {
  if (!sql) return [];

  try {
    const usageHistory = await sql`
      SELECT
        api_name,
        last_reset_date,
        SUM(request_count) as request_count
      FROM api_usage
      WHERE last_reset_date >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY api_name, last_reset_date
      ORDER BY last_reset_date DESC, api_name
    `;

    return usageHistory.map(usage => ({
      ...usage,
      request_count: parseInt(usage.request_count)
    }));
  } catch (error) {
    console.error('Failed to get API usage history:', error);
    return [];
  }
}

export function getUsagePercentage(used: number, limit?: number): number {
  if (!limit) return 0;
  return Math.round((used / limit) * 100);
}

export function getUsageStatus(used: number, limit?: number): 'safe' | 'warning' | 'danger' {
  const percentage = getUsagePercentage(used, limit);
  if (percentage >= 90) return 'danger';
  if (percentage >= 75) return 'warning';
  return 'safe';
}