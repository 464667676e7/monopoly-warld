# Firebase Realtime Database rules — Monopoly World

These rules require Firebase Anonymous Authentication. The HTML client signs in anonymously and adds the Firebase ID token to each Realtime Database REST request.

## Apply
1. Firebase Console → Realtime Database → Rules.
2. Replace the rules with the contents of `database.rules.json`.
3. Review carefully, then Publish.
4. Verify Authentication → Sign-in method → Anonymous is enabled.

## Notes
- Rooms are readable by authenticated users while in the lobby so a guest can validate and join a room; room codes are random 9-digit values.
- A guest can write only their own player node while the room is in the lobby, and their own message node while the room is playing.
- The host UID controls room-level writes.
- This is a client-hosted game. These rules prevent unauthenticated access and basic cross-user writes, but they do not make game outcomes server-authoritative. A malicious host can still manipulate game state. For competitive integrity, move authoritative actions to Cloud Functions or another trusted server.
