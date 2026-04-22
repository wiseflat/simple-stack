# Test Suite Architecture

## 5-Phase Testing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   UI Tests (Playwright API)                 │
└─────────────────────────────────────────────────────────────┘

Phase 1: UI Foundation
┌──────────────────────────────────────────┐
│ Suite 01: Authentication (1 file)        │
│ - Login with test credentials            │
│ - Session token management               │
│ - Protected endpoint access              │
└──────────────────────────────────────────┘
         ↓ stores session token to .auth/user.json

Phase 2: Infrastructure & Variables
┌──────────────────────────────────────────┐
│ Suite 02: Infrastructure (3 files)       │
│ ✓ 02a: CRUD operations                   │
│   - POST /api/infrastructures (create)   │
│   - GET /api/infrastructures/:id (read)  │
│   - GET /api/infrastructures (list)      │
│   - PUT /api/infrastructures/:id (edit)  │
│ ✓ 02b: Infrastructure Variables           │
│   - POST /api/variables (create)         │
│   - GET /api/variables (read/list)       │
│   - PUT /api/variables/:id (update)      │
│ ✓ 02c: Secrets Management                │
│   - POST /api/variables/secret (create)  │
│   - POST /api/variables/secret (update)  │
└──────────────────────────────────────────┘
         ↓ stores infraId to .state.json

Phase 3: IaaS Configuration
┌──────────────────────────────────────────┐
│ Suite 03: Terraform & IaaS (1 file)      │
│ (Optional: requires TF_PROJECT_PATH)     │
│ - terraform init/plan/apply              │
│ - use canonical tfstate YAML test payload│
│ - convert YAML payload to JSON            │
│ - Store tfstate as encrypted variable    │
│ - Verify infrastructure in UI API        │
└──────────────────────────────────────────┘
         ↓ stores tfstate variable to use in Phase 4

Phase 4: PaaS Configuration
┌──────────────────────────────────────────┐
│ Suite 04: Runner & Playbooks (1 file)    │
│ (Optional: requires RUNNER_ENDPOINT)     │
│ - Configure runner variables             │
│ - POST /api/infrastructures/:id/execute  │
│ - Handle runner payload delivery         │
└──────────────────────────────────────────┘
         ↓ infrastructure now has runner configured

Phase 5A: Software Catalog
┌──────────────────────────────────────────┐
│ Suite 05: Catalog Management (1 file)    │
│ - POST /api/catalogs (create)            │
│ - Configure catalog variables (4.2)      │
│ - Catalog secrets (2.5)                  │
│ - POST /api/catalogs/:id/execute (build) │
└──────────────────────────────────────────┘
         ↓ stores catalogId

Phase 5B: Software Deployment
┌──────────────────────────────────────────┐
│ Suite 06: Software Deployment (1 file)   │
│ - POST /api/softwares (create instance)  │
│ - instance is bound to infrastructureId  │
│ - Configure software variables (5.1)     │
│ - Store software secrets                 │
│ - Deploy apps sequentially               │
│ (Optional: --app=<name> filtering)       │
└──────────────────────────────────────────┘
         ↓

Phase 6: Final Cleanup
┌──────────────────────────────────────────┐
│ Suite 99: Cleanup (3 files)              │
│ - 1) software cleanup                    │
│ - 2) catalog cleanup                     │
│ - 3) infrastructure cleanup              │
│ - Verify vars/secrets were auto-cleaned  │
└──────────────────────────────────────────┘
```

## Dependency Graph

```
01-auth
  ↓
02-infrastructure (CRUD, vars, secrets)
  ↓
03-iaas ← requires terraform project
  ↓
04-paas ← requires runner endpoint
  ↓
05-catalog
  ↓
