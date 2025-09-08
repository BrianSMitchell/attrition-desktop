import React from 'react';

export type HelpTopicId =
  | 'introduction'
  | 'map'
  | 'coordinates'
  | 'credits'
  | 'bases'
  | 'technologies'
  | 'trade'
  | 'fleets'
  | 'attacks'
  | 'combat'
  | 'experience'
  | 'newbies'
  | 'empire'
  | 'guild'
  | 'commanders'
  | 'upgrading'
  | 'vacation_mode'
  | 'others'
  | 'starting_guide'
  | 'occupied_guide'
  | 'dictionary';

export interface HelpTopic {
  id: HelpTopicId;
  title: string;
  content: React.ReactNode;
  group?: 'main' | 'footer';
}


export const helpTopics: HelpTopic[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    content: (
      <div className="space-y-4">
        <p>
          Attrition is a massively multiplayer online game of space strategy. Build bases, expand your
          influence, research new technologies, command fleets, wage battles, form alliances, and grow a powerful
          interstellar empire.
        </p>
        <p>
          Each player starts from a single astro and can expand into a full‑fledged empire from there. Use the left
          navigation to explore specific topics. The FAQ and assistant tools can be added later as separate tabs if
          desired.
        </p>
      </div>
    ),
  },
  {
    id: 'map',
    title: 'Map',
    content: (
      <div className="space-y-4">
        <p>
          Each server on Attrition has many galaxies. Each galaxy has hundreds of stars and thousands of planets and
          asteroids. No two galaxies are the same; each is different from the others.
        </p>
        <p>
          A galaxy is divided into 100 square regions, laid out in a 10 x 10 grid. Each region can contain stars; some
          regions have several dozen stars, while others only have a few (and sometimes none at all).
        </p>
        <p>
          Each star on the map represents a solar system, which can have several astros (a term used to refer to
          planets and other objects that orbit stars). Most astros can support bases, which allow a player to expand
          their empire. Only one base can be on any given astro, but bases can be expanded and improved by building
          various structures. All astros have certain common characteristics, such as terrain type, construction area,
          solar energy, fertility and various resources (namely metal, gas, and crystals).
        </p>
        <p>
          A player can only see detailed information about bases or fleets owned by other players if they have a base or
          fleet somewhere in that region of space, or if one of their guild members has a base or fleet in that star
          system.
        </p>

        <h3 className="text-lg font-semibold">Wormholes</h3>
        <p>A wormhole is a portal that creates a shortcut, allowing for fast travel.</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            In each galaxy, there are 2 randomly placed wormholes with fixed positions. Being one located centrally
            (regions 44/45/54/55) and other placed in the outer regions.
          </li>
          <li>
            Players can use the wormholes to travel to any location with a speed boost. By using wormholes, stellar
            units can travel to other galaxies. Death Stars are not able to use wormholes.
          </li>
          <li>
            Wormholes provide a speed factor of 1+0.5*n, where n is the floor(average of the top 5 server Jump Gates).
            For example, if the average top 5 Jump Gates is level 2, then the Wormhole speed factor becomes
            1+0.5*2=2, meaning the fleet will move 2x the normal speed.
          </li>
          <li>
            In newly opened galaxy clusters, the wormholes speed bonus depend on that cluster's Jump Gates until fleets
            can move from older to new clusters, then all server Jump Gates count.
          </li>
          <li>
            To use a wormhole, the player must place the desired fleet at the location of the wormhole and select the
            option 'Use Wormhole' to use it.
          </li>
          <li>It's not possible to build bases at wormhole locations</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'coordinates',
    title: 'Coordinates',
    content: (
      <div className="space-y-4">
        <p>
          Attrition uses a specialized coordinate system to denote locations, as detailed below (all numbers are separated by colons):
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            First, the galaxy coordinate is designated by the initial of whatever server is being viewed followed by a number representing the specific galaxy on that server. For example, in server Alpha, the first galaxy is represented by A00.
          </li>
          <li>
            Next, the region coordinate is designated by what row and column of the galaxy it is in. For example, the region in row 5 and the column of 1 is represented by the number 51, for a region address of A00:51.
          </li>
          <li>
            Third, the system coordinate is designated by what row and column of the region it is in, in the same manner as the region coordinate. So a system in the top-right corner of the region would be represented by the number 09, for a system address of A00:51:09.
          </li>
          <li>
            Fourth, the astro coordinate is designated by the star orbit number. Thus, the first planet for the above system would have an astro address of A00:51:09:01. A star can upwards of 20 astros.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'credits',
    title: 'Credits',
    content: (
      <div className="space-y-4">
        <p>
          Credits are the monetary unit used in Attrition, and are the basis of the game's economy. Credits are used to build structures and defenses on bases, to set up trade routes, to produce fleet (ships), and to invest in researching new technologies.
        </p>
        <p>
          Credits are received every hour on the hour, based on the total economy of a player's empire. There are three main methods of increasing the amount of credits gained: building structures to improve an individual base's economy, establishing trade routes between bases, and occupying the bases of another player's. In addition, a player can also gain more credits by recycling debris left at an astro after ships are destroyed, plundering trade routes, and by pillaging bases that have been conquered, or by scrapping ships or base structures that have been previously built.
        </p>
        <p>
          The main goal of Attrition is to optimize the resources at each base so as to efficiently improve them and use them to expand one's empire, by conquering other bases or by building new bases, and thus to increase one's credit income. Diplomacy and treaties as Alliances and Mutual Defense Pacts are good ways to achieve this objective.
        </p>
      </div>
    ),
  },
  {
    id: 'bases',
    title: 'Bases',
    content: (
      <div className="space-y-4">
        <p>
          Having a base on a planet means that a player owns that planet, and can use it to build various structures, most of which boost the base's ability to construct new buildings, produce new ships, and research new technologies, and many of which improve its economy, thus boosting the player's credit income.
        </p>
        <p>
          Player can build defensive structures at bases to protect the base, shipyards to produce starships, and research labs to research technologies, beside others structures.
        </p>
        <p>
          All structures cost a certain amount of credits, which directly affects how long it takes the structure to be built, and require a certain amount of energy as well. Most structures require one 'area' on the planet and one 'population' unit for each level, although there are some exceptions; for example, Urban Structures do not require a population unit, and Terraforming and Orbital Bases require neither area nor population.
        </p>
        <p>
          Defenses are a special kind of structure that automatically help to protect a base from other players who attack it, and also protect that player's ships in orbit around the base. However, defenses will not protect the fleets of guild members who might be in orbit around that base.
        </p>
        <p>
          To determine how long it will take a base to construct a new structure, divide the credit cost of the structure by the base's construction rating (which is measured in a number of credits that can be spent per hour); for example, a new base can construct buildings at the rate of 12 credits per hour, and a metal refinery initially costs 1 credit. Thus, it takes 1/12 of an hour to build the metal refinery, or 5 minutes.
        </p>
        <p>
          Fleet (ships) can only be produced at bases which have shipyards at them. Like structures, ships have a credit cost and will require a certain amount of time to build (determined by the base's production rating, again measured in a number of credits that can be spent each hour). In addition, most ships require multiple shipyards to be built, and all ships have technological requirements that must be met in order to be built at all.
        </p>
        <p>
          Likewise, technologies can only be researched at bases which have built research labs. As might be expected, they have a cost in credits and take a certain amount of time to research (this time determined by the base's research rating).
        </p>
        <p>
          The only way to build new bases is to construct outpost ships and send them to empty planets. Thus, it is important to scout potential base locations first, to ensure that a player does not waste time by sending an outpost ship to a planet which already has a base or by building a base on a bad planet. Once a base is constructed, it can be managed in the same manner as a player's existing bases.
        </p>
        <p>
          A player can also conquer other players' bases, which are then occupied by the conquering player. However, this does not allow the conqueror to control the occupied base; instead, they receive 30% of the base's income. The base also suffers an additional 30% reduction to its construction and research ratings, and a 30% reduction to its production rating.
        </p>
      </div>
    ),
  },
  {
    id: 'technologies',
    title: 'Technologies',
    content: (
      <div className="space-y-4">
        <p>
          Researching new technologies primarily increase the capacities of a player's ships and bases.
        </p>
        <p>
          They also unlock new structures and starships that can be built, and grant access to more advanced technologies to further develop your empire.
        </p>
        <p>
          You can only research technologies at bases with research labs on them. Nearly all technologies require multiple research labs.
        </p>
      </div>
    ),
  },
  {
    id: 'trade',
    title: 'Trade',
    content: (
      <div className="space-y-4">
        <p>
          Once a base has at least one spaceport built, it can start a trade route with another base.
        </p>
        <p>
          The setting cost of a trade route is equal to 2 times the distance between the two bases. For example, a trade route from a base located in A00:49:10 to a base located in A00:59:10 will cost 20 credits, since they are 10 lightyears apart.
        </p>
        <p>
          If a trade route is set between 2 different players, both players pay half the trade route cost.
        </p>
        <p>
          A trade route will provide income to a base, equivalent to:
        </p>
        <p>
          Trade Income = Sqrt(Lowest base's income) x [ 1 + Sqrt(2*Distance)/75 + Sqrt(Players)/10 ]
        </p>
        <p>
          Where Players is the number of players involved in your trade network.
        </p>
        <p>
          A base can have one trade route for each 5 levels of spaceports - 1 route at level 1, another at level 5, another at level 10, etc.
        </p>
        <p>
          Trade routes can be plundered by other players, which terminates the trade route and gives a profit to the plunderer, equal to the trade route's cost.
        </p>
        <h3 className="text-lg font-semibold">Closing trade routes</h3>
        <p>
          When a trade route is canceled, each trading partner receives a 50% refund. The route then enters a "Closing" status for 12 hours if under 1000 distance, or 24 hours if longer. Pillaging a base yields 50% of the cost of any closing trade routes, which are then terminated.
        </p>
      </div>
    ),
  },
  {
    id: 'fleets',
    title: 'Fleets',
    content: (
      <div className="space-y-4">
        <p>
          The main way which players can attack other players is through using fleets, and can also be used to defend against another player's attack. You build ships at shipyards, a fleet being a group of ships. A fleet can be used to protect a base, or attack another player's fleets or bases.
        </p>
        <p>Fleets can be moved to other astros.</p>
        <p>
          Fleets from several players can be moved to the same location. If a player has two or more fleets headed to the same astro, they will automatically merge once both have arrived at the planet. No fleet will automatically attack any other fleet unless directed to by the player who owns it. The only way to launch an attack is to select the fleet number, select 'Attack' from the menu, then choose the target of the attack.
        </p>

        <h3 className="text-lg font-semibold">Detection time</h3>
        <p>
          Fleets from players outside your guild, can only be detected, once it is a certain arriving time from its destination, the detection time is given by the following formula:
        </p>
        <p>
          Detection time (hrs) = 24*((-200000/((Size*1.6*0.9^Stealth tech)+200000))+1) + 1/120
        </p>

        <h3 className="text-lg font-semibold">Fleet Limit</h3>
        <p>
          Fleets are limited by the player's industrial capability to support them. The maximum total size of a player's fleet is based on their total production capacity, including any commander bonuses.
        </p>
        <p>Maximum Supported Fleet Size = Total Production * 2500</p>
        <p>
          Once the total fleet size reaches this maximum limit, it is no longer possible to produce new units unless the production capacity is increased.
        </p>
      </div>
    ),
  },
  {
    id: 'attacks',
    title: 'Attacks',
    content: (
      <div className="space-y-4">
        <p>
          A successful attack on a base does two things. First, it allows the attacking player to occupy the base, transferring 30% of the base's credit income to the occupier. This represents a tribute from the conquered base to the occupier. No structures can be destroyed by an attack, although base defenses have a percentage rating which represents how effective they are. Base defenses are automatically set at 0% once a base is occupied, and will automatically regenerate by 1% every hour after an occupation ends.
        </p>
        <p>
          Second, a successful attack will also give the attacker a percentage of the defending player's credits, due to the attacking ships ransacking the resources and materials (represented by credits) stored there. The actual amount is determined by the following formula:
        </p>
        <p>
          Pillage = (number of hours since last pillage; max 100)% * (Base Economy/Total Bases Economy) * Base Owner Credits.
        </p>
        <p>In NPC bases: Pillage = number of hours since last pillage (max 100)% * Base Economy * 16</p>
        <p>Also an additional pillage bonus is given</p>
        <p>Additional Pillage bonus: (base actual income - new income)^2 * 5</p>
        <p>
          No base can be pillaged more than once every 24 hours, however. Additional attacks launched during this time will result in the base being occupied, but will not give additional credits from pillaging.
        </p>
        <p>
          An occupied base has 30% less construction, production and research capacity. This makes any tasks performed at the base take longer.
        </p>
        <p>
          If ships are destroyed during an attack, 20% of the cost of the units destroyed will be given to each player as combat loot, and 40% will be converted into debris which will remain at the location of the attack. A player can collect those debris by sending recyclers to that astro, recyclers will work automatically, converting debris into credits every hour.
        </p>
        <p>
          The combat loot can be collected in the game credits page. Uncollected loot is automatically credited to the player's account after 24 hours.
        </p>

        <h3 className="text-lg font-semibold">Unrest</h3>
        <p>
          Bases that are occupied or have being occupied or pillaged in the last 24 hours, increases unrest by 10% each day.
        </p>
        <p>
          However, if a base has not been occupied or pillaged in the last 24 hours, its unrest level decreases by 10% each day, down to a minimum of 0%.
        </p>
        <p>
          When unrest reaches 100% the base owner will have an Revolt button that will free the base from occupation.
        </p>
        <p>
          It's important to note that the enemy fleet remains present at the base but cannot occupy it. However, they can still attack your fleet if you have any located at the base.
        </p>
        <p>
          While a base's unrest level is at 50% or higher, it can’t get a new occupation (but the base and fleet can still be attacked, but a successful attack on the base will not result in pillaging). Additionally, if the base's unrest level is at 50% or higher and there are fleets present that do not belong to the base owner or their guild, the Jump Gates of the base are disabled.
        </p>
        <p>
          When a base's unrest level decreases from 50% to 40%, all of its defenses are fully restored. At this point, the base becomes open to occupation again, and its Jump Gates can be used.
        </p>
      </div>
    ),
  },
  {
    id: 'combat',
    title: 'Combat',
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Combat basics</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Attack = The amount of damage a unit deals.</li>
          <li>Armour = The amount of damage a unit can receive before being killed.</li>
          <li>
            Shielding = The shielding of a unit prevents damage equal to itself from each shot of enemy fire.
          </li>
        </ul>
        <p>
          (Note: 1% of the attack always cross the shields, except Ion Bombers and Ion Frigates of which 50% damage crosses any shielding)
        </p>

        <h3 className="text-lg font-semibold">Example</h3>
        <p>
          A Cruiser that deals 40 damage against a Titan with 30 shielding will only deal 10 damage to the Titan. If the Titan has 4000 armour then it will take 400 Cruisers to one shot kill it.
        </p>
        <p>(note: to simplify the 1% of cross-shield damage was not considered in this example)</p>

        <p>
          For ships of Cruiser type and up any damage dealt to it that is not sufficient to kill it will leave a percentage of a ship behind. This will require 50% of the cost to build the ship to repair modified by the percentage of damage dealt to the ship (ie a Battleships at 0.6 will cost 400 credits to repair).
        </p>
        <p>Bases defenses will auto repair at 1% per hour in non occupied bases.</p>
        <p>Max number of fighters that can target a unit in a combat round = 2 x unit size.</p>
      </div>
    ),
  },
  {
    id: 'experience',
    title: 'Experience',
    content: (
      <div className="space-y-4">
        <p>
          After combat, players gain experience points based on the total destruction to both players multiplied by a % based on the difference of levels between players.
        </p>
        <p>If the enemy's level is above your level:</p>
        <p>XP = (enemy/your level) /20 * Total Fleet destroyed</p>
        <p>(max: 10% * Total fleet destroyed)</p>
        <p>If your level is above the enemy's level:</p>
        <p>XP = (enemy/your level)^2 /20 * Total Fleet destroyed</p>
        <p>Combat with NPCs:</p>
        <p>XP = 5% * Total Fleet destroyed</p>
        <p>
          The total combat experience points a player has does not directly measure how well they fight, it only means that they have been involved in more or larger battles, and against stronger opponents.
        </p>
        <p>
          It works also as a small compensation for players that are fighting higher level players, and an incentive to players to fight players at their own level or even above.
        </p>
        <p>Experience points can be spent on commanders.</p>
      </div>
    ),
  },
  {
    id: 'newbies',
    title: 'Newbies',
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Newbie Protection</h3>
        <p>In order to protect newbies (new players) the following rules are applied:</p>
        <p>--------------------------------------------------------------------------------</p>
        <p>Players under level 10 - Player bases can’t be attacked.</p>
        <p>Players over level 10 - Bases can only be attacked by players within 150% of the defender's level.</p>
        <p>
          These protections are only valid to the player bases and not to his fleets outside of his bases or to unguarded trade routes.
        </p>
        <p>
          These protections are not valid in occupied bases if the attack is done by the occupier or someone from the same guild.
        </p>
        <p>
          If a protected player attacks others over the protection level outside his bases he/she loses his protection for 48 hours.
        </p>
        <p>--------------------------------------------------------------------------------</p>
        <p>
          If a player attacks/occupies a player less than 65% of their level; then they only get x% of the pillage/trade route plunder/occupation income.
        </p>
        <p>x% = Defender level / Attacker level x 100%</p>
        <p>--------------------------------------------------------------------------------</p>
        <p>
          However, if you start surrounded by stronger players, it is recommended that you join a guild as soon as possible, to gain protection from stronger players.
        </p>
      </div>
    ),
  },
  {
    id: 'empire',
    title: 'Empire',
    content: (
      <div className="space-y-4">
        <p>
          A player's empire is represented by all of that player's bases and fleet and all bases occupied by that player.
        </p>
        <p>
          The three main ways of measuring an empire's strength; the total economy of the empire, the total amount of fleet that the empire has, and the total technological development of the empire.
        </p>
        <p>
          The latter two are measured in credits spent in each category. Finally, another indicator of an empire's strength is the player's level. This is calculated with the following formula:
        </p>
        <p>Player Level = (Economy x 100 + fleet + technology) ^ 0.25</p>
        <p>(The ^ symbol denotes an exponent; ^.25 means to take the 4th root)</p>
      </div>
    ),
  },
  {
    id: 'guild',
    title: 'Guild',
    content: (
      <div className="space-y-4">
        <p>
          A guild is a group of players that work together under the same banner. It is run by the player who is
          designated as the guildmaster, and other players can play important roles in the guild (diplomacy, for
          example). Guilds can be democratic, anarchistic, totalitarian, and/or some many other types of government.
          Players can join for various reasons, most often due to friends wanting to work together and players wanting
          to find protection.
        </p>
        <p>
          A guild generally provides protection to its members (safety in numbers), and a member can usually count on
          assistance and support from other guildmembers.
        </p>
        <p>Guild members have access to a guild board where they can easily communicate with others guild members.</p>
        <p>
          Guilds can also have their own website and messageboard/web forum, which is recommended to improve guild
          communication.
        </p>
        <p>
          A player can create a new guild, or apply to join an existing guild. The guildmaster has the authority of
          accepting new members, kicking existing members (although any player can withdraw from a guild at any time for
          any reason), and even to appoint a new guild master from one of the other guild members. Guildmasters can also
          give individual members permissions to help out around the guild.
        </p>
        <p>
          Obviously, members of the same guild are unable to attack each other or otherwise interfere with another guild
          member's fleets or planets.
        </p>
        <p>
          An indicator of a guild strength is the guild's level. This is calculated with the following formula:
        </p>
        <p>Guild Level = (Guild Economy x 100 + Guild Fleet + Avg. Guild Technology) ^ 0.25</p>
        <p>(The ^ symbol denotes an exponent; ^.25 means to take the 4th root)</p>
      </div>
    ),
  },
  {
    id: 'commanders',
    title: 'Commanders',
    content: (
      <div className="space-y-4">
        <p>
          Commanders can be recruited and trained to give specific bonuses. You can do so by using either experience
          points or credits.
        </p>
        <p>
          A base can only have one base commander assigned there, giving a bonus that is based on the commander's
          skill and level.
        </p>
        <p>
          When a base is pillaged or successfully attacked, there is a 10% chance that each commander located there will
          be killed. Commanders not in duty can also die.
        </p>
        <p>
          When a construction commander is assigned to a base, it cannot be removed if the base has a structure
          currently being constructed. The same goes for research commanders while researching and production commanders
          while building ships.
        </p>
        <p>
          Also, if a commander is assigned to a base you must wait at least 48 hours before removing their assigned
          task.
        </p>
        <p>
          You must have at least 1 command center to recruit a commander. The maximum number of commanders you can have
          is equal to the level of your Computer technology.
        </p>
        <p>
          When your commander is in the commander pool, it takes 10 minutes to get to any of your bases. You can move
          your commanders between bases, the travel duration being equivalent to a scout ship's travel time.
        </p>
      </div>
    ),
  },
  {
    id: 'upgrading',
    title: 'Upgrading',
    content: (
      <div className="space-y-4">
        <p>Upgrading will remove advertising and add extra game features, improving gameplay.</p>
        <p>Upgrade costs less than 0.06€ per day if you upgrading 12 months.</p>
        <p>
          At the game account/upgrade page you can compare the game upgraded account versus free accounts, and
          see the upgrades prices.
        </p>
        <p>
          We accept several payment methods, as PayPal, credit card, wire transfer, Western Union, and phone (DaoPay).
        </p>
        <p>You can also upgrade others players accounts, by going to their game profiles.</p>
        <p>New game accounts start upgraded for the first 7 days of play.</p>
        <h3 className="text-lg font-semibold">Why should I upgrade my account?</h3>
        <p>
          This is needed to allow us to pay for servers, personnel and to support further development. This also
          ensures sustainability and the long term success of Attrition which benefits all players.
        </p>
      </div>
    ),
  },
  {
    id: 'vacation_mode',
    title: 'Vacation Mode',
    content: (
      <div className="space-y-4">
        <p>
          Player can select to be in vacation mode, if for some reason they will be away from the game during several days.
        </p>
        <h3 className="text-lg font-semibold">Vacation Mode Rules</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Only upgraded players can set the vacation mode.</li>
          <li>Vacation mode cannot be removed for 72 hours except within the first hour it's set.</li>
          <li>After the vacation mode is removed you can only start attacks after 4 hours.</li>
          <li>After vacation mode is removed it can only be reactivated after 5 days.</li>
          <li>Vacation mode can only be used for 35 days in a civil year.</li>
        </ul>
        <h3 className="text-lg font-semibold">While in vacation mode</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your bases cannot be attacked (only comes into effect 24 hours after vacation mode is set).</li>
          <li>Your fleets outside your bases and on your occupied bases can still be attacked.</li>
          <li>Your occupied bases can still be attacked and pillaged during vacation mode.</li>
          <li>Your profile will display a vacation mode badge (only comes into effect 24 hours after vacation mode is set).</li>
          <li>You get half of your economy income, even after 4 days of inactivity.</li>
          <li>You cannot move or do any other action with your fleets.</li>
          <li>Your recyclers don't collect debris.</li>
          <li>You cannot start or queue new constructions, productions, research or trade routes.</li>
          <li>Constructions and researches that are already in the queue stay there, but the time to complete them doubles.</li>
          <li>Your guild mates cannot use your bases jump gates.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'others',
    title: 'Others',
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Messages</h3>
        <p>
          Attrition includes a private messaging system that allows a player to contact any other player in the game.
        </p>
        <p>
          Players are responsible for the contents of their communications. offensive, racist, pornographic material, and
          other such harmful comments are prohibited, and may result in the game administration deleting or otherwise
          preventing a user from communciating who violates this rule.
        </p>
        <p>If you wish to save any messages that have been sent to you, there is a savebox available.</p>
        <p>
          All players can place other players into their contacts list, which is a quick way of keeping track of them so
          they are easily located to send messages to.
        </p>
        <p>In addition, players can also block other players if they do not wish to receive messages from that player.</p>

        <h3 className="text-lg font-semibold">Notes</h3>
        <p>
          Each player has the ability to create and store individual notes, allowing easy access to important
          information for later review. You can edit and delete current notes.
        </p>

        <h3 className="text-lg font-semibold">Bookmarks</h3>
        <p>Each player has the ability to store individual location bookmarks.</p>
        <p>
          Those locations are shown when you go at the fleet movement page, so you can fast select those locations as
          fleet destinations.
        </p>

        <h3 className="text-lg font-semibold">Recruiting</h3>
        <p>Help promoting Attrition.</p>
        <p>If you use your recruit link to bring new players to game, you will get extra credits as bonus.</p>
        <p>
          For each recruit upgraded you will receive a one turn bonus of 10% of your total economy (up to a max. of
          100%). This bonus is given daily at server time 0h.
        </p>
        <p>
          There are game banners with your recruit link attached, in the account/banner page. All you need to do is copy
          the appropriate code into your HTML page.
        </p>
        <p>
          (Note: Players must join the same server as you using your recruit link to be your recruit. The trial upgrade
          does not count as upgraded)
        </p>

        <h3 className="text-lg font-semibold">Forum</h3>
        <p>
          The game forum is a place where players can talk about game-related subjects, such as politics, guild
          recruitment, game feedback, support, and assistance, and there are also alternative languages forums.
        </p>
        <p>
          Offensive or otherwise harmful comments are prohibited, and may result in a player being suspended or banned
          from the forums or game.
        </p>
      </div>
    ),
  },

  // Footer group (separated visually on the left list)
  {
    id: 'starting_guide',
    title: 'Starting Guide',
    content: (
      <div className="space-y-4">
        <p>
          If you have just started the game, there is a good chance that many other players are already playing, and that they are far stronger than you. You should not worry too much about these players now, as the game will protect your bases against stronger players in the first few days.
        </p>
        <p>
          So, your first concern should be to raise your base construction, in order to make structures build faster. We advise you to build a few Metal Refineries first, as these will not only improve your construction and production capacities, but will also increase your economy.
        </p>
        <p>
          After you get Metal Refineries up to about level 4, you will probably have noticed that they are getting more expensive and taking longer to build every time. So now you should build a Research Labs, and research Computer technology up to level 2, to unlock the Robotic Factories structures. These are similar to Metal Refineries, so you can build both alternately to compensate for the increase in the prices at each level.
        </p>
        <p>
          Next, while you continue to build structures, you should research Energy technology up to level 6, to unlock Fusion Plants. These are more expensive than Solar Plants and Gas Plants, but will allow you to generate more Energy each time (unless you're lucky to be on a planet with solar or gas energy 4).
        </p>
        <p>
          At some point you should also start building some Shipyards, because they are cheap at the start and they will also help boost your economy (and you never know when you'll need them).
        </p>
        <p>
          Now you probably have a few levels of Metal Refineries and Robotic Factories, and a relatively fast Construction, and your credits are running out, right? It's time to raise your Economy a little more. Build some Spaceports and set up a Trade Route with someone who has a good Economy (don't forget to ask for permission first, and if you are in a guild, try to make it with someone from your guild).
        </p>
        <p>
          Crystal Mines are also great to raise your Economy, but only if you're lucky enough to have started on a planet with Crystals (in that case you should have been building them since earlier on in the guide).
        </p>
        <p>
          Well, now you have a decent Construction, Production, and Economy, and everything is getting even more expensive. You need to prepare to set up new bases on other planets, wich means you'll have to create Outpost Ships.
        </p>
        <p>
          If you look at the game Tables you'll see that you need Warp Drive (1) to unlock the Outpost Ship, but that also means that you will first need to have Research Labs (8), Stellar Drive (4), and Energy (8). Finally, you will need Shipyards (8) in order to build your Outpost ship. It may seem a lot, but this should take less than one day, if you keep your Construction and Research queues full.
        </p>
        <p>
          When you're done, just choose an astro, move your Outpost Ship there, and when it arrives choose 'Build Base' from the Fleet Menu (note that you'll have to pay 100 credits to construct up your first new Base, and this value will increase with each new base).
        </p>
        <p>
          Now you should evolve your second Base faster than the first one and your Economy will rise fast too. But be weary of other players trying to Conquer you. By now, you should have started to prepare your defenses too!
        </p>
        <p>
          Is recommended that you join a guild early as possible, to get some protection from stronger players.
        </p>
        <p>Have a good game! :-)</p>
      </div>
    ),
    group: 'footer',
  },
  {
    id: 'occupied_guide',
    title: 'Occupied Guide',
    content: (
      <div className="space-y-4">
        <p>Simple strategy guide to follow, when your bases are occupied.</p>
        <p>There are several ways and tactics to get rid of occupations. Here are some tips and hints to achieve that goal:</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Build a lot of command centers. The more the better.</li>
          <li>
            Match the unit you build to attack an occupier. If they have a lot of unshielded craft, use fighters. If they have mostly cruisers or heavy cruisers, use bombers or heavy bombers. With battleships, use heavy bombers. If they have really big units, use ion bombers.
          </li>
          <li>Don't get into a pattern of always attacking at a certain time.</li>
          <li>
            If there's a lot of debris, use recyclers to collect the debris. However, don't leave the recyclers there.
          </li>
          <li>
            Bases that are occupied increases unrest by 10% each day. When unrest reaches 100% you can Revolt and free the base from occupation. While a base is with unrest at 50% or more it can’t get a new occupation. When a base unrest decreases from 50% to 40% the base gets all the defenses restored. So is good to build defenses to make harder your base get occupied again.
          </li>
        </ol>
        <p>
          If you do a good job, the occupier will start losing more credits than he earns from your bases, increasing significantly your chances that he/she will withdraw and leave you alone.
        </p>
        <p>
          Still, your best option will always be to join a good guild and get help from other players to liberate your bases.
        </p>
        <p>Diplomacy is also very important against a much stronger opponent. Try talking him out of your bases.</p>
        <p>
          If all this fails, your final and more desperate solution may be to disband your bases and relocate to a safer area. For each base you disband you get a portion of the base's structures value in discount when establishing new bases to replace the ones you disbanded.
        </p>
      </div>
    ),
    group: 'footer',
  },
  {
    id: 'dictionary',
    title: 'ATT Dictionary',
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">General</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>ATT = Attrition</li>
          <li>Acc = Account</li>
          <li>Newbie = New player</li>
          <li>Mod = Moderator</li>
          <li>Indy = Independent player not associated with a guild</li>
          <li>Exp = Combat Experience</li>
          <li>Farm (verb) = Occupying a base for an extended period</li>
          <li>AI = Artificial Intelligence</li>
          <li>Tech = Technology</li>
          <li>Loc = Location</li>
          <li>TR = Trade Routes</li>
          <li>JG = Gate = Jump Gate</li>
          <li>CC = Command Centers</li>
          <li>UC = United Colonies (a NPC account)</li>
          <li>P-rings = Rings = Planetary Ring</li>
          <li>P-shield = Planetary Shield</li>
        </ul>

        <h3 className="text-lg font-semibold">Diplomacy</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>NAP = Non Aggression Pact</li>
          <li>MDP = Mutual Defense Pact</li>
          <li>Bloodpact = very strong alliance</li>
          <li>KOS = Kill On Sight</li>
          <li>CF = Cease Fire</li>
          <li>ToA = Treaty of Armistice</li>
        </ul>

        <h3 className="text-lg font-semibold">Ship Terms</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>FT = Fighter</li>
          <li>BO = Bombers</li>
          <li>HB = Heavy Bombers</li>
          <li>IB = Ion Bomber</li>
          <li>CV = Vette = Corvette</li>
          <li>RC = Cyclers = Recyclers</li>
          <li>DE = Destroyers</li>
          <li>FR = Frigate</li>
          <li>IF = Ion Frigate</li>
          <li>SS = Scout = Scout Ship</li>
          <li>OS = Outpost Ship</li>
          <li>CR = Cruiser</li>
          <li>CA = Carrier</li>
          <li>HC = Heavy Cruiser</li>
          <li>BS = Battleship</li>
          <li>FC = Fleet Carrier</li>
          <li>DN = Dread = Dreadnought</li>
          <li>TI = Titan</li>
          <li>LV = Levi = Leviathan</li>
          <li>DS = Death Star</li>
        </ul>

        <h3 className="text-lg font-semibold">Combat</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Waves = breaking an assault into multiple attacks</li>
          <li>Meat Shields = many small units to keep your large units safer</li>
          <li>Ratio = Kill Ratio, eg: losses: 1000 / 6000 = 6:1 kill ratio for attacker</li>
        </ul>
      </div>
    ),
    group: 'footer',
  },
];

export const defaultTopicId: HelpTopicId = 'introduction';
