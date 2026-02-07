# 🏆 Architecture & Excellence Blueprint

This document defines the "Golden Rules" and the architectural standards. It is intended for both human developers and AI agents to ensure consistency, scalability, and high code quality.

## 🏗️ Architectural Pillars

### 1. The "Single Source of Truth" API
- **Tooling**: Use **NSwag** or **OpenAPI** to auto-generate TypeScript clients.
- **Models & Structure**: The auto-generated client should include all **Response Models** and **Request Structures**. Never manually define these in the frontend.
- **Rule**: Whenever the backend DTOs change, re-run the client generator.
- **Benefit**: Zero "type mismatch" bugs.

### 2. Standardized Error Handling
- **Backend**: Use a global `ExceptionMiddleware`. No `try-catch` blocks in controllers unless for very specific logic.
- **Responses**: Always return `ProblemDetails` (RFC 7807).
- **Frontend**: Use a central notification system (e.g., `react-hot-toast`) to display these errors.

### 3. Container-First & Infrastructure-as-Code
- **Docker**: Every core dependency (API, Web, DB, **Redis**) must be in `docker-compose.yml`.
- **Environment**: Use `.env` files for secrets. Use `render.yaml` or similar for cloud infrastructure definition.
- **Rules**: Local dev must be "Plug & Play" with a single `docker-compose up`.

### 4. Background Job & Multi-Channel Delivery
- **Offloading**: Never perform slow operations (Email, external API sync) in the request-response cycle. Use **BullMQ** or similar.
- **Reliability**: Jobs should be retriable and traceable.
- **Fallback**: Implement multi-channel defaults (e.g., WebSocket for real-time, Email for fallback).

### 5. Resilient Session Management
- **UX Requirement**: Users should never be kicked out due to expired short-lived tokens.
- **Pattern**: Implement a 401 Interceptor that triggers an automatic `/auth/refresh` and retries the original request seamlessly.

### 6. Universal State & Caching
- **Standard**: Always use `@tanstack/react-query` for data fetching, caching, and state synchronization.
- **Benefit**: Ensures a "snappy" UI with built-in optimistic updates and automated background refetching.
- **Parity**: All frontends (Web, Mobile, etc.) MUST adopt this to ensure consistent behavior.

### 7. Real-time Communication & Presence
- **Technology**: Use **Socket.IO** for bidirectional, real-time communication.
- **Pattern**: Implement room-based communication for scoped updates (e.g., `enter-list`, `leave-list` events).
- **Use Cases**:
  - Collaborative presence (show active users in a list)
  - Live task updates across clients
  - Instant notifications for shared list changes
- **Mobile Integration**: Use a singleton socket instance to manage persistent connections across screens.
- **Fallback**: Always ensure REST APIs are available as fallback for critical operations.

### 8. Observability & Health Monitoring
- **Structured Logging**: Use **Seq** for visual log search and filtering
  - All logs must be structured (JSON format with contextual properties)
  - Query examples: `Level == "Error" && UserId == "123"`, `@Timestamp > DateTime('2026-02-07')`
  - Enables rapid debugging and production issue diagnosis
- **Health Checks**: Implement `/health` endpoint for orchestration and monitoring
  - Check: Database connectivity, Redis availability, Storage accessibility
  - Return: 200 (Healthy) or 503 (Unhealthy) with diagnostic details
  - Used by: Docker, Kubernetes, load balancers for automated recovery
- **Metrics**: Track request counts, error rates, and response times for performance monitoring
- **Transient Fault Handling**: Implement retries and circuit breakers for infrastructure dependencies
  - API must handle slow database/cache startup via connection retries
  - Services must be self-healing with Docker restart policies
  - Ensures high availability in distributed container environments (ADR 007)
- **Persistence Strategy**: All infrastructure data (DB, Cache, Logs) must persist across restarts via Docker volumes.

## 🚀 DevOps Workflow Patterns

### Northern Workflow (Build & Test)
- **Goal**: Code quality, formatting, and logical correctness.
- **Tools**: VS Code, PowerShell (`setup-dev.ps1`), GitHub Actions, **Prettier**, **ESLint**.
- **Rule**: Never merge if `npm run format:check`, `npm run lint`, or `npm test` fails.

### Southern Workflow (Docker & Deploy)
- **Goal**: Environment parity and deployment reliability.
- **Tools**: Docker Compose, Health Checks.
- **Rule**: A feature is only "Done" when it passes health checks in the container mesh.

## 🌿 Git & Collaboration
- **Branch Naming**: 
  - `feat/feature-name` (new work)
  - `fix/bug-name` (hotfixes)
  - `chore/task-name` (maintenance)
- **Commit Messages**: Use **Conventional Commits** (e.g., `feat: add folder renaming`).
- **PR Strategy**: Always squash-merge to keep the `main` branch history clean.