06-softwares
```

## File Organization

```
tests/
├── playwright.config.ts          # Playwright configuration (workers: 1, auth setup)
├── global-setup.ts               # Pre-test authentication (runs once)
│
├── fixtures/                     # Test data (centralized configuration)
│   ├── auth.ts                   # Credentials
│   ├── infrastructure.ts         # Infra template
│   ├── terraform-vars.ts         # TF config + tfstate YAML payload
│   ├── runner-variables.ts       # Ansible config
│   ├── catalog-variables.ts      # Registry config
│   ├── catalog-secrets.ts        # Registry credentials
│   └── software-variables.ts     # App deployment config
│
├── helpers/                      # Reusable utilities
│   ├── api-client.ts             # HTTP client with auto-auth
│   ├── state.ts                  # Shared state across suites
│   └── terraform.ts              # CLI wrapper
│
├── suites/                       # Test suites organized by phase
│   ├── 01-auth/
│   │   └── login.spec.ts         # 1 test file
│   ├── 02-infrastructure/
│   │   ├── crud.spec.ts          # 4 tests
│   │   ├── variables.spec.ts     # 4 tests
│   │   └── secrets.spec.ts       # 4 tests
│   ├── 03-iaas/
│   │   └── tfvars.spec.ts        # 3 tests (optional)
│   ├── 04-paas/
│   │   └── runner-variables.spec.ts # 3 tests (optional)
│   ├── 05-catalog/
│   │   └── import.spec.ts        # 5 tests (optional)
│   └── 06-softwares/
│       └── deploy.spec.ts         # 6 tests
│   └── 99-cleanup/
│       ├── 01-software.spec.ts      # 1 test
│       ├── 02-catalog.spec.ts       # 1 test
│       └── 03-infrastructure.spec.ts # 1 test
│
├── .auth/                        # Auto-generated (add to .gitignore)
│   └── user.json                 # Session token from global-setup
│
├── .gitignore                    # Ignore artifacts
├── README.md                     # Documentation
└── .state.json                   # Auto-generated (add to .gitignore)
```

## State Flow

```
global-setup.ts
  ↓ authenticates
  ↓ saves token
  ↓
tests/.auth/user.json (contains: sessionToken, cookies)
  ↓
Suite 01
  ↓ verifies auth
Suite 02
  ↓ creates infrastructure
  ↓ saves infraId
  ↓
tests/.state.json { infrastructureId, infrastructureName }
  ↓
Suite 03
  ↓ uses infraId
  ↓ saves tfstateVariableId
  ↓
tests/.state.json { ..., tfstateVariableId }
  ↓
Suite 04
  ↓ uses infraId, configures runner
Suite 05
  ↓ creates catalog
  ↓ saves catalogId
  ↓
tests/.state.json { ..., catalogId }
  ↓
Suite 06
  ↓ uses infraId + catalogId
  ↓ creates software instances
```

## Environment Variables

```
Required:
├── BASE_URL                # http://localhost:3000
├── TEST_EMAIL              # test@example.com
└── TEST_PASSWORD           # Test@1234

Optional (0 = skip):
├── RUNNER_ENDPOINT         # http://runner:8080 (Suites 04, 05)
├── REGISTRY_HOST           # registry.local (Suite 05)
├── REGISTRY_USERNAME       # testuser
├── REGISTRY_PASSWORD       # testpass
└── REGISTRY_TOKEN          # token-xyz
```

## Test Execution

1. **Global Setup** (~30s)
   - Launch browser
   - POST /api/auth/signin with test credentials
   - Save session token + cookies
   - Close browser

2. **Suite 01** (~15s)
   - Verify session works
   - Test invalid credentials
   - Access protected endpoint

3. **Suite 02** (~45s)
   - Create infrastructure
  - Read/list/update infrastructure
   - Update infrastructure
  - Create/read/update variables
  - Create/update secrets
  - Keep infrastructure for downstream software tests

4. **Suite 03** (~60s, optional)
  - API-only IaaS validation flow
  - Build tfstate from canonical YAML payload
  - Convert payload to JSON before API submission
   - Upload tfstate to variables

5. **Suite 04** (~30s, optional)
   - Configure runner (requires RUNNER_ENDPOINT)
   - Trigger playbook execution

6. **Suite 05** (~45s, optional)
   - Create catalog
   - Configure variables + secrets
   - Trigger build

7. **Suite 06** (~45s)
  - Create software bound to infrastructureId
   - Create software instance
   - Configure variables + secrets
   - Deploy app

8. **Suite 99** (~20s)
  - Ordered cleanup: 1) software, 2) catalog, 3) infrastructure
  - Verify infrastructure variables and secrets are deleted by backend

**Total Expected Time**: ~4-6 minutes (full run with all optional suites)

## Notes

- Tests run **sequentially** (workers: 1) — ordering matters
- Each suite depends on state set by previous suites
- Skipped tests (missing env vars) don't break the pipeline
- All created objects are real (cleanup is handled by dedicated final suite)
- State persists in `.state.json` between runs
- Auth token persists in `.auth/user.json` between runs

For cleanup:
```bash
rm -rf tests/.auth/ tests/.state.json playwright-report/ test-results/
```
