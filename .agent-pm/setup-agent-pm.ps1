# AGENT-PM SETUP SCRIPT (Windows PowerShell)
# This script configures .agent-pm directory for a new project/user

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,
    
    [Parameter(Mandatory=$true)]
    [string]$ProjectRoot,
    
    [Parameter(Mandatory=$true)]
    [string]$UserName,
    
    [string]$UserEmail = "",
    [string]$UserRole = "Developer",
    [string]$AgyPathLaptop = "D:\Tools_Project\agy\bin\agy.exe",
    [string]$AgyPathPC = "E:\Folder_Project\Antigravity\bin\agy.exe",
    [int]$AgyTimeout = 120,
    [string]$AgyModelPrimary = "claude-sonnet-4-6",
    [string]$AgyModelBackup = "gemini-flash-3.6-medium",
    [string]$NodeVersion = "18.18",
    [string]$NpmVersion = "9.0.0",
    [string]$DefaultBuilder = "OpenCode",
    [string]$CommitTool = "OpenCode",
    [string]$TelegramBotToken = "",
    [string]$TelegramUserId = "",
    [string]$TelegramServiceName = "Telegram_Gateway",
    [string]$TelegramScriptPath = "gateway-service/Telegram_Gateway.cmd",
    [int]$TelegramPid = 0,
    [string]$TelegramProfileName = "telegram-gateway",
    [string]$TelegramHomeChannel = "",
    [int]$IdleThreshold = 10,
    [int]$SnapshotInterval = 10
)

# Write-Host "🚀 Starting AGENT-PM Setup..." -ForegroundColor Green
Write-Host "🚀 Starting AGENT-PM Setup..." -ForegroundColor Green

# Check if config file exists
if (-not (Test-Path "config.json")) {
    Write-Host "❌ config.json not found!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Project: $ProjectName" -ForegroundColor White
Write-Host "  Root: $ProjectRoot" -ForegroundColor White
Write-Host "  User: $UserName" -ForegroundColor White
Write-Host "  Telegram Bot: $TelegramBotToken" -ForegroundColor White
Write-Host "  Telegram User ID: $TelegramUserId" -ForegroundColor White

# Create backup
Write-Host "🔄 Creating backup..." -ForegroundColor Yellow
if (-not (Test-Path "backup")) {
    New-Item -ItemType Directory -Path "backup" | Out-Null
}
Copy-Item -Path ".\*" -Destination "backup\" -Recurse -Force -Exclude "backup", "*.ps1" | Out-Null

# Replace placeholders in all markdown files
Write-Host "🔄 Replacing placeholders..." -ForegroundColor Yellow
Get-ChildItem -Path ".\" -Filter "*.md" -Recurse | ForEach-Object {
    $file = $_.FullName
    if ($file -notlike "*\backup\*" -and $file -ne ".\config.json" -and $file -ne ".\config.template.json") {
        Write-Host "  Processing: $($_.Name)" -ForegroundColor Gray
        
        # Replace all placeholders
        $content = Get-Content $file -Raw
        
        $content = $content -replace "\[PROJECT_NAME\]", $ProjectName
        $content = $content -replace "\[PROJECT_DESCRIPTION\]", $ProjectDescription
        $content = $content -replace "\[PROJECT_ROOT\]", $ProjectRoot
        $content = $content -replace "\[USER_NAME\]", $UserName
        $content = $content -replace "\[USER_EMAIL\]", $UserEmail
        $content = $content -replace "\[USER_ROLE\]", $UserRole
        $content = $content -replace "\[AGY_PATH_LAPTOP\]", $AgyPathLaptop
        $content = $content -replace "\[AGY_PATH_PC\]", $AgyPathPC
        $content = $content -replace "\[AGY_TIMEOUT\]", $AgyTimeout
        $content = $content -replace "\[AGY_MODEL_PRIMARY\]", $AgyModelPrimary
        $content = $content -replace "\[AGY_MODEL_BACKUP\]", $AgyModelBackup
        $content = $content -replace "\[NODE_VERSION\]", $NodeVersion
        $content = $content -replace "\[NPM_VERSION\]", $NpmVersion
        $content = $content -replace "\[DEFAULT_BUILDER\]", $DefaultBuilder
        $content = $content -replace "\[COMMIT_TOOL\]", $CommitTool
        $content = $content -replace "\[TELEGRAM_BOT_TOKEN\]", $TelegramBotToken
        $content = $content -replace "\[TELEGRAM_USER_ID\]", $TelegramUserId
        $content = $content -replace "\[TELEGRAM_SERVICE_NAME\]", $TelegramServiceName
        $content = $content -replace "\[TELEGRAM_SCRIPT_PATH\]", $TelegramScriptPath
        $content = $content -replace "\[TELEGRAM_PID\]", $TelegramPid
        $content = $content -replace "\[TELEGRAM_PROFILE_NAME\]", $TelegramProfileName
        $content = $content -replace "\[TELEGRAM_HOME_CHANNEL\]", $TelegramHomeChannel
        $content = $content -replace "\[IDLE_THRESHOLD\]", $IdleThreshold
        $content = $content -replace "\[SNAPSHOT_INTERVAL\]", $SnapshotInterval
        
        $content | Set-Content $file -Raw
    }
}

# Clean up config files
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Remove-Item "config.json" -Force
Remove-Item "config.template.json" -Force

Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the configured files in .agent-pm/" -ForegroundColor White
Write-Host "2. Test with a simple task" -ForegroundColor White
Write-Host "3. Customize any additional settings as needed" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your AGENT-PM is now ready for use!" -ForegroundColor Green

# Verify no placeholders remain
Write-Host ""
Write-Host "🔍 Verifying configuration..." -ForegroundColor Yellow
$remainingPlaceholders = Select-String -Path ".\*.md" -Pattern "\[.*\]" -AllMatches | Select-Object -ExpandProperty Matches | Select-Object -ExpandProperty Value | Sort-Object -Unique

if ($remainingPlaceholders) {
    Write-Host "⚠️  Remaining placeholders found:" -ForegroundColor Yellow
    $remainingPlaceholders | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
} else {
    Write-Host "✅ No placeholders found!" -ForegroundColor Green
}