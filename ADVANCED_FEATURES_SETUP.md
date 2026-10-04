# MoveOn Advanced Features Setup

## Included
- Per-user language choice with broad Google Translate coverage; first launch asks for language and the choice can be changed later.
- Ex Roleplay setup now stores: ex name, gender, breakup duration, conversation topic, optional photo. AI receives these settings and the selected language.
- Real home progress based on completed challenges, journal entries, moods and completed calm sessions.
- First 2 calm sessions free; further completed sessions require Premium.
- First 2 journal entries free; further entries require Premium.
- Redesigned ₹49/month Premium page with activation polling.
- Notification settings saved per user and browser notification permission + FCM-ready service worker.

## Notifications background delivery
The browser permission alone is not enough for guaranteed background phone notifications. For full background delivery:
1. Firebase Console -> Project settings -> Cloud Messaging -> Web configuration -> Web Push certificates -> create/copy the public key.
2. Put that public key in `Moveon/notifications.html` replacing `REPLACE_WITH_FIREBASE_WEB_PUSH_CERTIFICATE_KEY`.
3. Configure a secure Firebase service-account credential as a Cloudflare Worker secret if you add the scheduled sender. Never put the private key in the repository.
4. Configure a Cloudflare cron for the Worker and use the stored user notification settings / FCM token to send reminders.

The app still requests browser notification permission and stores the user's settings even before the background sender is configured.

## Premium
The existing Worker expects:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_PLAN_ID`
- `FIREBASE_WEB_API_KEY`
- `FIREBASE_DB_SECRET`
- `OPENAI_API_KEY`

The Razorpay plan itself must be a ₹49 monthly plan.
