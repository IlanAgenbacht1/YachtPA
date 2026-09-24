# Yacht Crew App — Product Requirements & Problem Statement

Source: pasted by product owner, 2026-09-24. Verbatim.

## 1. The problem we want to solve

Yacht crew are required to keep track of large amounts of information throughout their careers:

* Sea miles
* Sea days
* Hours underway
* Night hours
* Vessels worked on
* Vessel size/type
* Position/role onboard
* Duties performed
* Voyages and passages
* Qualifications
* Courses completed
* Captain/senior officer verification
* Career progression

Currently, much of this is recorded manually in paper logbooks, spreadsheets, notes or multiple different apps.

This creates several problems:

1. Crew forget to record miles/hours.
2. Crew don't always know exactly what information they need to record.
3. Logbooks can become incomplete or inconsistent.
4. Writing daily duty descriptions is tedious.
5. Crew may only realise later that they have accumulated enough experience for a course or qualification.
6. Historical experience can be difficult to reconstruct.
7. Captains and employers have no simple way of verifying a crew member's experience.
8. Crew change yachts frequently, making career records fragmented.
9. Paper records can be lost or damaged.
10. There is no simple "one place" containing a yachtie's complete professional experience.

## 2. Main goal

Create an extremely simple app that automatically builds a yacht crew member's professional sea-service record with as little manual input as possible.

The philosophy should be: "Do the work. Let the app do the paperwork."

The app should be extremely easy to use, even for someone who is not tech-savvy.

## 3. User profile

Each user should have a professional yacht-crew profile containing:

Personal information: Name, Nationality, Contact details, Home country, Optional profile photograph.

Professional information: Current position, Previous positions, Years in yachting, Qualifications/certificates, STCW certificates, Yachtmaster/other qualifications, Additional courses, Skills.

Yacht information — users should be able to add every yacht they have worked on. For each yacht:

* Yacht name
* Yacht type
* Motor/sailing
* Length
* Gross tonnage if available
* Flag
* IMO number if applicable
* Official vessel number if applicable
* Position held
* Start date
* End date
* Captain/master
* Company/management company
* Home port

The app should maintain a permanent history of every vessel the crew member has worked on.

## 4. Automatic sea-mile tracking

This should be one of the core features. The app should use the phone's GPS to automatically detect and record movement at sea.

It should ideally determine: Distance travelled, Nautical miles, Date, Start location, End location, Duration, Average speed, Maximum speed, Track/route, Day/night passage, Vessel being used.

The user should not have to manually calculate nautical miles.

Example: Crew member boards a yacht in Dubai. They select "M/Y Example — Deckhand". They press START VOYAGE. The app records the journey in the background. At the end: STOP VOYAGE. The app automatically produces:

    Dubai → Muscat
    412 NM
    18h 42m
    6h 15m night passage

The user simply confirms the voyage.

## 5. Automatic hours / sea days

The app should automatically calculate: Hours underway, Days at sea, Calendar days onboard, Night hours, Total accumulated sea time, Total miles. Users should be able to see lifetime totals.

    MY EXPERIENCE
    5,247 NM
    412 Sea Days
    1,842 Hours Underway
    317 Night Hours

The system should also separate experience by: Motor yacht, Sailing yacht, Vessel size, Position, Captain/command experience, Passage type.

## 6. Daily duties — AI voice-note system

Instead of forcing crew to sit down and write daily reports, the user should be able to press a button and speak.

"Today we washed down the exterior, polished the stainless, checked the tender, changed the fuel filters on the generator and then did a safety inspection before departure."

The AI converts this voice note into a professional written record:

    Daily Duties — Deckhand
    * Exterior washdown completed
    * Stainless-steel polishing completed
    * Tender inspection conducted
    * Generator fuel filters replaced
    * Pre-departure safety inspection completed

The user can then: Confirm / Edit / Save.

The AI should learn the terminology used in yachting: Bosun, Deckhand, Mate, Chief Officer, Tender, Toys, Washdown, Chamois, Teak, Stainless, Lines, Fenders, Anchoring, Watchkeeping, Passage, Maintenance, Safety drills, Guest operations, Engineering tasks.

The AI should NEVER invent duties. It should only turn what the user says into a professional record.

## 7. Daily log / career diary

Each day should create a simple digital record.

    24 September 2026
    M/Y Example — Deckhand
    Location: Mauritius
    Voyage: Port Louis → Réunion
    Sea time: 7h 42m
    Distance: 96 NM
    Duties:
    * Deck washdown
    * Tender maintenance
    * Guest-area preparation
    * Safety equipment inspection
    User confirmation: ✓ Confirmed

This creates a permanent professional history.

## 8. Qualification / course progression system

The app should know the experience requirements for relevant qualifications and courses. As the user accumulates experience, the app tracks their progress.

    YACHTMASTER PROGRESS
    Required: 1,500 NM
    Current: 1,274 NM
    226 NM remaining

When the user reaches the relevant threshold: "Congratulations — you have reached the logged-mile requirement for this qualification."

The app should also identify other requirements that are still outstanding:

    Miles ✓
    Night hours ✓
    Sea days ✓
    First Aid ✗
    Theory course ✗

