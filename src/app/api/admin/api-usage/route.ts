import { NextRequest, NextResponse } from 'next/server';
import { verifyTesterToken, createTesterAPIResponse } from '@/lib/admin-middleware';
import { getAPIUsage, getAPIUsageHistory, API_LIMITS } from '@/lib/api-usage-tracker';

export async function GET(request: NextRequest) {
  try {
    // Verify admin or tester access
    const authResult = await verifyTesterToken(request);
    if (!authResult.isValid) {
      return createTesterAPIResponse(authResult.error || 'Unauthorized');
    }

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');

    // Get current usage and history
    const [currentUsage, usageHistory] = await Promise.all([
      getAPIUsage(),
      getAPIUsageHistory(days)
    ]);

    // Calculate total costs
    const totalCost = currentUsage.reduce((sum, api) => {
      const cost = (api.cost_per_request || 0) * api.request_count;
      return sum + cost;
    }, 0);

    // Get API status information
    const apiStatus = Object.entries(API_LIMITS).map(([name, config]) => {
      const usage = currentUsage.find(u => u.api_name === name);
      const used = usage?.request_count || 0;
      const percentage = config.limit ? Math.round((used / config.limit) * 100) : 0;

      return {
        name,
        used,
        limit: config.limit,
        percentage,
        cost_per_request: config.cost_per_request,
        reset_period: config.reset_period,
        status: percentage >= 90 ? 'danger' : percentage >= 75 ? 'warning' : 'safe',
        daily_cost: (config.cost_per_request || 0) * used
      };
    });

    return NextResponse.json({
      summary: {
        total_requests_today: currentUsage.reduce((sum, api) => sum + api.request_count, 0),
        total_cost_today: totalCost,
        apis_at_risk: apiStatus.filter(api => api.status === 'danger').length,
        apis_warning: apiStatus.filter(api => api.status === 'warning').length
      },
      api_status: apiStatus,
      current_usage: currentUsage,
      usage_history: usageHistory
    });

  } catch (error) {
    console.error('Admin API usage fetch error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}