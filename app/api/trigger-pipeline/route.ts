import { NextRequest, NextResponse } from 'next/server';

interface PipelineTriggerRequest {
  branch?: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: PipelineTriggerRequest = await request.json();
    const { branch = 'main', reason = 'API trigger' } = body;

    // Check if we have the required environment variables
    const gitlabToken = process.env.GITLAB_TOKEN;
    if (!gitlabToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'GitLab token not configured',
          message: 'Please set GITLAB_TOKEN environment variable',
        },
        { status: 500 }
      );
    }

    console.log('🚀 Triggering GitLab pipeline...', { branch, reason });

    // Trigger GitLab CI/CD pipeline
    const gitlabUrl = 'https://gitlab.com';
    const projectId = 'sju17051%2Fwavemusic'; // URL encoded
    const pipelineUrl = `${gitlabUrl}/api/v4/projects/${projectId}/pipeline`;

    const response = await fetch(pipelineUrl, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': gitlabToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: branch,
        variables: [
          {
            key: 'YOUTUBE_CONVERSION_ENABLED',
            value: 'true',
          },
          {
            key: 'TRIGGER_REASON',
            value: reason,
          },
        ],
      }),
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log('✅ Pipeline triggered successfully:', responseData);

      return NextResponse.json({
        success: true,
        message: 'Pipeline triggered successfully',
        pipeline: {
          id: responseData.id,
          status: responseData.status,
          web_url: responseData.web_url,
          created_at: responseData.created_at,
        },
      });
    } else {
      console.error('❌ Failed to trigger pipeline:', responseData);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to trigger pipeline',
          details: responseData,
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('❌ Pipeline trigger error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Pipeline trigger endpoint',
    usage: 'POST with optional { branch: "main", reason: "API trigger" }',
    endpoints: {
      trigger: 'POST /api/trigger-pipeline',
      status: 'GET /api/pipeline-status',
    },
  });
}
