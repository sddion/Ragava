import {  NextResponse } from 'next/server'
import { apiManager } from '@/lib/api-manager'

/**
 * API Status Endpoint
 * 
 * Returns the current status of all API keys and their usage
 */

export async function GET() {
  try {
    const status = apiManager.getApiStatus()
    
    return NextResponse.json({
      success: true,
      data: {
        apis: status,
        totalApis: status.length,
        activeApis: status.filter(api => api.isActive).length,
        totalRequestsUsed: status.reduce((sum, api) => sum + api.requestsUsed, 0),
        totalRequestsRemaining: status.reduce((sum, api) => sum + api.remaining, 0)
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
