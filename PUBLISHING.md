# Publishing Mixon to Deno JSR

This guide explains how to publish Mixon to the Deno JavaScript Registry (JSR).

## Prerequisites

- Deno v1.40 or higher
- A GitHub account (JSR uses GitHub for authentication)
- Owner or collaborator access to the Mixon repository

## Steps to Publish

1. **Ensure you have the latest version of Deno**

   ```bash
   deno upgrade
   ```

2. **Log in to JSR**

   ```bash
   deno login
   ```

   This will open a browser window for GitHub authentication.

3. **Run a dry-run to check for issues**

   ```bash
   deno publish --dry-run
   ```

   This will validate your package without actually publishing it.

4. **Publish the package**

   ```bash
   deno task publish
   ```

   Or directly:

   ```bash
   deno publish
   ```

5. **Verify the publication**

   After publishing, your package will be available at:
   https://jsr.io/@srdjan/mixon

## Updating the Package

To publish a new version:

1. Update the version number in `deno.json`
2. Make your changes
3. Run the publish command again

## Package Configuration

The package configuration is in `deno.json`:

```json
{
  "name": "@srdjan/mixon",
  "version": "1.0.0",
  "exports": "./mod.ts",
  "description": "Type-Safe API & Workflow Microframework for Deno",
  "readme": "./JSR.md"
}
```

## Troubleshooting

If you encounter issues during publishing:

1. Check that all dependencies are correctly specified
2. Ensure you have the necessary permissions for the @srdjan scope
3. Verify that your package passes validation with `deno publish --dry-run`

For more help, see the [JSR documentation](https://jsr.io/docs/publishing-packages).
