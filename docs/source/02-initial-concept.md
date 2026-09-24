# Yachting App — Initial Concept & Feature List

Source: pasted by product owner, 2026-09-24. Verbatim.

## Main purpose

A simple digital app for yacht crew that makes it easier to:

* Log nautical miles and hours
* Keep an official-style digital record of experience
* Manage certificates and expiry dates
* Keep a digital crew profile/CV
* Track career progression
* Get reminders and useful information
* Reduce paperwork for crew and captains

The most important principle: KEEP IT SIMPLE. The first version should focus on the things crew actually need every day.

## 1. Digital yacht logbook — ⭐ MAIN FEATURE

Instead of writing everything manually in an RYA logbook, crew record their experience digitally.

Automatic GPS tracking: Start Trip → GPS tracking begins → End Trip → GPS tracking stops.

Automatically recorded: Boat name, Start location, End location, Date, Time, Distance travelled, Nautical miles, Duration/hours, Route, Potentially average/max speed, Day/night passage.

    Shadow
    Port Louis → Black River
    24 September 2026
    37 NM
    1 hr 10 min
    Day passage

Manual information crew can add: Captain, Crew members, Boat name, Boat type, Boat length, Engine hours, Type of passage, Day/night, Night watches, Watch times, Anchoring, Docking, Line handling, Tender operations, Fishing, Navigation, Maintenance, Safety drills, Watersports, Other duties.

Simple "What did you do?" tick-list:

    ☐ Line handling
    ☐ Docking
    ☐ Anchoring
    ☐ Tender driving
    ☐ Navigation
    ☐ Night watch
    ☐ Fishing
    ☐ Maintenance
    ☐ Washdown
    ☐ Guest operations
    ☐ Safety drills
    ☐ Other

## 2. AI log assistant

Instead of typing, the crew member speaks:

"I was on Shadow from Port Louis to Black River. I did the dock lines, helped with the tender and did a night watch from 9 to 11."

The AI converts this into:

    Boat: Shadow
    Passage: Port Louis → Black River
    Activities:
    * Dock/line handling
    * Tender operations
    * Night watch 21:00–23:00

The user reviews → confirms → saves.

## 3. Captain digital sign-off

Currently a captain may have to sign dozens or hundreds of pages.

Crew member selects "Request Captain Sign-Off", then selects multiple completed logs (1 Sep, 3 Sep, 5 Sep, ...). The app bundles those records. The captain receives: "Antwané has requested 6 log entries for sign-off." Captain reviews → Digital Signature. Once signed: 🔒 LOG LOCKED. Entries marked SIGNED / VERIFIED and can no longer be edited by the crew member.

The system keeps: who signed it, date/time signed, which entries were signed, digital signature/verification record.

## 4. Crew profile

Basic: Profile photo, Name, Surname, Date of birth, Nationality, Contact details, Current location, Passport information, Passport expiry, Languages, Emergency contact.

Professional: Current position, Years in yachting, Experience, Boat experience, Boat sizes, Fishing experience, Tender experience, Watersports, Other skills.

CV: Upload CV → store in profile. Later: create CV from information already stored in the app.

## 5. Certificate & document wallet

Digital place for all crew certificates (STCW, PADI Open Water, RYA Powerboat Level 2, VHF SRC, etc.) with uploaded PDF/photo, issue date, expiry date.

Expiry reminders: 90 days → 60 days → 30 days → weekly → daily until updated. Once the new certificate is uploaded: "Certificate updated ✓". The old certificate remains in history.

## 6. Career path

User sets "My goal: Captain". The app shows a step-by-step pathway (Deckhand → Captain): current experience (STCW ✓, Yacht Rating ✓, Powerboat Level 2 ✓, X NM ✓), next steps (certificate/course, sea time, practical requirements, exams, next qualification).

    Yachtmaster Progress
    Required: X NM
    Logged: 750 NM
    Remaining: 250 NM

Important: the exact requirements should come from official/current RYA or relevant maritime authority requirements, rather than the app guessing them.

## 7. Yachting schools & courses (later)

Searchable database of yacht schools: Country, City, School, Courses, Course dates, Prices, Contact, Website, Location. E.g. RYA Powerboat Level 2 → schools offering it → dates → booking.

## 8. Location-based training & medical help (later)

Uses location only when the user chooses. "Your ENG1 expires in 45 days. Find nearby: ENG1 doctors, maritime medical centres, STCW schools, RYA training centres." Show distance, address, phone, website, hours, booking. Eventually: book appointment.

## 9. Passport & visa assistant (later)

Crew enter passport details and visas (Schengen, UK, USA B1/B2, UAE...). App shows travel information per country: visa required?, type, allowed stay, expiry, entry requirements. Clear disclaimer: verify against official government/embassy sources.

## 10. Document expiry dashboard

    🟢 All good — Passport 2 years, STCW 11 months, ENG1 8 months
    🟠 Action needed — VHF expires in 75 days
    🔴 Urgent — Visa expires in 12 days

## 11. Experience / sea-time dashboard

    MY EXPERIENCE
    Nautical Miles 2,487 NM
    Sea Time 184 hours
    Night Hours 42 hours
    Night Watches 18
    Boats 5
    Longest Passage 380 NM
    Largest Boat 90 ft

## 12. Boat history

    MY BOATS
    M/Y Shadow — 90 ft Viking — Private — 2026–Present
    M/Y Example — 21 m — Chase Boat — 2025

Experience logged against each boat is automatically recorded.

## 13. Crew career history

    2026 — M/Y Shadow — Deckhand — 1,500 NM
    2025 — M/Y Example — Deckhand — 800 NM

## 14. Future — crew jobs

"Looking for work" profile: Position, Experience, Qualifications, Availability, Location, Visa status, CV, References, Logged sea time. Captains/recruiters search for crew.

## 15. Future — captain / crew verification

Captain verifies "Antwané worked onboard Shadow from X → X." Experience becomes verified experience.

## 16. Future — digital reference

After leaving a boat, the captain provides a digital reference (vessel, position, dates, verified captain). Sits alongside the CV.

## 17. Home screen — keep it very simple

    MY YACHTING
    + LOG TRIP
    My Experience — 2,487 NM | 184 hrs
    Documents — 🟢 8 Valid 🟠 1 Expiring
    Career — Yachtmaster Progress
    Profile — My CV & Certificates
    More

## 18. Important design principle

"Open → Log → Done." Not "Open → 15 menus → complicated forms → 20 questions → finally save." The selling point is saving crew time and reducing paperwork.
