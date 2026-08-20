@echo off
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
cd /d d:\MASAI\Prescripto\backend
"C:\Users\FreshMenu\AppData\Local\Programs\Python\Python311\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8080
