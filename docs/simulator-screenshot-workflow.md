# Simulator Screenshot Workflow

Use stable simulator captures for UI QA.

## Capture command

```bash
npm run sim:screenshot -- --udid <device-udid|booted> --flow <flow> --step <step>
```

Example:

```bash
npm run sim:screenshot -- --udid 8AC76D2F-EBB6-41C3-8760-B7D0901AB898 --flow onboarding --step proof
```

The script writes directly to `screenshots/runtime/` and prints the final absolute path.

## Rules

- Do not save simulator screenshots under `/var/folders/.../T/...`
- Do not use `/tmp` for bug-report screenshots
- Use stable names through the `flow` and `step` arguments
- Treat `screenshots/runtime/` as a local QA workspace; curated reference assets belong in tracked docs/reference folders instead
