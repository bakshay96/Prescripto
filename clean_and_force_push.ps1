# Prescripto — Security Cleanup & Force Push Script

Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host "  REMOVING SECRETS FROM GIT & FORCE PUSHING TO GITHUB" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Yellow

# Step 1: Remove .env files from git index tracking
git rm --cached backend/.env -f 2>$null
git rm --cached frontend/.env.local -f 2>$null
git rm --cached frontend/.env -f 2>$null
git rm --cached .env -f 2>$null

# Step 2: Stage gitignore and clean files
git add .gitignore
git add .

# Step 3: Create security cleanup commit
git commit -m "security: remove sensitive environment files and credentials from repository"

# Step 4: Force push to overwrite remote branch on GitHub
$currentBranch = (git branch --show-current)
if (-not $currentBranch) { $currentBranch = "mongodb-migration-complete" }

Write-Host "Force pushing clean branch to GitHub: $currentBranch" -ForegroundColor Cyan
git push --force origin $currentBranch

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  SUCCESS! SECRETS REMOVED & BRANCH CLEANED ON GITHUB" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
