# booking-exclusion-filter
Local list of animal-friendly hotels.

Browse results on booking.com.
Click **Add visible hotels**.
Click **Toggle dimming**.
Click **Copy non-excluded hotels** to copy the currently enabled visible hotels.
Click **Clear hotel filter list** to reset the saved list.

This is a Chromium + Firefox extension.
To use it:
1. git clone this project.
2. open your extensions page (Chrome/Edge: `chrome://extensions`, Firefox: `about:debugging#/runtime/this-firefox`).
3. enable developer mode.
4. load unpacked (Chromium) or load temporary add-on and pick `manifest.json` (Firefox).
5. open booking.com.
6. search for a location and dates; control panel appears top-right.
7. click the saved-count badge, or focus it and press Enter/Space, to show or hide the saved hotel list.

Initially developed to filter out all hotels that accept animals so only the ones that forbid them are "enabled"...

## Mobile (phone/tablet)

No extension install needed — works on iOS Safari, Android Chrome, Firefox, and more.

1. Open the install page on your phone: [mobile.html](https://fabian20ro.github.io/booking-exclusion-filter/mobile.html)
   - If you open a local copy, serve it over HTTP; the page loads `bookmarklet.js` next to it.
2. Tap **"Copy bookmarklet to clipboard"**
3. Create any bookmark in your browser, then **edit** it and **paste** the copied code as the URL
4. Go to booking.com, search for a location, then open your bookmarks and tap **"Hotel Filter"**
5. A toolbar appears at the bottom of the screen with the same actions, including **Copy all saved** and **Copy non-excluded hotels**. Tap the saved-count badge to show or hide the saved hotel list.

Detailed step-by-step instructions for each browser are on the install page.

*Maintained by Compound Autopilot.*
