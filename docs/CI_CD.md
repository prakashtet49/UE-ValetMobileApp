# Staging CI/CD (GitHub Actions + Firebase App Distribution)

## Overview

When you **push one of these tags**, GitHub Actions will:

1. **Bump version** according to the tag:
   - **`staging-major`** – major bump (e.g. 1.0.0 → 2.0.0)
   - **`staging-minor`** – minor bump (e.g. 1.0.0 → 1.1.0)
   - **`staging-patch`** or **`staging`** – patch bump (e.g. 1.0.0 → 1.0.1)
2. **Commit and push** the version bump to `main`.
3. **Build** the Android release APK (using the debug keystore for staging).
4. **Deploy** the APK to Firebase App Distribution for the **internal-testers** group.

## One-time setup

### 1. Firebase CLI token (required for deploy)

Generate a token and add it as a GitHub secret:

```bash
# Log in and get a CI token (opens browser)
npx firebase login:ci
```

Copy the token, then in GitHub:

- Repo → **Settings** → **Secrets and variables** → **Actions**
- **New repository secret**
- Name: `FIREBASE_TOKEN`
- Value: paste the token

### 2. Firebase App Distribution tester group

- Open [Firebase Console](https://console.firebase.google.com) → project **valetmobileapp-6f619**
- **App Distribution** → **Testers & groups**
- Ensure a group named **internal-testers** exists and add tester emails (or create a different group and update the workflow).

### 3. (Optional) Use a release keystore for staging

By default the workflow uses the **debug keystore** so no secrets are needed for signing. To use your release keystore in CI:

- Encode the keystore: `base64 -i path/to/my-release-key.keystore | pbcopy` (or on Linux `base64 -w0 < file.keystore`)
- Add GitHub secrets:
  - `KEYSTORE_BASE64` – base64-encoded keystore file
  - `KEYSTORE_PASSWORD`
  - `KEY_ALIAS`
  - `KEY_PASSWORD`
- Update `.github/workflows/staging.yml`: add a step that decodes `KEYSTORE_BASE64` to `android/app/my-release-key.keystore`, then pass `-PMYAPP_RELEASE_STORE_FILE=my-release-key.keystore` and the other `-P` args from secrets.

## How to run a staging release

From your repo (on a branch that’s merged or up-to-date with `main`):

```bash
# Patch bump (e.g. 1.0.0 -> 1.0.1) – use either tag
git tag staging-patch
git push origin staging-patch

# Or the short form (same as patch)
git tag staging
git push origin staging

# Minor bump (e.g. 1.0.0 -> 1.1.0)
git tag staging-minor
git push origin staging-minor

# Major bump (e.g. 1.0.0 -> 2.0.0)
git tag staging-major
git push origin staging-major
```

To move a tag to the latest `main` and push:

```bash
git checkout main
git pull
git tag -f staging-patch
git push origin staging-patch -f
```

- The workflow runs on the tag push and bumps version according to the tag name.
- It checks out **main**, bumps version, commits and pushes back to **main**, then builds and deploys to Firebase.
- Testers in **internal-testers** get an email with a link to install the new build.

## Workflow file

- **Workflow:** [.github/workflows/staging.yml](.github/workflows/staging.yml)
- **Version bump script:** [scripts/bump-version.js](scripts/bump-version.js)

## Firebase App ID

- Android: `1:556469915246:android:7173377775e57f9bc1a07f` (set in the workflow; change there if you use a different app).

## Troubleshooting

- **Build fails (signing):** Ensure the workflow uses the debug keystore (`-P` flags) or that release keystore secrets are set and decoded correctly.
- **Firebase deploy fails:** Check that `FIREBASE_TOKEN` is set and valid (`firebase login:ci` again if needed). Ensure the group **internal-testers** exists in App Distribution.
- **Version not bumped on main:** The workflow pushes from `github-actions[bot]`; the repo must allow pushes to `main` (e.g. branch protection that allows the Actions bot to push, or run from a branch and merge the bump commit manually).