This turns the app into a career progression tool rather than simply a logbook.

## 9. Qualification database

Eventually the app should contain requirements for relevant yacht/seafarer qualifications: RYA Yachtmaster, RYA/MCA qualifications, IYT qualifications, STCW courses, Engineering qualifications, Officer qualifications, Yacht-specific courses, Medical certificates, Other recognised maritime qualifications.

Requirements should be stored in a database so they can be updated when official requirements change.

Important: the app should clearly distinguish between "You appear to have accumulated enough experience" and "You are officially qualified." The app should never claim to issue or approve qualifications.

## 10. Verification system

A crew member should be able to request verification of a voyage or period of employment from: Captain, Chief Officer, Employer, Management company.

    Trystin Vercuiel
    M/Y Example
    Deckhand/Mate
    01 May – 30 June 2026
    1,248 NM
    Request Captain Verification

Captain receives a simple link. They can confirm: Dates, Vessel, Position, Miles, Sea time, Duties. Then the voyage receives: VERIFIED ✓.

## 11. Digital sea-service record

The user should eventually be able to generate a professional document containing their entire career.

    PROFESSIONAL SEA SERVICE RECORD
    Name / Current position / Total sea miles / Total sea days / Total night hours

    VESSEL HISTORY
    M/Y Alpha Bravo — 22m Motor Yacht — Deckhand/Mate — 2023–2026 — 2,500 NM — Verified ✓
    M/Y Shadow — 30m Motor Yacht — Deckhand — 2026 — 2,000 NM — Verified ✓

The user should be able to export this as a professional PDF.

## 12. Yacht/company dashboard

Eventually a separate system for yacht management companies. A yacht could have its own account. The captain/management company could see: Current crew, Crew positions, Sea time, Voyages, Training, Certificates, Expiry dates, Duties, Verified experience. Potential B2B revenue stream.

## 13. Certificate expiry notifications

"STCW First Aid expires in 45 days." "Medical certificate expires in 72 days." "Passport expires in 8 months."

The user can upload certificates and enter expiry dates. Eventually AI/OCR could read the certificate and extract: Certificate name, Issue date, Expiry date, Certificate number, Issuing authority.

## 14. Smart notifications

Useful rather than annoying:

* "You've reached 500 NM since your last qualification milestone."
* "You have accumulated enough night hours for X requirement."
* "Your STCW certificate expires in 30 days."
* "You are 87 NM away from your next Yachtmaster milestone."
* "You've completed 1 year of sea service."

## 15. Extremely simple user experience

The app should NOT feel like accounting software. Home screen:

    TODAY
    ⚓ M/Y Example — Deckhand
    START VOYAGE
    LOG DUTIES 🎙️
    MY MILES
    MY QUALIFICATIONS

Everything else can be secondary. The user should ideally spend less than 2 minutes per day using the app.

## 16. Anti-error / "fool-proof" design

* Impossible GPS movement: "This voyage appears inconsistent with your previous location. Please confirm."
* Forgot to stop tracking: "You've been tracking for 31 hours. Are you still underway?"
* 1,500 NM for a 2-hour voyage: "This distance appears unusual. Please check."
* Forgot to log a day: "You haven't recorded any activity for 3 days. Would you like to add a missing entry?"

The system should flag suspicious or incomplete information rather than silently accepting everything.

## 17. Offline functionality

Essential. The app must work without internet while offshore. GPS tracking, voice notes and daily logs stored locally. When the phone reconnects: automatically sync. The user should never lose records because they were offshore without signal.

## 18. Data security / ownership

Users should be able to: Export their data, Download their sea-service record, Generate PDFs, Back up their records, Change yachts/employers without losing their history. The user's career history stays with the user.

## 19. Long-term vision

"LinkedIn + digital sea-service logbook for yacht crew." Future: Crew CV/profile, Job applications, Recruitment, Yacht vacancies, Verified references, Course booking, Training providers, Certificate management, Crew-to-yacht matching, Employer verification, Career progression, Salary/position benchmarking, Yacht management integration.

## 20. Possible business model

Freemium. Free: Basic profile, Basic mileage tracking, Basic logbook. Premium: AI duty logging, Advanced statistics, Qualification tracking, PDF sea-service records, Certificate management, Cloud backup, Verified records. Possible price €4.99–€9.99/month.

B2B: yacht management companies pay for crew management, certificate tracking, crew records, verification, compliance dashboards.

Marketplace: training/course providers, medical providers, recruitment agencies, yacht services.

## 21. MVP — what we should build FIRST

1. User account
2. Yacht profile
3. Add current yacht
4. Start/stop voyage
5. Automatic GPS sea-mile tracking
6. Automatic hours/time calculation
7. Daily log
8. Voice note → AI written duties
9. Edit/confirm AI entry
10. Automatic lifetime mileage/sea-time totals
11. Basic qualification milestones
12. PDF export
13. Offline tracking
14. Cloud backup

## 22. The fundamental product philosophy

"How can we make professional sea-service logging almost effortless for yacht crew?"

Work → speak → confirm → app records everything.
