/// <reference types="node" />
/**
 * How crew actually talk about their day, mostly as Android's recogniser
 * returns it (no punctuation, no capitals), and the logbook entry a good
 * draft should produce. Add a case whenever a tester's entry comes out wrong.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { draftFromText } from './draft.ts';

type Case = [string, string[], string[]];

const CASES: Case[] = [
  [
    'today we washed down the exterior polished the stainless checked the tender and did a fire drill',
    ['Washed down the exterior', 'Polished the stainless', 'Checked the tender', 'Did a fire drill'],
    ['Washdown', 'Tender', 'Maintenance', 'Safety drill'],
  ],
  [
    'Today we washed down the exterior, polished the stainless, checked the tender, changed the fuel filters on the generator and then did a safety inspection before departure.',
    ['Washed down the exterior', 'Polished the stainless', 'Checked the tender', 'Changed the fuel filters on the generator', 'Did a safety inspection before departure'],
    ['Washdown', 'Tender', 'Maintenance', 'Safety drill'],
  ],
  ['washing down the boat polishing the stainless and cleaning the windows', ['Washed down the boat', 'Polished the stainless', 'Cleaned the windows'], ['Washdown', 'Maintenance']],
  [
    'had to wash down the exterior and polish all the stainless then help the stews with laundry',
    ['Washed down the exterior', 'Polished all the stainless', 'Helped the stews with laundry'],
    ['Washdown', 'Maintenance'],
  ],
  ['night watch from two till six', ['Night watch 02:00–06:00'], ['Night watch']],
  ['i was on watch from 0200 to 0600 then washed down the decks', ['Night watch 02:00–06:00', 'Washed down the decks'], ['Washdown', 'Night watch']],
  ['anchor watch 10pm to 2am', ['Anchor watch 22:00–02:00'], ['Anchoring', 'Night watch']],
  ['bridge watch 2 to 4 in the afternoon', ['Bridge watch 14:00–16:00'], ['Watchkeeping']],
  [
    'we med moored stern to put out the fenders and lines and set up the passerelle',
    ['Med-moored stern-to', 'Put out the fenders and lines', 'Set up the passerelle'],
    ['Docking'],
  ],
  [
    'dropped the hook in the bay then took the guests to the beach in the tender',
    ['Dropped the hook in the bay', 'Took the guests to the beach in the tender'],
    ['Anchoring', 'Tender', 'Guest ops'],
  ],
  ['picked up provisions from the supermarket and stowed them', ['Picked up provisions from the supermarket and stowed them'], ['Provisioning']],
  ['took on 2000 litres of diesel', ['Took on 2000 litres of diesel'], ['Bunkering']],
  ['refuelled the tender and jet skis', ['Refuelled the tender and jet skis'], ['Tender', 'Bunkering']],
  ['um so basically i just sanded the cap rail and um put on two coats of varnish', ['Sanded the cap rail', 'Put on two coats of varnish'], ['Maintenance']],
  [
    'serviced the watermaker changed the impeller on the port generator and topped up the hydraulic oil',
    ['Serviced the watermaker', 'Changed the impeller on the port generator', 'Topped up the hydraulic oil'],
    ['Maintenance'],
  ],
  ['dried the boat with a shammy', ['Dried the boat with a chamois'], ['Washdown']],
  [
    'helped the deckhands launch the sea bob and the jet ski for the guests',
    ['Helped the deckhands launch the seabob and the jet ski for the guests'],
    ['Tender', 'Guest ops'],
  ],
  ['did a turn down service in the guest cabins', ['Did a turndown service in the guest cabins'], ['Guest ops']],
  ['man overboard drill with the whole crew', ['Man overboard drill with the whole crew'], ['Safety drill']],
  ['passage plan for tomorrow and checked the weather', ['Passage plan for tomorrow', 'Checked the weather'], ['Navigation']],
  ['I helmed for three hours on the way to Monaco', ['Helmed for three hours on the way to Monaco'], ['Watchkeeping']],
  ['Washed down the exterior. Polished the stainless.', ['Washed down the exterior', 'Polished the stainless'], ['Washdown', 'Maintenance']],
  ['this morning we got the boat ready for guests and after lunch we washed down', ['Got the boat ready for guests', 'Washed down'], ['Washdown', 'Guest ops']],
  ['changed the oil and filters on both main engines', ['Changed the oil and filters on both main engines'], ['Maintenance']],
  ['spent the day sanding and varnishing the teak', ['Spent the day sanding and varnishing the teak'], ['Maintenance']],
  ['washing the decks then polishing', ['Washed the decks', 'Polished'], ['Washdown', 'Maintenance']],
  ['We did a safety walk round and a fire drill.', ['Did a safety walk round and a fire drill'], ['Safety drill']],
  ['wash down polish stainless check tender', ['Washed down', 'Polished stainless', 'Checked tender'], ['Washdown', 'Tender', 'Maintenance']],
  [
    'cleaned the varnished rail and sanded the newly painted hatch',
    ['Cleaned the varnished rail', 'Sanded the newly painted hatch'],
    ['Maintenance'],
  ],
  [
    'we came alongside in the morning and the guests arrived at noon so we served lunch on the aft deck',
    ['Came alongside', 'The guests arrived at noon', 'Served lunch on the aft deck'],
    ['Docking', 'Guest ops'],
  ],
  ['cleaned the engine room and checked the oil levels and coolant', ['Cleaned the engine room', 'Checked the oil levels and coolant'], ['Maintenance']],
  ['I washed the tender and then I polished it', ['Washed the tender and polished it'], ['Washdown', 'Tender', 'Maintenance']],
  ['did the laundry ironed the crew uniforms and folded towels', ['Did the laundry', 'Ironed the crew uniforms', 'Folded towels'], []],
  ['we left port at 8 and arrived in Saint Tropez at 2', ['Left port at 8', 'Arrived in Saint Tropez at 2'], ['Docking']],
  ['anchor watch 2300 to 0300 then breakfast for the crew', ['Anchor watch 23:00–03:00', 'Breakfast for the crew'], ['Anchoring', 'Night watch']],
  ['on watch midnight to four', ['Night watch 00:00–04:00'], ['Night watch']],
  ['did the 8 to 12 watch', ['Watch 08:00–12:00'], ['Watchkeeping']],
  ['washdown after the guests left', ['Washdown after the guests left'], ['Washdown', 'Guest ops']],
  ['checked all the bilges and pumped out the black water tank', ['Checked all the bilges', 'Pumped out the black water tank'], ['Maintenance']],
  ['re-rigged the flagpole and the courtesy flag', ['Re-rigged the flagpole and the courtesy flag'], []],
  ['polished all the stainless on the flybridge and the swim platform', ['Polished all the stainless on the flybridge and the swim platform'], ['Maintenance']],
  [
    'Washed the boat. Then we did the provisioning, put everything away and helped in the galley.',
    ['Washed the boat', 'Did the provisioning and put everything away', 'Helped in the galley'],
    ['Washdown', 'Provisioning'],
  ],
  [
    'ok so today was pretty busy we started with a washdown of the whole boat then the captain asked us to sort out the tender garage and i serviced the jet skis after lunch we had a safety briefing and a fire drill and in the evening i did anchor watch from 10 to 2',
    ['Started with a washdown of the whole boat', 'The captain asked us to sort out the tender garage', 'Serviced the jet skis', 'Had a safety briefing and a fire drill', 'Anchor watch 22:00–02:00'],
    ['Washdown', 'Tender', 'Maintenance', 'Safety drill', 'Night watch', 'Anchoring'],
  ],
  ['yeah nothing major just general cleaning and helped the chef with the provisioning delivery', ['General cleaning', 'Helped the chef with the provisioning delivery'], ['Provisioning']],
  ['squeegeed the windows wiped down the cushions and put the covers back on', ['Squeegeed the windows', 'Wiped down the cushions', 'Put the covers back on'], ['Washdown']],
  [
    'we had guests on board all day so mostly guest ops tender runs to the beach and back setting up the toys and the beach club',
    ['Had guests on board all day', 'Guest ops tender runs to the beach and back', 'Set up the toys and the beach club'],
    ['Tender', 'Guest ops'],
  ],
  [
    'morning was teak scrubbing then i cleaned the crew mess and in the afternoon we did a tender run to town for parts',
    ['Teak scrubbing', 'Cleaned the crew mess', 'Did a tender run to town for parts'],
    ['Tender', 'Maintenance'],
  ],
  [
    'not much today we were at anchor so i did some varnishing and helped the engineer change the impeller',
    ['At anchor', 'Did some varnishing', 'Helped the engineer change the impeller'],
    ['Anchoring', 'Maintenance'],
  ],
  [
    'departed antibes at 0600 and arrived in portofino at 1800 then i was on anchor watch from 10 to 2',
    ['Departed Antibes at 0600', 'Arrived in Portofino at 1800', 'Anchor watch 22:00–02:00'],
    ['Night watch', 'Anchoring'],
  ],
  ['stood by the lines while we bunkered then washed down', ['Stood by the lines while we bunkered', 'Washed down'], ['Washdown', 'Bunkering']],
  ['we left st tropez and went to the nice split of the ropes', ['Left St Tropez', 'Went to the nice split of the ropes'], []],
];

describe('draft corpus', () => {
  for (const [input, duties, activities] of CASES) {
    it(input.slice(0, 70), () => {
      const d = draftFromText(input);
      assert.deepEqual(d.duties, duties);
      assert.deepEqual([...d.activities].sort(), [...activities].sort());
    });
  }
});
