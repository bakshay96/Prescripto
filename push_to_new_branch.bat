@echo off
echo =====================================================
echo   PRESCRIPTO - GIT PUSH TO NEW BRANCH
echo =====================================================
cd /d "%~dp0"
git checkout -b mongodb-migration-complete
git add .
git commit -m "feat: complete SQLite to pure MongoDB migration, API fixes, and Master Admin dashboard"
git push -u origin mongodb-migration-complete
echo =====================================================
echo   SUCCESSFULLY PUSHED TO BRANCH mongodb-migration-complete
echo =====================================================
pause
