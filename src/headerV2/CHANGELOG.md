# Changelog
All changes to this project will be documented in this file.

## [Unreleased]

- Use the notifications client for chat status updates and reconnect it after extending the user session.

## [0.1.57] - 21-10-2026

- Fixed truncated and malformed toast messages

## [0.1.56] - 28-09-2026

- Session is extended on any user activity, so logout happens only after the configured session length of inactivity
- Redirect to login when the session has expired

## [0.1.55] - 14-09-2026

- Modified user status naming

## [0.1.54] - 02-09-2026

- Modified away status functionality

## [0.1.53] - 06-07-2026

- Modified toast position and appearance

## [0.1.52] - 28-05-2026

- Fixed multidomain selection covers user settings menu

## [0.1.51] - 11-05-2026

- Updated user domains on selection

## [0.1.50] - 28-04-2026

- Enhanced domain selector bar

## [0.1.49] - 27-04-2026

- Added new domain visual changes

## [0.1.48] - 20-04-2026

- Added session logout

## [0.1.47] - 23-12-2025

- Removed toast on logout

## [0.1.46] - 24-10-2025

- Removed logout use effects from header as its not consitent in prod.

## [0.1.45] - 23-10-2025

- Removed log out sequence

## [0.1.44] - 23-10-2025

- Added reload and navigate as second check

## [0.1.43] - 22-10-2025

- Reverting changes

## [0.1.42] - 22-10-2025

- Added logs to last session check in before unload
- Removed extra pre log out check.

## [0.1.41] - 21-10-2025

- Added console log prelogout for test env
- Added extra check for logout trigger.

## [0.1.40] - 13-10-2025

- Added use effect to logout on close.
- Added tabs session management.

## [0.1.39] - 21-08-2025

- Added utility to filter chats
- Updated get pending chats based on domains
- Updated get active chats based on domains

## [0.1.38] - 24-07-2025

- Removed console log
- Added selectAll functionality
- Added missing toggle to remove domains button from header

## [0.1.37] - 25-06-2025

- Added multi domain modal
- Updated store to include selected domains

## [0.1.36] - 20-05-2025

- Renamed Input Label to Title to avoid css collision on modules

## [0.1.35] - 07-05-2025

- Updated default toast duration to be 5 seconds.

## [0.1.34] - 30-04-2025

- Improved adding comment to away status UI

## [0.1.33] - 23-04-2025

- Modified CSA chat forwarding notification toast

## [0.1.32] - 11-04-2025

- Fixed Activity Change alignment with status

## [0.1.31] - 11-04-2025

- Modified Change Status to Change Status Comment

## [0.1.30] - 11-04-2025

- Added Offline Status Comment

## [0.1.29] - 10-04-2025

- Modified Idle Timeout Constant

## [0.1.28] - 10-04-2025

- Removed Idle Notification

## [0.1.27] - 25-03-2025

- Fixed Status Green to yellow flow
- Enhanced Active - Idle - Offline switch flow

## [0.1.26] - 24-03-2025

- Fixed logic behind active chats length method.

## [0.1.25] - 19-03-2025

- Updated active chat counts that used in menu to just display overall active chats length.

## [0.1.24] - 18-03-2025

- Disabled Api Request Cache

## [0.1.23] - 14-03-2025

- Fixed csa status change on idle

## [0.1.22] - 04-03-2025

- Fixed forwarded chats and validations notifications
- Handled focused chat
- Fixed Notifications for unrelated csa's

## [0.1.21] - 12-02-2025

- Added customer support activity on error handle

## [0.1.20] - 27-01-2025

- Fixed Active Chats Ding
- Removed CSA Status from pending chats

## [0.1.19] - 17-01-2025

- Modified Validations Endpoint

## [0.1.18] - 13-01-2025

- Added sse event into header to track chats properly

## [0.1.17] - 06-12-2024

- Added Validation Messages

## [0.1.16] - 19-11-2024

- Added check for local to ignore token check for developers

## [0.1.15] - 11-11-2024

- Updated token expiration check

## [0.1.14] - 07-07-2024

- Replace Howler with audio
- Passed State to useChatNotifyEffect Hook
- Passed User info given to header to the header store
- Checked for CSA Status before playing sound or showing notification

## [0.1.11] - 07-07-2024

- Header is updated to send notifications for every new message instead of every new chat

## [0.1.9] - 20-06-2024

- Improvements and bug fixes

## [0.1.8] - 19-06-2024

- Improvements and bug fixes

## [0.1.7] - 18-06-2024

- Improvements and bug fixes

## [0.1.6] - 30-05-2024

- Hide some user settings if `REACT_APP_ENABLE_HIDDEN_FEATURES` is `TRUE`

## [0.1.5] - 25-04-2024

- Updated api call addresses 

## [0.1.4] - 02-15-2024

- Updated store file to match chatbot changes.
- Updated /types/chat file to match chatbot changes.

## [0.1.3] - 01-01-2024

- Updated usage of activity.active

## [0.1.2] - 09-01-2024

- Remove audio error console message.

## [0.1.1] - 06-12-2023

- Initial version of Header component for ruuter v2.
