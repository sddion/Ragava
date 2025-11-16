# Git Operations & Pipeline Management

This document explains the enhanced Git operations and automated pipeline management features.

## 🚀 Enhanced Git Hooks

### Pre-Commit Hook

- **Location**: `.husky/pre-commit`
- **Features**:
  - Colorized output with emojis
  - Clear success/failure messages
  - Runs `lint-staged` automatically

### Pre-Push Hook

- **Location**: `.husky/pre-push`
- **Features**:
  - Animated loading spinners for each check
  - Colorized output (red/green/yellow/blue)
  - Runs tests, linting, and type checking
  - Clear error messages with exit codes

## 🔄 Automated Pipeline Management

### GitLab CI/CD Pipeline

- **Location**: `.gitlab-ci.yml`
- **Changes**:
  - YouTube conversion pipeline now runs automatically on `main` branch
  - Manual trigger still available via GitLab web interface
  - Better logging and status messages

### Pipeline Trigger API

- **Endpoint**: `/api/trigger-pipeline`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "branch": "main",
    "reason": "YouTube conversion for: Song Title"
  }
  ```

### Pipeline Status API

- **Endpoint**: `/api/pipeline-status`
- **Method**: `GET`
- **Query Parameters**:
  - `id`: Specific pipeline ID
  - `branch`: Branch name (default: main)

## 🎵 YouTube Conversion Automation

### Automatic Pipeline Triggering

When YouTube conversion is requested but GitLab CI/CD is not enabled:

1. API automatically triggers the GitLab pipeline
2. Waits for pipeline to start
3. Checks pipeline status
4. Falls back to other conversion methods if needed

### Manual Pipeline Trigger

```bash
# Using the script
./scripts/trigger-gitlab-pipeline.sh

# With custom branch
./scripts/trigger-gitlab-pipeline.sh -b develop

# With custom token
./scripts/trigger-gitlab-pipeline.sh -t YOUR_GITLAB_TOKEN
```

## 🔧 Environment Variables

Required for pipeline automation:

```bash
GITLAB_TOKEN=your_gitlab_access_token
YOUTUBE_CONVERSION_ENABLED=true
```

## 📱 Loading States

### LoadingSpinner Component

- **Location**: `components/LoadingSpinner.tsx`
- **Variants**: `small`, `default`, `large`
- **Features**: Customizable size, text, and styling

### GitOperationStatus Component

- **Location**: `components/GitOperationStatus.tsx`
- **Features**:
  - Shows real-time Git operation status
  - Auto-dismisses after success/error
  - Supports commit, push, and check operations

## 🎯 Usage Examples

### Trigger Pipeline via API

```bash
curl -X POST https://ragava.vercel.app/api/trigger-pipeline \
  -H "Content-Type: application/json" \
  -d '{"branch": "main", "reason": "Manual trigger"}'
```

### Check Pipeline Status

```bash
curl https://ragava.vercel.app/api/pipeline-status?branch=main
```

### Check Specific Pipeline

```bash
curl https://ragava.vercel.app/api/pipeline-status?id=12345
```

## 🔍 Troubleshooting

### Pipeline Not Triggering

1. Check `GITLAB_TOKEN` environment variable
2. Verify GitLab project permissions
3. Check GitLab CI/CD settings

### Git Hooks Not Working

1. Ensure husky is installed: `npm run prepare`
2. Check file permissions: `chmod +x .husky/*`
3. Verify Git hooks are enabled

### Loading States Not Showing

1. Import components correctly
2. Check component props
3. Verify CSS classes are applied

## 📊 Benefits

✅ **Better UX**: Loading spinners and colorized output  
✅ **Automation**: Pipeline triggers automatically  
✅ **Monitoring**: Real-time pipeline status  
✅ **Fallbacks**: Multiple conversion methods  
✅ **Debugging**: Clear error messages and logs
