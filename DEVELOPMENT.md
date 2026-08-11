# Prescripto Development & Branching Guidelines

This document outlines the mandatory **Git Branching Strategy** and **Version Control Protocol** for developing new features and maintaining backend/frontend components.

---

## 🌿 1. Git Branching Strategy

For every new feature, bug fix, or release preparation, developer workflows MUST follow a strict branching approach:

```
                      +-----------------------------+
                      | feature/v1.1.0-billing-mod  |
                      +-----------------------------+
                                     /
                                    / (Create feature branch)
                                   v
+------------------+     +------------------+     +------------------+
|   main (stable)  |---->|   release/v1.1.0 |---->|   main (v1.1.0)  |
+------------------+     +------------------+     +------------------+
```

### Branch Naming Conventions

| Branch Type | Naming Pattern | Example | Description |
| :--- | :--- | :--- | :--- |
| **Main** | `main` | `main` | Production-ready, stable codebase |
| **Feature** | `feature/<short-desc>` | `feature/inventory-barcodes` | Isolated branch for developing a new feature |
| **Bugfix** | `bugfix/<issue-name>` | `bugfix/age-calc-leapyear` | Fixes a bug or edge-case |
| **Release** | `release/vX.Y.Z` | `release/v1.1.0` | Release preparation & version bump staging |

### Feature Branch Workflow Checklist
1. Always branch off `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/<new-feature-name>
   ```
2. Develop feature and make incremental, descriptive commits.
3. Verify test suite passes (`py -m pytest tests/`).
4. Stage and commit changes:
   ```bash
   git add .
   git commit -m "feat(<scope>): add <feature description>"
   ```
5. Push feature branch to remote origin:
   ```bash
   git push -u origin feature/<new-feature-name>
   ```

---

## 📦 2. Version Control & Synchronization Protocol

Backend and Frontend versions MUST be maintained in sync following **Semantic Versioning (MAJOR.MINOR.PATCH)**.

### Synchronized Version Metadata Locations

#### Backend Version Files
- **`backend/pyproject.toml`**: `version = "1.0.0"`
- **`backend/app/core/config.py`**: `VERSION: str = "1.0.0"`
- **`backend/.env`**: `VERSION="1.0.0"`

#### Frontend Version Files
- **`frontend/package.json`**: `"version": "1.0.0"`
- **`frontend/.env`**: `NEXT_PUBLIC_APP_VERSION="1.0.0"`
- **`frontend/index.html`**: Header version indicator badge.

#### Root Documentation
- **`README.md`**: Update Version History & Release Changelog table.

---

## 📋 Release Changelog History

| Version | Release Date | Component Scope | Summary of Changes |
| :--- | :--- | :--- | :--- |
| **v1.1.0** | 2026-08-10 | Fullstack (`backend` + `frontend`) | Added Multi-Language Prescription Printing (English, मराठी, हिंदी), Print-only CSS template, and UI screenshots to README.md. |
| **v1.0.0** | 2026-08-10 | Fullstack (`backend` + `frontend`) | Initial release with Doctor Dashboard, Pharmacist Inventory, Dynamic Age Calculation, Dispense Queue, REST/GraphQL APIs, and Light/Dark mode. |
