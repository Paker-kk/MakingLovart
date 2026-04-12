$ErrorActionPreference = 'Stop'

function Get-ShortDramaKeywords {
    return @(
        'short drama',
        'storyboard',
        'shot list',
        'dailies',
        'reshoot',
        'scene list',
        'outline',
        ([string][char]0x77ED + [char]0x5267),
        ([string][char]0x5206 + [char]0x955C),
        ([string][char]0x5267 + [char]0x672C),
        ([string][char]0x6837 + [char]0x7247),
        ([string][char]0x955C + [char]0x5934),
        ([string][char]0x89D2 + [char]0x8272 + [char]0x8BBE + [char]0x5B9A),
        ([string][char]0x89D2 + [char]0x8272 + [char]0x5C0F + [char]0x4F20),
        ([string][char]0x8865 + [char]0x62CD),
        ([string][char]0x5BA1 + [char]0x7247)
    )
}

try {
    $inputJson = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($inputJson)) {
        exit 0
    }

    $payload = $inputJson | ConvertFrom-Json
    $prompt = [string]$payload.prompt
    if ([string]::IsNullOrWhiteSpace($prompt)) {
        exit 0
    }

    $matched = $false
    foreach ($keyword in Get-ShortDramaKeywords) {
        if ($prompt.IndexOf($keyword, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            $matched = $true
            break
        }
    }

    if (-not $matched) {
        exit 0
    }

    $context = @(
        'Interpret this repository task through the AI short-drama production lens first.',
        'Read docs/CLAUDE_CODE_TRANSFORMATION_PRD.md and docs/CLAUDE_CODE_IMPLEMENTATION_PLAN.md before deciding whether this is storyboard planning, production execution design, dailies review, or Claude scaffold work.',
        'Unless the user explicitly requests full automation, preserve four takeover points: character confirmation, storyboard confirmation, batch execution, and dailies review.',
        'If the service entrypoints are not implemented yet, do not pretend the production pipeline already runs. Return a structured task packet, interface contract, or the next code batch instead.'
    ) -join "`n"

    $result = @{
        hookSpecificOutput = @{
            hookEventName = 'UserPromptSubmit'
            additionalContext = $context
        }
    }

    $result | ConvertTo-Json -Compress -Depth 6
}
catch {
    exit 0
}