# Phase 0 spike: background GPS

Goal: prove that a voyage can be tracked for 24 hours on both platforms with the app in the background or killed, at under 10% battery per 12 hours, before more of the app is built on top of it.

## Build

Background location does not run in Expo Go on Android, so use a development build:

```
cd mobile
npx eas-cli@latest build -p android --profile development
```

Install the APK, then `npx expo start --dev-client` and open the app from the dev client. iOS can be tested in Expo Go for the foreground part; background behaviour needs a development build there too.

## Run

1. Profile → Testing → **Delete local data**, so the run starts clean.
2. Home → **Start voyage**. Grant location, then choose **Allow all the time** when asked. On Android 12+ the second prompt sends you to Settings; come back to the app after.
3. Confirm the persistent notification "YachtPA is logging your voyage" is showing (Android).
4. Note the time and battery percentage.
5. Put the phone away. Over the run: lock it, open other apps, swipe YachtPA out of recents at least once, let it sit overnight. Do **not** reboot: tracking does not survive a reboot yet (known gap).
6. After 24 hours, open the app. The Live screen shows fixes received and GPS accuracy. Note battery again, then **Stop voyage** and read the summary.

## Record

| | Start | End |
|---|---|---|
| Time | | |
| Battery % | | |
| Fixes received (Live screen) | | |
| Longest gap between fixes while moving | | |
| Survived swipe-from-recents? | | |
| Survived overnight? | | |
| Summary NM vs what you actually did | | |

## Pass

- Battery: under 10% per 12 h on a mid-range phone.
- Fixes keep arriving after the app is swiped away and after a night locked.
- No phantom miles while stationary (summary NM near zero for a day at the dock).
- Real movement produces plausible NM and a sensible track.

## Knobs

`mobile/src/location/tracker.ts` → `TRACKING_OPTIONS`. Start with 30 s / 25 m. If battery is bad, try `Accuracy.Balanced` and 60 s; if the track has holes, shorten the interval. The filter thresholds (accuracy ≤ 50 m, ≤ 60 kn) are in `mobile/src/domain/track.ts`.

## Known gaps to close after the spike

- Tracking does not restart after a reboot (needs a boot receiver or a resume check on next launch, which is already there: an open voyage restarts tracking when the app opens).
- No "still underway?" notification after 24 h yet.
- iOS deferred updates are configured but unverified on a device.
