# Prescripto — Git Push Script for New Branch (Safe Secrets Version)

$branchName = "mongodb-migration-complete"

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  PRESCRIPTO - SAFE GIT PUSH TO BRANCH ($branchName)" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# Ensure .env files are untracked in git
git rm --cached backend/.env -f 2>$null
git rm --cached frontend/.env.local -f 2>$null
git rm --cached .env -f 2>$null

# Check out new branch
git checkout -b $branchName 2>$null || git checkout $branchName

# Stage all files (matching .gitignore rules)
git add .

# Commit changes
git commit -m "feat: complete SQLite to pure MongoDB migration, API fixes, and Master Admin dashboard"

# Push to origin
git push -u origin $branchName

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  SUCCESSFULLY PUSHED TO BRANCH: $branchName" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