### Git Tagging & Semantic Versioning
- **Versioning Standard**: Follow **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`
  - **MAJOR**: Breaking changes (e.g., API contract changes, removed features)
  - **MINOR**: New features, backward-compatible additions
  - **PATCH**: Bug fixes, performance improvements
- **Tag Format**: `v{version}` (e.g., `v1.2.3`)
- **Release Process**:
  1. Update version in relevant `package.json` or version files
  2. Create annotated tag: `git tag -a v1.2.3 -m "Release v1.2.3: Feature parity achieved"`
  3. Push tags: `git push origin v1.2.3`
- **Pre-release Tags**: Use `-alpha`, `-beta`, `-rc` suffixes (e.g., `v2.0.0-beta.1`)
- **Changelog**: Maintain `CHANGELOG.md` with version history using conventional commit groupings

### Commit Strategy & Best Practices
- **Atomic Commits**: Each commit should represent a single logical change
- **Commit Frequency**: Commit after completing each distinct feature, fix, or refactor
- **When to Commit**:
  - After completing a phase or major milestone
  - After fixing a bug or completing a feature
  - Before switching contexts or starting new work
  - At natural breakpoints (end of day, before meetings)
- **Commit Message Format**: Use Conventional Commits
  ```
  <type>(<scope>): <subject>
  
  <body>
  
  <footer>
  ```
  - **Types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`
  - **Scope**: Optional, e.g., `mobile`, `backend`, `web`, `auth`
  - **Examples**:
    - `feat(mobile): migrate ListsScreen to TanStack Query`
    - `fix(backend): resolve 401 refresh token race condition`
    - `chore(deps): upgrade @tanstack/react-query to v5.90.16`
- **Multi-file Changes**: Group related changes in a single commit with a descriptive scope
- **Breaking Changes**: Use `BREAKING CHANGE:` in footer or `!` after type/scope

### Merge & Integration Strategy
- **Primary Branch**: `main` (or `master`) is the production-ready branch
- **Development Branch**: `develop` for integration of features before release
- **Merge Methods**:
  - **Squash Merge**: Default for feature branches → `develop` (keeps history clean)
  - **Merge Commit**: For `develop` → `main` (preserves release history)
  - **Rebase**: For keeping feature branches up-to-date with `develop` (use with caution)
- **Before Merging**:
  - Ensure all tests pass (CI/CD green)
  - Resolve all merge conflicts locally
  - Update branch with latest `develop`: `git pull origin develop --rebase`
  - Verify TypeScript compilation: `npx tsc --noEmit`
- **Merge Conflicts**:
  - Always test after resolving conflicts
  - Prefer "ours" for formatting conflicts, "theirs" for dependency updates
  - When in doubt, consult the original PR author

### Push & Pull Policies
- **Push Frequency**: Push at least once per day when actively working
- **Before Pushing**:
  - Run local tests and linters
  - Verify no sensitive data (API keys, tokens) in commits
  - Check `.gitignore` is properly configured
- **Force Push**: ⚠️ **NEVER** force push to `main` or `develop`
  - Only use `git push --force-with-lease` on personal feature branches
  - Communicate with team before force-pushing shared branches
- **Pull Strategy**: Use `git pull --rebase` to avoid unnecessary merge commits
- **Stashing**: Use `git stash` before pulling if you have uncommitted changes

### Branch Protection & Code Review
- **Protected Branches**: `main` and `develop` should require:
  - Pull request reviews (minimum 1 approval)
  - Passing CI/CD checks
  - No direct commits allowed
- **Pull Request Guidelines**:
  - **Title**: Use conventional commit format
  - **Description**: Include:
    - What changed and why
    - Testing performed
    - Screenshots for UI changes
    - Breaking changes (if any)
  - **Size**: Keep PRs under 400 lines when possible (easier to review)
  - **Draft PRs**: Use for work-in-progress to get early feedback
- **Code Review Checklist**:
  - ✅ Follows architectural pillars and golden rules
  - ✅ No `any` types or unsafe casts
  - ✅ Proper error handling with ProblemDetails
  - ✅ Tests included for new features
  - ✅ Documentation updated if needed

### Workflow Patterns
- **Feature Development**:
  ```bash
  git checkout develop
  git pull origin develop
  git checkout -b feat/my-feature
  # ... make changes ...
  git add -A
  git commit -m "feat(scope): description"
  git push origin feat/my-feature
  # Create PR: feat/my-feature → develop
  ```
