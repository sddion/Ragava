import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get('id');
    const branch = searchParams.get('branch') || 'main';

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

    const gitlabUrl = 'https://gitlab.com';
    const projectId = 'sju17051%2Fwavemusic'; // URL encoded

    let url: string;
    if (pipelineId) {
      // Get specific pipeline status
      url = `${gitlabUrl}/api/v4/projects/${projectId}/pipelines/${pipelineId}`;
    } else {
      // Get latest pipeline for branch
      url = `${gitlabUrl}/api/v4/projects/${projectId}/pipelines?ref=${branch}&per_page=1`;
    }

    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': gitlabToken,
      },
    });

    const responseData = await response.json();

    if (response.ok) {
      if (pipelineId) {
        // Single pipeline response
        return NextResponse.json({
          success: true,
          pipeline: {
            id: responseData.id,
            status: responseData.status,
            ref: responseData.ref,
            web_url: responseData.web_url,
            created_at: responseData.created_at,
            updated_at: responseData.updated_at,
            finished_at: responseData.finished_at,
            duration: responseData.duration,
            coverage: responseData.coverage,
          },
        });
      } else {
        // Array of pipelines response
        const latestPipeline = responseData[0];
        if (latestPipeline) {
          return NextResponse.json({
            success: true,
            pipeline: {
              id: latestPipeline.id,
              status: latestPipeline.status,
              ref: latestPipeline.ref,
              web_url: latestPipeline.web_url,
              created_at: latestPipeline.created_at,
              updated_at: latestPipeline.updated_at,
              finished_at: latestPipeline.finished_at,
              duration: latestPipeline.duration,
              coverage: latestPipeline.coverage,
            },
          });
        } else {
          return NextResponse.json({
            success: true,
            pipeline: null,
            message: 'No pipelines found for this branch',
          });
        }
      }
    } else {
      console.error('❌ Failed to get pipeline status:', responseData);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get pipeline status',
          details: responseData,
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('❌ Pipeline status error:', error);

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
