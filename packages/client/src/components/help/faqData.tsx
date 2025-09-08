import React from 'react';

export type FaqTopicId =
  | 'astro_empires'
  | 'upgraded_account'
  | 'game_account'
  | 'recruiting_players'
  | 'guilds'
  | 'bases'
  | 'colonization'
  | 'trade'
  | 'fleets'
  | 'commanders'
  | 'attacks_on_bases'
  | 'recyclers'
  | 'players'
  | 'server_npcs'
  | 'inactivity'
  | 'others'
  | 'shared_ips';

export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

export interface FaqTopic {
  id: FaqTopicId;
  title: string;
  items: FaqItem[];
  group?: 'main' | 'footer';
}

export const defaultFaqTopicId: FaqTopicId = 'astro_empires';

export const faqTopics: FaqTopic[] = [
  {
    id: 'astro_empires',
    title: 'Astro Empires',
    items: [
      {
        q: 'What is Astro Empires?',
        a: (
          <div className="space-y-2">
            <p>
              Astro Empires is a persistent space strategy game where you build bases, manage resources,
              research technologies, trade, command fleets, and coordinate with a guild to expand your empire.
            </p>
          </div>
        ),
      },
      {
        q: 'How do I progress efficiently?',
        a: (
          <div className="space-y-2">
            <p>
              Focus on establishing stable economic bases, researching key technologies, and using trade routes
              to sustain growth. Coordinate fleet movements to protect assets and seize opportunities.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'upgraded_account',
    title: 'Upgraded Account',
    items: [
      {
        q: 'I have just created a game account, but I noticed that it will expire in few days. What does that mean?',
        a: (
          <div className="space-y-2">
            <p>
              Every new game account starts off with an account upgrade lasting 7 days. After those seven
              days, the account turns into a free account unless the owner of the account (or anyone else)
              upgraded it beforehand.
            </p>
          </div>
        ),
      },
      {
        q: 'After my upgrade expires what happens?',
        a: (
          <div className="space-y-2">
            <p>
              After your account upgrade expires your account becomes a free account, free accounts shows
              advertising and are limited in some features, compare here.
            </p>
          </div>
        ),
      },
      {
        q: 'Do I lose my bases above 9, or my advanced structures above level 5 if my account upgrade expires?',
        a: (
          <div className="space-y-2">
            <p>
              No, you get to keep what you already have, but you cannot build any more bases or advanced
              structures than their current number/level.
            </p>
          </div>
        ),
      },
      {
        q: 'How does Upgrading an account work?',
        a: (
          <div className="space-y-2">
            <p>
              Upgrading will improve your gameplay, removing site advertising and add extra features to your
              account. See the upgrade page for more information.
            </p>
            <p>
              This is needed in order to ensure the long term success and sustainability of the Astro Empires
              game, to the benefit of all players.
            </p>
            <p>
              This allows us to have fast and reliable servers, remove most game limits, and help us to
              improve this game.
            </p>
          </div>
        ),
      },
      {
        q: 'Which payment processors you are using?',
        a: (
          <div className="space-y-2">
            <p>We accept payments via debit/credit card and PayPal.</p>
            <p>It is also possible to pay via Wire Transfer or Western Union.</p>
          </div>
        ),
      },
      {
        q: 'What are the upgrade prices in US Dollars or other currencies?',
        a: (
          <div className="space-y-2">
            <p>
              To convert Euros into other currencies, please check on the internet, for example on this
              website: https://www.xe.com.
            </p>
          </div>
        ),
      },
      {
        q: 'Can I pay with U.S. Dollars instead of Euros?',
        a: (
          <div className="space-y-2">
            <p>
              When you pay via debit/credit card or Paypal the payments are converted automatically from your
              currency to Euros.
            </p>
          </div>
        ),
      },
      {
        q: 'I am having problem upgrading via Paypal, what can I do?',
        a: (
          <div className="space-y-2">
            <p>Try to contact Paypal directly if you are having problem with your credit card.</p>
            <p>
              If you are still unable to upgrade, you can pay by alternative ways such as debit/credit card,
              wire transfer or Western Union (available at most post offices).
            </p>
          </div>
        ),
      },
      {
        q: 'How long takes to I get my account upgraded after the payment?',
        a: (
          <div className="space-y-2">
            <p>
              If you pay using your credit card or PayPal account, the account upgrade takes place
              immediately after payment.
            </p>
            <p>If you pay via wire transfer the account upgrade takes about 1 or 2 business days.</p>
            <p>If you pay via Western Union the account upgrade takes about 1 or 2 business days.</p>
          </div>
        ),
      },
      {
        q: 'My account upgrade expiration date is not correct.',
        a: (
          <div className="space-y-2">
            <p>
              This is most probably because you understand a different date format, for example 05-10-2007,
              mean day 5 of October 2007, as this is the date format (day-month-year) used in most European
              Countries including Portugal where the game is established. In the US and other far-western
              countries, the date goes month-day-year.
            </p>
          </div>
        ),
      },
      {
        q: 'Are credit card payments charged recurringly?',
        a: (
          <div className="space-y-2">
            <p>The payments are one-time; they do not recur.</p>
          </div>
        ),
      },
      {
        q: 'Can I split upgrade time between game accounts?',
        a: (
          <div className="space-y-2">
            <p>No, it is not possible.</p>
          </div>
        ),
      },
      {
        q: 'How do I upgrade a friend’s game account?',
        a: (
          <div className="space-y-2">
            <p>
              Just go to that player profile page and click on «Upgrade this account» and follow the prompts
              to complete the upgrade process.
            </p>
          </div>
        ),
      },
      {
        q: 'Can I pay real money for in game credits?',
        a: (
          <div className="space-y-2">
            <p>No. ATT does not run such a system.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'game_account',
    title: 'Game Account',
    items: [
      {
        q: 'How can I change my account password or email?',
        a: (
          <div className="space-y-2">
            <p>
              Go to your game account page and click on «Profile», then at your profile page click on «Edit
              Profile».
            </p>
          </div>
        ),
      },
      {
        q: 'Can I share the one account with my brother and or friend?',
        a: (
          <div className="space-y-2">
            <p>No. Account sharing is explicitly forbidden in AE for it is seen as unfair.</p>
          </div>
        ),
      },
      {
        q: 'How can I delete my game account?',
        a: (
          <div className="space-y-2">
            <p>Go to your account page, and click on «Delete Account».</p>
          </div>
        ),
      },
      {
        q: 'Can I transfer upgrade time from one game account to other game account?',
        a: (
          <div className="space-y-2">
            <p>
              No, is not possible (the only exception is when you delete your account to restart on a new
              one, see below).
            </p>
          </div>
        ),
      },
      {
        q: 'I want to restart, how can I do that?',
        a: (
          <div className="space-y-2">
            <p>
              To restart your game account, go to your game account page, and there is a Restart Account
              option.
            </p>
            <p>
              If your account is above a certain level, it may not be possible to restart it directly. In
              this case, you will need to delete your game account and start a new one in the same server. If
              you have upgraded your account, you can contact the game's support with both account numbers
              (the deleted account and the new one) and request to transfer any remaining upgrade time
              between accounts.
            </p>
            <p>
              <strong>Important:</strong> Transfer upgrade time between accounts is only possible if you
              restart in the same server.
            </p>
          </div>
        ),
      },
      {
        q: 'Can I start over with my current technology/credits?',
        a: (
          <div className="space-y-2">
            <p>
              No. Is not possible to restart with your current credits or technology, you can only restart
              with a complete new account.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'recruiting_players',
    title: 'Recruiting Players',
    items: [
      {
        q: 'If I advertise this game to others, will I receive something?',
        a: (
          <div className="space-y-2">
            <p>
              If you give someone your recruit link (found in Account/Recruits) and they sign up for the game, they become your recruit.
            </p>
            <p>
              For each upgraded recruit you will receive a one-turn bonus of 10% of your total economy (up to a maximum of 100%). This bonus is awarded daily at 00:00 server time.
            </p>
            <p>
              Note: The 7-day trial upgrade does not count toward this bonus. The recruit must also join the same game server as your recruit-link account for you to receive the bonus.
            </p>
          </div>
        ),
      },
      {
        q: 'I have recruited a friend to game, but he/she is not displayed as my recruit.',
        a: (
          <div className="space-y-2">
            <p>
              A player must join the game by using your recruit link, and in the same server, for them to become your recruit.
            </p>
          </div>
        ),
      },
      {
        q: 'Can I request to an Attrition staff to change a player to be my recruit as I told him about the game?',
        a: (
          <div className="space-y-2">
            <p>
              No. They must join using your recruit link, otherwise they will not be your recruit.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'guilds',
    title: 'Guilds',
    items: [
      {
        q: 'What is a Guild?',
        a: (
          <div className="space-y-2">
            <p>
              A Guild is a group of players within the same organization, run by players themselves. It could be democratic, anarchistic, totalitarian, etc. Any player can join a guild for whatever reasons, and more simply a guild can just be a group of friends.
            </p>
            <p>
              Each guild is supposed to provide mutual protection for all guild members, and a place where they can draw support and assistance from the other players (guildees, as they are often referred to).
            </p>
          </div>
        ),
      },
      {
        q: 'How do I join a guild?',
        a: (
          <div className="space-y-2">
            <p>
              To join a guild, go to that guild’s profile and click «Request to join this guild».
            </p>
            <p>
              Your request must be accepted by a member of that guild with permission to accept new members.
            </p>
          </div>
        ),
      },
      {
        q: 'Do I have to be a certain level to join a guild?',
        a: (
          <div className="space-y-2">
            <p>
              There is no level requirement to apply to a guild. However, some guilds may set their own minimum thresholds.
            </p>
            <p>
              You cannot apply to join a guild if you are already in one.
            </p>
          </div>
        ),
      },
      {
        q: 'Is there any limit of number of members in a guild?',
        a: (
          <div className="space-y-2">
            <p>Guilds are limited to 50 members.</p>
          </div>
        ),
      },
      {
        q: 'What does the inactivity column mean at the guild page?',
        a: (
          <div className="space-y-2">
            <p>
              It shows how long it has been since each player last accessed that server.
            </p>
            <p>
              Example: an inactivity of “30 min” means they last accessed the game 30 minutes ago.
            </p>
          </div>
        ),
      },
      {
        q: 'When defending a guild members base, will his defenses and/or command centers assist you in defending?',
        a: (
          <div className="space-y-2">
            <p>
              Base defenses assist only the base owner, not other members of their guild. The same applies to command centers.
            </p>
          </div>
        ),
      },
      {
        q: 'How is a guild level calculated?',
        a: (
          <div className="space-y-2">
            <p>
              <strong>Guild Level</strong> = (Guild Economy × 100 + Guild Fleet + Avg. Guild Technology) ^ 0.25
            </p>
            <p>
              (The ^ symbol denotes an exponent; ^0.25 means to take the fourth root.)
            </p>
          </div>
        ),
      },
    ],
  },
{
  id: 'bases',
  title: 'Bases',
  items: [
    {
      q: 'How do I get more energy at my base?',
      a: (
        <div className="space-y-2">
          <p>
            To increase the amount of energy your base has, build energy facilities (usually known as power
            plants) such as solar plants, gas plants and fusion plants. These all increase the base energy.
            You can also build antimatter plants, which provide a large amount of energy compared to the
            other energy facilities.
          </p>
        </div>
      ),
    },
    {
      q: 'Why cannot I build anything?',
      a: (
        <div className="space-y-2">
          <p>
            If you cannot build anything, then you are either out of population, energy or land. To increase
            population build more Urban Centers and Orbital Bases; for energy build different plants and for
            land build Terraforms and Multi-Level Platforms.
          </p>
        </div>
      ),
    },
    {
      q: 'I do not see the structure Crystal Mines on my building screen. Why is that so?',
      a: (
        <div className="space-y-2">
          <p>
            Your planet does not have any crystals on it (only Crystallines, Asteroids, Craters, and
            Metallics do).
          </p>
        </div>
      ),
    },
    {
      q: 'If I make a Biosphere Modification, does it affect the Urban Structure I already have?',
      a: (
        <div className="space-y-2">
          <p>It gives you the bonus for every Urban Structure you already have.</p>
        </div>
      ),
    },
    {
      q: 'How can I decrease a level of my building?',
      a: (
        <div className="space-y-2">
          <p>
            To decrease your buildings you need to click on the name of the building on your construction
            screen. You will then be given a list of the costs to build each level and an option to disband
            one level, you will get 50% of the cost back as a discount in the price of your next base.
          </p>
        </div>
      ),
    },
    {
      q: 'I disbanded a base but did not receive any credits.',
      a: (
        <div className="space-y-2">
          <p>
            You do not receive credits for disbanding bases; instead, the credits go into a discount which
            is taken away from the cost of your next base. You can view this discount in your game Account
            page.
          </p>
        </div>
      ),
    },
    {
      q: 'I downgraded a structure/defense base but did not receive any credits.',
      a: (
        <div className="space-y-2">
          <p>
            Works just like the above (I disbanded a base did not receive any credits).
          </p>
        </div>
      ),
    },
    {
      q: 'Can I disband my home planet?',
      a: (
        <div className="space-y-2">
          <p>
            Yes, it is no different than disbanding any other base, however you must have always at least
            one base.
          </p>
        </div>
      ),
    },
    {
      q: "Why don't my construction or other events update? They keep showing the -",
      a: (
        <div className="space-y-2">
          <p>
            When the server is too busy, the game events (construction, production, research, fleets arrive,
            etc..) can take some time to update.
          </p>
          <p>
            This also occurs after a server downtime, but all will be back to normal in seconds or minutes.
          </p>
        </div>
      ),
    },
    {
      q: 'Why do my game events (constructions etc..) keep restarting their times?',
      a: (
        <div className="space-y-2">
          <p>
            Probably you are seeing an old page saved in your browser cache, which is not updated, try to
            select on your browser options to always load the web pages instead of display pages saved in
            your browser cache.
          </p>
        </div>
      ),
    },
    {
      q: 'Why I cannot see my bases or fleets on the galaxy map?',
      a: (
        <div className="space-y-2">
          <p>
            Check if you are seeing the galaxy where you have your bases/fleets, if not change the galaxy
            you want to see.
          </p>
          <p>
            If this is not the problem, check your browser options to see if the JavaScript is active.
          </p>
        </div>
      ),
    },
    {
      q: 'Do I get the same credits disbanding the base at once, or I should downgrade the buildings before disbanding?',
      a: (
        <div className="space-y-2">
          <p>
            You will get the same amount of credits (in discount on the next base construction) in both
            ways, so the first is recommended for convenience.
          </p>
        </div>
      ),
    },
  ],
},
  {
    id: 'colonization',
    title: 'Colonization',
    items: [
      {
        q: 'How much do bases cost?',
        a: (
          <div className="space-y-2">
            <p>Every base you build will cost more than the previous base.</p>
            <p>
              <strong>New bases cost:</strong> 100, 200, 500, 1k, 2k, 5k, 10k, 20k, 50k, 100k, 200k, 400k,
              650k, 1M, 1.5M, 2.5M, 4M, 6.5M, 10M, 15M, 25M, 40M, 65M, 100M, 150M, 250M, 400M, 650M, ...
            </p>
            <p>
              However, if you delete one of your bases the next one will cost <strong>25%</strong> of the
              cost it would have.
            </p>
          </div>
        ),
      },
      {
        q: 'What decides a good planet to colonize from a bad planet?',
        a: (
          <div className="space-y-2">
            <p>
              This depends on what you want the astro to do: fleet production, boosting your economy,
              research, etc.
            </p>
            <p>
              For <strong>economy</strong>, aim for either an <strong>Asteroid</strong> or a{' '}
              <strong>Crystalline</strong> (though Crystallines are rarer).
            </p>
            <p>
              For <strong>production</strong>, <strong>Rockies</strong> are the best, with{' '}
              <strong>Metallics</strong> and <strong>Craters</strong> also filling this role well.
            </p>
            <p>
              For <strong>research</strong>, <strong>Gaia</strong>, <strong>Earthly</strong>, or{' '}
              <strong>Arid</strong> are usually preferred due to large area and high fertility, though they
              suit most tasks well.
            </p>
          </div>
        ),
      },
      {
        q: 'How can I build another base on an empty planet?',
        a: (
          <div className="space-y-2">
            <p>Build an <strong>Outpost Ship</strong>.</p>
            <p>
              Move the Outpost Ship to the desired location (escorting it with other ships is recommended).
            </p>
            <p>
              Go into the fleet with the Outpost Ship and click «Build base».
            </p>
          </div>
        ),
      },
      {
        q: 'Do I lose my Outpost Ship when I build a new base?',
        a: (
          <div className="space-y-2">
            <p>Yes. An Outpost Ship is only usable to build one base.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'trade',
    title: 'Trade',
    items: [
      {
        q: 'How do I get more trade routes?',
        a: (
          <div className="space-y-2">
            <p>
              You get more trade routes by building <strong>Spaceports</strong>. Spaceports increase the
              available number of trades for a base by one at levels <strong>1, 5, 10, 15, 20</strong> and
              so on.
            </p>
            <p>Each Spaceport also increases your base economy by <strong>2 credits/hour</strong>.</p>
          </div>
        ),
      },
      {
        q: 'How is a trade income calculated?',
        a: (
          <div className="space-y-2">
            <p>
              <strong>Trade Income</strong> = Sqrt(Lowest base's income) × [ 1 + Sqrt(2 × Distance)/75 +
              Sqrt(Players)/10 ]
            </p>
            <p>
              <strong>Players</strong> = number of different players you trade with.
            </p>
          </div>
        ),
      },
      {
        q: 'Can I trade with myself?',
        a: (
          <div className="space-y-2">
            <p>
              Yes. There is no real disadvantage other than you only count as one trading partner.
            </p>
            <p>
              When you trade with yourself you get twice the value for the trade route, but it occupies two
              slots (one on each base).
            </p>
          </div>
        ),
      },
      {
        q: 'How do I boost the income from trade routes?',
        a: (
          <div className="space-y-2">
            <p>These are the main ways to increase trade income:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Increase the economy of the bases involved in the trade route.</li>
              <li>Increase the distance between the bases.</li>
              <li>Increase the total number of different players you trade with.</li>
            </ul>
          </div>
        ),
      },
      {
        q: 'How can I plunder trade routes?',
        a: (
          <div className="space-y-2">
            <p>
              Access your fleet and click on the <strong>Piracy</strong> option. Your fleet must be stationed
              at the targeted base, and there must be no opposing fleets present — including the base owner,
              their guild members, or fleets belonging to the owner of the trade route’s destination base.
            </p>
            <p>Base defenses alone will not prevent plundering of trade routes.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'fleets',
    title: 'Fleets',
    items: [
      {
        q: 'How do I build fleets?',
        a: (
          <div className="space-y-2">
            <p>
              To build fleets (ships) at a base, there must be at least one level of <strong>Shipyards</strong>, and you must have researched at least one level of the <strong>Laser</strong> technology. This allows you to build Fighters, the cheapest ship.
            </p>
            <p>
              More expensive and stronger ships require higher Shipyard levels and additional technologies to be produced.
            </p>
          </div>
        ),
      },
      {
        q: 'I have the tech researched for a ship but cannot build it! Why not?',
        a: (
          <div className="space-y-2">
            <p>
              You likely do not meet the <strong>Shipyard level requirements</strong> for that ship at the current base. Ensure the base’s Shipyards are at or above the required level.
            </p>
          </div>
        ),
      },
      {
        q: 'What does fleet size mean?',
        a: (
          <div className="space-y-2">
            <p>
              The «fleet size» is the total cost in credits of every ship in the fleet added together.
            </p>
            <p>
              Example: 500 Fighters (cost 5 credits each) have a fleet size of 2,500.
            </p>
          </div>
        ),
      },
      {
        q: 'How do I move my fleets?',
        a: (
          <div className="space-y-2">
            <p>
              Once you have ships capable of moving on their own (<strong>Corvettes</strong> are the first), go to <strong>Fleets</strong>, click the fleet, enter valid coordinates, choose amounts to move, then click «Move».
            </p>
          </div>
        ),
      },
      {
        q: 'How do I move fighters from base to base?',
        a: (
          <div className="space-y-2">
            <p>
              Hangar-requiring ships (Fighters, Bombers, Heavy Bombers, Ion Bombers) must move along with ships that have hangar capacity (e.g., Carriers). There is a limit to how many hangar units can be carried.
            </p>
            <p>
              Example: A Carrier with hangar 60 can carry up to 60 Fighters/Bombers, or 30 Heavy Bombers/Ion Bombers.
            </p>
            <p>
              To move them, specify how many to move with the carrier. You can also click the «Hangar» link to move the maximum number possible.
            </p>
          </div>
        ),
      },
      {
        q: 'How do I use jump gates?',
        a: (
          <div className="space-y-2">
            <p>
              To use one of your (or your guildmate’s) jump gates, place the fleet at the astro with the jump gate and send the fleet somewhere — the game will automatically use the gate when applicable.
            </p>
          </div>
        ),
      },
      {
        q: 'Can I redirect my fleets in transit?',
        a: (
          <div className="space-y-2">
            <p>
              No. Once a fleet is in transit, you can either let it continue to its destination or recall it to its origin.
            </p>
          </div>
        ),
      },
      {
        q: 'If one of my bases is occupied, can I build fleet there and can I move that fleet?',
        a: (
          <div className="space-y-2">
            <p>
              Yes. You can build and move fleet from an occupied base. This allows you to fight back and potentially free the base.
            </p>
            <p>
              Note: While occupied, the base’s economy is cut by <strong>1/3</strong>, and construction, production, and research capacities are reduced by <strong>30%</strong>.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'commanders',
    title: 'Commanders',
    items: [
      {
        q: 'How are names determined for Commanders when you recruit them?',
        a: (
          <div className="space-y-2">
            <p>All names are randomly generated, but you can rename your Commanders.</p>
          </div>
        ),
      },
      {
        q: 'I have a commander at a base but it has no effect, why is this?',
        a: (
          <div className="space-y-2">
            <p>
              You must assign commanders to be Base Commander of a base in order for their effect to take place.
            </p>
          </div>
        ),
      },
      {
        q: 'What exactly does dismissing commanders do?',
        a: (
          <div className="space-y-2">
            <p>
              It is similar to demolishing structures or decommissioning fleet; you do not gain any of your
              credits or XP back.
            </p>
          </div>
        ),
      },
      {
        q: 'Do commanders use jump gates?',
        a: (
          <div className="space-y-2">
            <p>
              When moving a commander to another base, they will use a jump gate if there is one available.
            </p>
            <p>Note that you must de-assign a commander before moving them.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'attacks_on_bases',
    title: 'Attacks on Bases',
    items: [
      {
        q: 'What happens to my base if someone attacks it?',
        a: (
          <div className="space-y-2">
            <p>
              If your base is attacked, the <strong>structures</strong> will suffer no damage.
            </p>
            <p>
              Your base <strong>defences</strong> and any <strong>fleet</strong> you have at that base will
              attempt to protect your base. Fleets can be destroyed; defences cannot be destroyed but can be
              damaged.
            </p>
            <p>
              If the attack is successful and they occupy your base, they receive <strong>30%</strong> of your
              base income each hour. You still have full control over the base.
            </p>
          </div>
        ),
      },
      {
        q: 'How is pillage calculated?',
        a: (
          <div className="space-y-2">
            <p>
              <strong>At a player’s base:</strong> (number of hours since last pillage; max 100)% × (Base
              Economy / Total Bases Economy) × Base Owner Credits
            </p>
            <p>
              <strong>At an NPC base:</strong> (number of hours since last pillage; max 100)% × Base Economy ×
              16
            </p>
            <p>
              <strong>Additional Pillage bonus:</strong> (base actual income − new income)<sup>2</sup> × 5
            </p>
          </div>
        ),
      },
      {
        q: 'How is experience calculated?',
        a: (
          <div className="space-y-2">
            <p>
              <strong>If the enemy level is above your level:</strong>
              <br />
              XP = (enemy / your level) / 20 × Total Fleet destroyed
              <br />
              (max: 10% × Total Fleet destroyed)
            </p>
            <p>
              <strong>If your level is above the enemy level:</strong>
              <br />
              XP = (enemy / your level)<sup>2</sup> / 20 × Total Fleet destroyed
            </p>
            <p>
              <strong>Combat with NPCs:</strong>
              <br />
              XP = 5% × Total Fleet destroyed
            </p>
          </div>
        ),
      },
      {
        q: 'After occupation ends, how does a base get back the economy it lost?',
        a: (
          <div className="space-y-2">
            <p>It recovers 1 economy per 8 hours until it reaches the normal economy.</p>
          </div>
        ),
      },
      {
        q: 'How can I repair my defenses?',
        a: (
          <div className="space-y-2">
            <p>
              They repair themselves automatically by <strong>1% per hour</strong>, but they do not repair
              while the base is occupied.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'recyclers',
    title: 'Recyclers',
    items: [
      {
        q: 'How to use Recyclers?',
        a: (
          <div className="space-y-2">
            <p>
              Deploy your Recyclers to an astro with <strong>debris</strong> present. Each Recycler will automatically collect <strong>10 credits</strong> from the debris field at <strong>xx:30</strong> every hour.
            </p>
          </div>
        ),
      },
      {
        q: 'How much debris is left after a unit has been destroyed?',
        a: (
          <div className="space-y-2">
            <p>
              If ships are destroyed during an attack, <strong>40%</strong> of the cost of the units destroyed is converted into debris, which remains at the location of the attack.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'players',
    title: 'Players',
    items: [
      {
        q: 'How is a player level calculated?',
        a: (
          <div className="space-y-2">
            <p>
              <strong>Player Level</strong> = (Economy × 100 + Fleet + Technology) ^ 0.25
            </p>
            <p>(The ^ symbol denotes an exponent; ^0.25 means to take the 4th root.)</p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'server_npcs',
    title: 'Server NPCs',
    items: [
      {
        q: 'What is U.C. base stability?',
        a: (
          <div className="space-y-2">
            <p>
              United Colonies bases lose <strong>3%</strong> stability every day at <strong>00:00</strong> server time.
            </p>
            <p>
              Once base stability reaches 0%, the base disbands (this can take a few minutes).
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'inactivity',
    title: 'Inactivity',
    items: [
      {
        q: 'What will happen to my bases and fleets if I do not login regularly?',
        a: (
          <div className="space-y-2">
            <p>
              If a player does not log in for <strong>4 days</strong>, that player stops receiving income from bases until they log in again.
            </p>
            <p>
              When a <strong>free</strong> player profile is marked as inactive, their bases' stability begins at 100% and degrades by <strong>3% daily</strong>. Once stability reaches zero, the account will be deleted soon after. If the player logs in during this period, the bases' stability is restored to 100%.
            </p>
            <p>
              Deleting an account includes deletion of all things related to the account, including player bases, fleets, credits, etc.
            </p>
          </div>
        ),
      },
      {
        q: 'How long does a player need to be inactive before this shows up in his profile?',
        a: (
          <div className="space-y-2">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Accounts under 80 days old:</strong> Inactivity appears when it exceeds half the account's age (minimum of 10 days of inactivity).
              </li>
              <li>
                <strong>Accounts 80 days or older:</strong> Inactivity appears after 40 days of inactivity.
              </li>
            </ul>
          </div>
        ),
      },
    ],
  },
  {
    id: 'others',
    title: 'Others',
    items: [
      {
        q: 'Can a friend account sit for me?',
        a: (
          <div className="space-y-2">
            <p>No. With the advent of Vacation Mode, Account Sitting is no longer allowed in the game.</p>
          </div>
        ),
      },
      {
        q: 'How do I report a game exploit?',
        a: (
          <div className="space-y-2">
            <p>
              Please contact us directly regarding that — see the contact page for how to reach us.
            </p>
            <p>
              Important: Never share a game exploit with anyone. Always send us all related information about
              it directly.
            </p>
          </div>
        ),
      },
      {
        q: 'Where can I make suggestions to improve the game?',
        a: (
          <div className="space-y-2">
            <p>
              You can post ideas and suggestions in the game forum under the Feature Requests section. Feel
              free to discuss them with other players. Note that while staff regularly read these topics, they
              may not always have time to reply.
            </p>
          </div>
        ),
      },
      {
        q: 'How do I report a player cheating?',
        a: (
          <div className="space-y-2">
            <p>
              Please contact us directly with all the information you have — see the contact page for details.
            </p>
          </div>
        ),
      },
      {
        q: 'What is Server Time?',
        a: (
          <div className="space-y-2">
            <p>
              Server time is set to <strong>GMT+1</strong>. Battles, payments, and all times in the game are
              recorded in server time. There is also a clock at the top centre of the screen that shows
              server time.
            </p>
          </div>
        ),
      },
      {
        q: "What does the '-' at the time counter mean?",
        a: (
          <div className="space-y-2">
            <p>
              It means the client-side timer reached zero. Refresh the page to load updated data. If after
              refresh the counter is still '-', the server has not yet processed the event (can happen when
              the server is busy).
            </p>
          </div>
        ),
      },
      {
        q: 'When do new galaxies / servers get added?',
        a: (
          <div className="space-y-2">
            <p>
              New galaxies are added occasionally in batches of 10 when the universe gets too crowded. New
              servers are added about every six months.
            </p>
          </div>
        ),
      },
      {
        q: 'I have the same value in one category of the ranks as another player, how are ranks sorted in this case?',
        a: (
          <div className="space-y-2">
            <p>
              When more than one player or guild has the same value in the ranks, the ordering favors the
              player/guild with the lower account number (appears on top).
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: 'shared_ips',
    title: 'Shared IPs',
    items: [
      {
        q: 'Why did I get a warning claiming that I was using a shared IP?',
        a: (
          <div className="space-y-2">
            <p>
              It means one or more Astro Empires accounts are connecting to the internet with the same public
              IP address as you.
            </p>
          </div>
        ),
      },
      {
        q: 'Does this mean AE thinks I am cheating?',
        a: (
          <div className="space-y-2">
            <p>
              No. It does not mean you are cheating or have a second account — only that your IP is shared
              with other Astro Empires account(s).
            </p>
          </div>
        ),
      },
      {
        q: 'Why does Astro Empires have rules about shared IPs?',
        a: (
          <div className="space-y-2">
            <p>
              We prohibit shared IP usage for free accounts and limit some interactions to help prevent
              cheating and second accounts. This helps keep the game fair for all players.
            </p>
          </div>
        ),
      },
      {
        q: 'Why am I being accused of using a shared IP? I do not think I am using one.',
        a: (
          <div className="space-y-2">
            <p>If you are unsure, possible reasons include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Someone else at your home also plays.</li>
              <li>
                You log in from a public or shared network (school, work, library, cybercafe, hotel, airport,
                LAN party, etc.), and someone there plays as well.
              </li>
              <li>You are using a public proxy server.</li>
              <li>
                You logged in at a friend’s house or allowed a friend to log in from yours. Even once can
                appear in our system — do not do it again and it will not be a problem.
              </li>
              <li>Your ISP uses shared IPs for some clients.</li>
              <li>You are accessing from a mobile connection.</li>
            </ul>
          </div>
        ),
      },
      {
        q: 'What can I do if I am caught using a shared IP?',
        a: (
          <div className="space-y-2">
            <p>
              You must either use a unique IP address or follow the shared IP rules:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Your account must be upgraded (the first 7 days trial period does not count).</li>
              <li>
                You are forbidden to attack, occupy bases, or take debris from players with the same IP.
              </li>
              <li>
                You are forbidden to make joint attacks on bases with accounts with the same IP (e.g., one or
                more accounts attacking and another occupying the base or collecting the debris).
              </li>
              <li>
                You are forbidden to transfer occupied bases to other players with the same IP.
              </li>
            </ol>
            <p>
              If you are playing with a friend on the same network and cannot comply with the rules above,
              one of you must delete your account so the other can continue.
            </p>
            <p>
              If you only received an initial warning, simply stop using shared IPs — your account will not be
              deleted.
            </p>
          </div>
        ),
      },
      {
        q: 'My account was suspended while I was absent from the game, what can I do now?',
        a: (
          <div className="space-y-2">
            <p>
              If your account is upgraded, contact us with your account number. If your account is free, you
              will be required to upgrade to reactivate it. Do not delay or your account might be deleted.
            </p>
          </div>
        ),
      },
      {
        q: 'What if I do not want or cannot afford to upgrade my account? Can I still use a shared IP?',
        a: (
          <div className="space-y-2">
            <p>
              Rules apply equally to all players; we cannot make exceptions. If you do not want or cannot
              upgrade, you cannot use shared IPs.
            </p>
          </div>
        ),
      },
      {
        q: 'Is there any way to use the same IP for two accounts without having to upgrade my account?',
        a: (
          <div className="space-y-2">
            <p>
              Yes. You may play one account on one game server and the other on a different server. Shared IPs
              are not allowed within the same server, but you can use the same IP across different servers (one
              account per server).
            </p>
          </div>
        ),
      },
      {
        q: 'I already upgraded my account, why were others using the same IP suspended?',
        a: (
          <div className="space-y-2">
            <p>
              Other players using the same IP must also upgrade their own accounts or they will be suspended.
            </p>
          </div>
        ),
      },
      {
        q: 'How does this IP address thing work? I do not think anyone is using my IP.',
        a: (
          <div className="space-y-2">
            <p>
              In private local networks (e.g., school or office), multiple devices share the same public IP,
              so different computers can appear as the same address.
            </p>
            <p>
              Many ISPs use <strong>dynamic IPs</strong>, meaning your IP can change over time and may have
              been used recently by someone else.
            </p>
            <p>
              Some ISPs use <strong>carrier-grade NAT</strong> where several customers share one IP
              simultaneously (common with mobile and satellite connections).
            </p>
          </div>
        ),
      },
      {
        q: 'If I stop using a shared IP do I still need to upgrade my account?',
        a: (
          <div className="space-y-2">
            <p>
              No. If you stop using a shared IP after the first warnings, you do not need to upgrade. If your
              account is already suspended, you will need to upgrade to reactivate it.
            </p>
          </div>
        ),
      },
      {
        q: 'Can I know which accounts are sharing the same IP as me?',
        a: (
          <div className="space-y-2">
            <p>
              No. Due to privacy laws we cannot share that information. The other person(s) may not want you
              to know they are also playing from the same location.
            </p>
          </div>
        ),
      },
    ],
  },
];
