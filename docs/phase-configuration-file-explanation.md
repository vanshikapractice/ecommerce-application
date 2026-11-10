# Configuration file explanation

| File Path                                      | Responsibility                                                           | Important Functions                    | Dependencies                           | Connected Files                                      | Explanation                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------- | -------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/config/env.ts`                   | Loads and validates backend configuration before API modules initialize. | `dotenv.config`, `envSchema.safeParse` | `dotenv`, `zod`, Node `path` and `url` | `server.ts`, `app.ts`, auth utilities, Prisma client | Resolves `apps/api/.env` from the source file location, preserves inherited process variables, validates required JWT secrets, and emits variable names without secret contents. |
| `apps/api/.env.example`                        | Documents the backend environment contract without real credentials.     | N/A                                    | dotenv convention                      | `env.ts`, project setup docs                         | Provides blank JWT secret fields and points developers to secure random generation.                                                                                              |
| `docs/environment-configuration.md`            | Explains environment setup and startup verification.                     | N/A                                    | Markdown                               | `.env.example`, `project-setup.md`                   | Documents file location, secure secret generation, independent API startup, root startup, and health verification.                                                               |
| `docs/project-setup.md`                        | Provides complete local setup instructions.                              | N/A                                    | Markdown                               | API package scripts, environment docs                | Adds explicit JWT requirements and commands for starting and checking the backend.                                                                                               |
| `docs/phase-configuration-file-explanation.md` | Records the responsibility and flow of configuration files.              | N/A                                    | Markdown                               | `env.ts`, environment docs                           | Describes the configuration change and its security boundary.                                                                                                                    |

## Startup flow

1. `server.ts` imports `app.ts`, which imports modules that depend on `env`.
2. `env.ts` resolves `apps/api/.env` relative to its own file path.
3. Existing process variables remain authoritative because dotenv does not
   override them.
4. Zod validates all configuration, including both JWT secrets.
5. Only after validation succeeds does Express start listening.
