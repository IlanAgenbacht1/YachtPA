# Shipping to Google Play

What it costs, what Google requires for an app that tracks location in the background, and the commands. Written 2026-09-25 against the free Expo plan; check the linked pages for current limits.

## Accounts

| Account | Cost | Notes |
|---|---|---|
| Google Play Console | 25 USD, once | Personal accounts opened after Nov 2023 must run a **closed test with at least 12 testers opted in continuously for 14 days** before they can apply for production access. Plan for it: recruit crew friends early. |
| Expo (expo.dev) | Free plan | EAS Build has a limited monthly quota of cloud builds on the free plan and jobs queue behind paid ones. Enough for this project; see [expo.dev/pricing](https://expo.dev/pricing). Local builds with Android Studio are unlimited if the quota bites. |

## Decide before the first upload

- **Package name** `com.yachtpa.app` (in `mobile/app.json`) is permanent once an app with it is uploaded to Play. Change it now if you want something else, ideally on a domain you own.
- **App name** "YachtPA" is a working title. It can change later; the package name cannot.
- **Signing** is handled by EAS (it creates and stores the keystore) and Play App Signing enrols on the first upload. Nothing to do by hand.

## Builds

All from `mobile/`. EAS CLI is run through npx, no global install.

```
npx eas-cli@latest login
npx eas-cli@latest build:configure          # once; links the project to your Expo account

npx eas-cli@latest build -p android --profile development   # dev client APK: needed for background GPS (not in Expo Go on Android)
npx eas-cli@latest build -p android --profile preview       # plain APK to sideload on testers' phones
npx eas-cli@latest build -p android --profile production    # AAB for Play
```

Profiles are in `mobile/eas.json`. `appVersionSource: remote` lets EAS bump `versionCode` on every production build.

## Submitting

```
npx eas-cli@latest submit -p android --latest
```

The first time, EAS asks for a Google service account JSON key. Make it in Google Cloud Console, grant it access in Play Console under **Users and permissions**, and keep the file out of git (`*.json` under `mobile/credentials/` is a sensible place; add it to `.gitignore` when you create it). The `submit.production` profile uploads to the **internal testing** track as a draft, so nothing goes live by accident.

Tracks, in the order you will use them:

1. **Internal testing**: up to 100 testers, available within minutes. You two and any crew you trust.
2. **Closed testing**: the 12-testers-for-14-days requirement lives here.
3. **Production**: after Google grants production access.

## Background location: what Play demands

Play reviews apps that hold `ACCESS_BACKGROUND_LOCATION` by hand. Expect the first review to take days and to be rejected once.

1. **Prominent disclosure in the app**, before the permission prompt, saying what is collected and why. The Start voyage flow shows one on first use; keep its wording aligned with the store listing.
2. **Permission declaration form** in Play Console (App content → Sensitive app permissions → Location), with a short screen recording of the disclosure and of tracking only running between Start and Stop.
3. **Privacy policy URL** in the listing and inside the app. Draft in [PRIVACY.md](PRIVACY.md); host it on GitHub Pages or any static page.
4. **Data safety form**: location collected, used for app functionality, not shared, user can request deletion (Profile → Export / delete, to be built).
5. Play also expects the feature to be core to the app. "Logs sea miles for a professional record" is exactly the kind of use they approve.

## Versioning and updates

- `version` in `app.json` is the user-facing version; bump it for each store release.
- `versionCode` is managed remotely by EAS.
- Over-the-air JS updates (EAS Update) are not set up. Add them when the flows stabilise; they let you fix JS bugs without a store review.

## iOS, for later

Apple Developer Program is 99 USD per year and needs a Mac only for nothing: EAS builds and submits from the cloud. The location plugin config already writes the `UIBackgroundModes` and usage strings.
