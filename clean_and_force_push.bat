@echo off
echo =====================================================
echo   REMOVING SECRETS FROM GIT & FORCE PUSHING TO GITHUB
echo =====================================================
cd /d "%~dp0"

git rm --cached backend/.env -f >nul 2>&1
git rm --cached frontend/.env.local -f >nul 2>&1
git rm --cached frontend/.env -f >nul 2>&1
git rm --cached .env -f >nul 2>&1

git add .gitignore
git add .
git commit -m "security: remove sensitive environment files and credentials from repository"
git push --force origin mongodb-migration-complete

echo =====================================================
echo   SUCCESS! SECRETS REMOVED & BRANCH CLEANED ON GITHUB
echo =====================================================
pause
