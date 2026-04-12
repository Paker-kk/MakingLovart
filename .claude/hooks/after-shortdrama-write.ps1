$ErrorActionPreference = 'Stop'

function Get-RelativePath {
    param(
        [string]$Root,
        [string]$Path
    )

    try {
        $rootUri = New-Object System.Uri(($Root.TrimEnd('\\') + '\\'))
        $pathUri = New-Object System.Uri($Path)
        return [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString()) -replace '/', '\\'
    }
    catch {
        return $Path
    }
}

try {
    $inputJson = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($inputJson)) {
        exit 0
    }

    $payload = $inputJson | ConvertFrom-Json
    $toolInput = $payload.tool_input
    $filePath = [string]$toolInput.file_path
    if ([string]::IsNullOrWhiteSpace($filePath)) {
        exit 0
    }

    $projectDir = [string]$env:CLAUDE_PROJECT_DIR
    $relativePath = Get-RelativePath -Root $projectDir -Path $filePath
    $isRelevant = $relativePath -match '^(\.claude\\|services\\shortDrama|docs\\CLAUDE_CODE_)'
    if (-not $isRelevant) {
        exit 0
    }

    $context = "You just edited a Claude short-drama orchestration file: $relativePath. Next, verify three things: naming consistency across settings, skills, agents, and hooks; description quality for reliable triggering; and whether any new execution semantics also require a shortDrama service contract update or plan update."

    $result = @{
        hookSpecificOutput = @{
            hookEventName = 'PostToolUse'
            additionalContext = $context
        }
    }

    $result | ConvertTo-Json -Compress -Depth 6
}
catch {
    exit 0
}