- **Hotfix for Production**:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b fix/critical-bug
  # ... fix bug ...
  git commit -m "fix(scope): description"
  git push origin fix/critical-bug
  # Create PR: fix/critical-bug → main (and cherry-pick to develop)
  ```
- **Syncing Feature Branch**:
  ```bash
  git checkout feat/my-feature
  git fetch origin
  git rebase origin/develop
  # Resolve conflicts if any
  git push --force-with-lease
  ```

### Git Hygiene & Maintenance
- **Clean Up Merged Branches**:
  ```bash
  git branch -d feat/my-feature  # Delete local
  git push origin --delete feat/my-feature  # Delete remote
  ```
- **Prune Stale References**: `git fetch --prune` regularly
- **Avoid Committing**:
  - `node_modules/`, `dist/`, `build/`
  - `.env` files (use `.env.example` instead)
  - IDE-specific files (`.vscode/`, `.idea/`)
  - Large binary files (use Git LFS if needed)
- **Commit History**: Never rewrite public history (no `git rebase -i` on pushed commits)

## 🛡️ Security & Performance

### Security Headers
Implement these HTTP response headers to protect users from common web attacks:

- **CSP (Content-Security-Policy)**: Controls which resources (scripts, styles, images) can load on your page
  - Prevents: XSS (Cross-Site Scripting) attacks where hackers inject malicious JavaScript
  - Example: `default-src 'self'; script-src 'self' 'unsafe-inline';`
  - Impact: Blocks external malicious scripts from executing

- **X-Frame-Options: DENY**: Prevents your site from being embedded in an `<iframe>`
  - Prevents: Clickjacking attacks where hackers overlay invisible iframes to trick users
  - Impact: Stops attackers from embedding your login page on malicious sites

- **X-Content-Type-Options: nosniff**: Stops browsers from "guessing" file types (MIME-sniffing)
  - Prevents: MIME-sniffing attacks where browsers execute disguised files (e.g., `.txt` as JavaScript)
  - Impact: Forces browsers to respect the declared `Content-Type` header

- **Referrer-Policy: no-referrer**: Controls what information is sent in the `Referer` header
  - Prevents: Leaking sensitive URLs (e.g., password reset links with tokens) to third-party sites
  - Impact: Protects user privacy and prevents token exposure

- **Rate Limiting**: Implement IP-based rate limiting (e.g., 100 requests/minute)
  - Prevents: Brute-force attacks, API abuse, DDoS attempts
  - Impact: Ensures service availability and fair resource usage

### Secrets & Configuration
- **Secrets**: Never commit `.env` files. Use `.env.example` as a template.
- **CORS**: Strictly define allowed origins; never use `*` in production.
- **API Keys**: Store in environment variables or secret management services (Azure Key Vault, AWS Secrets Manager)

## 📜 Naming Conventions & Style
- **NestJS / TypeScript**:
  - DTOs end in `Dto` (`CreateTaskDto.ts`).
  - Handlers follow the `Command/Handler` or `Query/Handler` pattern.
  - Services use `camelCase` for methods and avoid `any` at all costs.
- **C# / .NET (Alternative Standard)**:
  - Interfaces start with `I` (e.g., `IStorageService`).
  - Async methods must end in `Async` (e.g., `SaveFileAsync`).
  - Use file-scoped namespaces.
- **TypeScript/React**:
  - Components use PascalCase (`FolderTree.tsx`).
  - Filenames should match the exported component.
  - Constants use UPPER_SNAKE_CASE.

## 🚫 Anti-Patterns (What NOT to do)
- **Lazy API Calls**: Don't use raw `axios` or `fetch` in components; use the generated client.
- **Fat Controllers**: Controllers should not contain business logic. Logic lives in `Handlers`.
- **ViewBag/ViewData**: In ASP.NET, never use dynamic objects like `ViewBag`. Use strongly-typed ViewModels or MediatR results for compile-time safety.
- **Inline Styles**: Avoid `style={{...}}` in React. Use CSS files or Tailwind.

## 📖 Architecture Decision Records (ADR)
- **ADR 001: Database**: Chose Postgres over SQLite to ensure production/development parity and support complex indexing.
- **ADR 002: Error Handling**: Chose Global Middleware + ProblemDetails to provide a consistent mobile/web-friendly error format.
- **ADR 003: Background Jobs**: Chose BullMQ for task offloading to ensure API responsiveness and job reliability.
- **ADR 004: Observability**: Chose Seq for structured logging over ELK Stack for simplicity and superior developer experience.
- **ADR 005: Caching**: Chose Redis for distributed caching to support horizontal scaling and session management.
- **ADR 006: API Versioning**: Chose URI-based versioning (`/api/v1/`) over header-based for simplicity and API discoverability.
- **ADR 007: Resilience**: Chose connection retries + orchestration health checks to solve container startup race conditions and improve robustness.

## ✅ Gold Standard Verification
The project achieves "Gold Standard" via:
1. **Zero-Error Frontend**: No unused vars, no `any` types, Vite build success.
2. **Standardized Formatting**: `npm run format` (Prettier) and `npm run lint:fix` (ESLint) passed project-wide with zero rule violations.
3. **Stable Infrastructure**: Health checks for all services.
4. **Resilient API**: Transient fault handling for DB/Cache.
5. **Comprehensive Docs**: ARCHITECTURE.md and HORIZON_GUARDIAN.md blueprints.

## 🤖 Future Agent Instructions
1. **Read the Blueprint**: Always check this file before implementing new features.
2. **Modularize First**: If a file exceeds 200 lines, search for extraction points before adding more code.
3. **Audit the "Chain"**: When adding a field to the DB, update the Entity -> DTO -> Handler/Query -> API -> Generated Client.
4. **Horizon Guardian**: This architecture serves as the foundation for the **Horizon Guardian** product—a tool that enforces these standards automatically via AI-powered code audits and mentorship.

---
*Created during the Architectural Overhaul of February 2026.*
*This document powers the Horizon Guardian enforcement engine.*
