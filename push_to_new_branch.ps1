# Prescripto — Git Push Script for New Branch

$branchName = "mongodb-migration-complete"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  PRESCRIPTO - GIT PUSH TO NEW BRANCH ($branchName)" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# Check out new branch
git checkout -b $branchName

# Stage all changed files
git add .

# Commit changes
git commit -m "feat: complete SQLite to pure MongoDB migration, API fixes, and Master Admin dashboard"

# Push to origin
git push -u origin $branchName

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  SUCCESSFULLY PUSHED TO BRANCH: $branchName" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
