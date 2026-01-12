# PowerShell script to clean up git branches
# Run this from the project root

Write-Host "Cleaning up git branches..." -ForegroundColor Cyan

# Get current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Yellow

# Delete local master branch (redundant with main)
Write-Host "`nDeleting local 'master' branch (redundant with 'main')..." -ForegroundColor Yellow
git branch -D master 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deleted local 'master' branch" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not delete 'master' branch (may not exist or has unmerged changes)" -ForegroundColor Yellow
}

# Delete remote initialFrontend branch (likely old/unused)
Write-Host "`nDeleting remote 'initialFrontend' branch..." -ForegroundColor Yellow
git push origin --delete initialFrontend 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deleted remote 'initialFrontend' branch" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not delete remote 'initialFrontend' branch" -ForegroundColor Yellow
}

Write-Host "`n✅ Branch cleanup complete!" -ForegroundColor Green
Write-Host "`nRemaining branches:" -ForegroundColor Cyan
git branch -a

Write-Host "`nNote: Keeping 'frontEnd' and 'backend' branches as they appear to be active development branches." -ForegroundColor Gray
