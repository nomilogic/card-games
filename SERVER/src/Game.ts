//import * as readline from 'readline';
class EventEmitter<T> {
  listeners: ((data: T) => void)[] = [];
  on(event: (data: T) => void) {
    this.listeners.push(event);
  }
  emit(data: T) {
    this.listeners.forEach((listener) => listener(data));
  }

}

enum CardSymbol {
  Hearts = '♥',
  Diamonds = '♦',
  Clubs = '♣',
  Spades = '♠',
}
class Card {
  suit: string;
  rank: string;
  power: number; // Power attribute for fast comparison
  isPlayed: boolean; // Property to track if the card has been played
  belongsTo: string; // Property to track which player the card belongs to
  symbol: string; // Property to track which player the card belongs to create cards symbols for e.g
  constructor(
    suit: string,
    rank: string,
    power: number,
    symbol: string = CardSymbol.Hearts
  ) {
    this.suit = suit;
    this.rank = rank;
    this.power = power;
    this.isPlayed = false;
    this.belongsTo = "";
    this.symbol = symbol;
  }

  toString(): string {
    return `${this.rank} of ${this.suit}`;
  }
}

// Deck class to manage deck operations
class Deck {
  suits: string[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
  symbols: string[] = [
    CardSymbol.Hearts,
    CardSymbol.Diamonds,
    CardSymbol.Clubs,
    CardSymbol.Spades,
  ];
  ranks: { [key: string]: number } = {
    '2': 0,
    '3': 1,
    '4': 2,
    '5': 3,
    '6': 4,
    '7': 5,
    '8': 6,
    '9': 7,
    '10': 8,
    J: 9,
    Q: 10,
    K: 11,
    A: 12,
  };
  cards: Card[];

  constructor() {
    this.cards = this.createDeck();
  }

  createDeck(): Card[] {
    let deck: Card[] = [];
    for (let suit of this.suits) {
      for (let rank in this.ranks) {
        deck.push(
          new Card(
            suit,
            rank,
            this.ranks[rank],
            this.symbols[this.suits.indexOf(suit)]
          )
        );
      }
    }
    return deck;
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  distribute(players: Player[]): void {
    this.shuffle();
    for (let i = 0; i < this.cards.length; i++) {
      let player = players[i % 4];
      this.cards[i].belongsTo = player.id; // Track which player the card belongs to
      player.hand.push(this.cards[i]);
    }
    players.forEach((player) => player.sortHand('both', true));
  }
}

// Player class to represent each player (AI or Human)
class Player {
  id: string;
  partnerId: string;
  private _hand!: Card[];
  tricksWonCards: Card[];
  tricksWon: number;
  playedCards: Card[];
  isHuman: boolean;
  cheatMode: boolean;
  humanPlayPromise!: Promise<Card>;
  tricksClaimed: number = -1;
  index: number = -1;

  resolveHumanPlay: ((card: Card) => void) | null = null;
  constructor(
    id: string,
    partnerId: string,
    isHuman: boolean = false,
    index: number = -1,
    cheatMode: boolean = false
  ) {
    this.id = id;
    this.partnerId = partnerId;
    this._hand = [];
    this.tricksWonCards = [];
    this.tricksWon = 0;
    this.playedCards = [];
    this.isHuman = isHuman;
    this.cheatMode = cheatMode;
    this.index = index;
  }
  get hand(): Card[] {
    return this._hand;
  }
  set hand(cards: Card[]) {
    this._hand = cards;
    this.sortHand('both', true);
  }
  sortHand(
    criteria: 'power' | 'suit' | 'both' = 'power',
    ascending: boolean = true,
    hand: Card[] = this._hand
  ): void {
    const ranks = {
      '2': 0,
      '3': 1,
      '4': 2,
      '5': 3,
      '6': 4,
      '7': 5,
      '8': 6,
      '9': 7,
      '10': 8,
      J: 9,
      Q: 10,
      K: 11,
      A: 12,
    };
    const suitOrder = ['Hearts', 'Clubs', 'Diamonds', 'Spades']

    hand.sort((a, b) => {
      let comparison = 0;

      // Sort by suit first if criteria includes suit
      if (criteria === 'suit' || criteria === 'both') {
        const suitOrderA = suitOrder.indexOf(a.suit);
        const suitOrderB = suitOrder.indexOf(b.suit);

        if (suitOrderA !== suitOrderB) {
          comparison = suitOrderA - suitOrderB;
        }
      }

      // If suits are the same or not being sorted, compare ranks
      if (comparison === 0 && (criteria === 'power' || criteria === 'both')) {
        const rankA: number = a.power;
        const rankB: number = b.power;
        comparison = rankA - rankB;
      }

      // Apply ascending/descending logic
      return ascending ? comparison : -comparison;
    });
  }
  async humanPlayCard(trick: Trick) {
    // Create a new promise if the previous one is already resolved
    if (this.resolveHumanPlay === null) {
      this.humanPlayPromise = new Promise((resolve) => {
        this.resolveHumanPlay = resolve;
      });
    }

    // Rest of the human play logic
    return this.humanPlayPromise;
  }
  async playCard(
    trick: Trick,
    trumpSuit: string,
    allPlayers: Player[],
    revealedCards: Card[] = [],
    allCards: Card[] = [],
  ): Promise<Card> {
    if (this.isHuman) {
      return await this.humanPlayCard(trick);
    } else if (this.cheatMode) {
      return this.cheatAiPlayCard(trick, trumpSuit, allPlayers, revealedCards, allCards);
    } else {
      return this.normalAiPlayCard(trick, trumpSuit, allPlayers, revealedCards, allCards);
    }
  }

  async claimTricks(totalTricks: number): Promise<void> {
    if (this.isHuman) {
      this.tricksClaimed = totalTricks;

      return Promise.resolve();
    } else {
      this.tricksClaimed = this.aiClaimTricks();
      return Promise.resolve();
    }
  }

  aiClaimTricks(currentHighestClaim: number = 0): number {
    const TOTAL_TRICKS = 13;

    // Detailed hand analysis
    const suitGroups = this.hand.reduce((groups, card) => {
      if (!groups[card.suit]) {
        groups[card.suit] = [];
      }
      groups[card.suit].push(card);
      return groups;
    }, {} as Record<string, Card[]>);

    // Comprehensive hand strength evaluation
    const handStrengthFactors = {
      highCardCount: this.hand.filter((card) => card.power >= 9).length,
      aceCount: this.hand.filter((card) => card.power >= 12).length,
      suitDistribution: Object.entries(suitGroups).map(([suit, cards]) => ({
        suit,
        length: cards.length,
        highCards: cards.filter((card) => card.power >= 9).length,
        hasAce: cards.some((card) => card.power >= 12),
      })),
    };

    // Partner probability estimation
    const estimatePartnerTricks = () => {
      // More lenient partner trick estimation
      const averageHandStrength = {
        highCardThreshold: 3, // Lowered from 4
        acePresence: 0, // Removed strict ace requirement
        strongSuitLength: 3, // Lowered from 4
      };

      let partnerPotentialTricks = 0;

      // More relaxed partner trick estimation
      if (
        handStrengthFactors.highCardCount >=
        averageHandStrength.highCardThreshold
      ) {
        // Estimate partner tricks based on your hand's strength
        partnerPotentialTricks = Math.floor(
          handStrengthFactors.suitDistribution.filter(
            (suit) => suit.length >= averageHandStrength.strongSuitLength
          ).length * 2 // Increased multiplier
        );
      }

      return Math.min(partnerPotentialTricks, 6); // Cap partner tricks
    };

    // Strict claim calculation
    const potentialTricks = handStrengthFactors.suitDistribution.reduce(
      (max, suitInfo) => {
        // More lenient trick estimation
        const suitTricks =
          suitInfo.length >= 3 && suitInfo.highCards >= 1
            ? Math.min(suitInfo.length, suitInfo.highCards + 1)
            : 0;
        return Math.max(max, suitTricks);
      },
      0
    );

    // Partner potential tricks
    const partnerTricks = estimatePartnerTricks();

    // Minimum claim rules
    const minimumClaim = Math.max(8, currentHighestClaim + 1);

    // Collaborative trick calculation
    let claimedTricks = Math.min(
      potentialTricks + partnerTricks,
      handStrengthFactors.highCardCount + partnerTricks,
      TOTAL_TRICKS
    );

    // More lenient claiming conditions
    const canConfidentlyClaim =
      handStrengthFactors.highCardCount >= 4 && // Lowered from 5
      claimedTricks >= minimumClaim && // Meets minimum claim
      claimedTricks <= TOTAL_TRICKS; // Within total tricks

    // Extensive logging for debugging
    console.log(`AI Player ${this.id} Claim Analysis:`, {
      hand: this.hand.map((card) => `${card.power} of ${card.suit}`),
      highCardCount: handStrengthFactors.highCardCount,
      aceCount: handStrengthFactors.aceCount,
      potentialTricks: potentialTricks,
      partnerTricks: partnerTricks,
      minimumClaim: minimumClaim,
      currentHighestClaim: currentHighestClaim,
      claimedTricks: claimedTricks,
      canConfidentlyClaim: canConfidentlyClaim,
    });

    // Pass only if absolutely cannot claim
    if (!canConfidentlyClaim) {
      console.log(
        `AI Player ${this.id} PASSES due to insufficient hand strength`
      );
      return 0; // Pass
    }

    // Final claim adjustment
    claimedTricks = Math.max(
      Math.min(claimedTricks, TOTAL_TRICKS),
      minimumClaim
    );

    console.log(
      `AI Player ${this.id} claims ${claimedTricks} tricks. highestClaim: ${currentHighestClaim}`
    );
    if (currentHighestClaim < 13) {
      //claimedTricks = currentHighestClaim == 0 ? 8 : currentHighestClaim + 1;
      console.log(`AI Player ${this.id} claims ${claimedTricks} tricks.`);
    } else {
      claimedTricks = 0;
      console.log(`AI Player ${this.id} passes due to insufficient tricks.`);
    }
    return claimedTricks;
  }
  // Enhanced sequence detection
  private checkCardSequence(cards: Card[]): number {
    const sortedCards = cards.sort((a, b) => b.power - a.power);

    // More complex sequence detection
    let maxSequenceLength = 0;
    let currentSequence = 1;

    for (let i = 1; i < sortedCards.length; i++) {
      if (sortedCards[i - 1].power - sortedCards[i].power <= 3) {
        currentSequence++;
        maxSequenceLength = Math.max(maxSequenceLength, currentSequence);
      } else {
        currentSequence = 1;
      }
    }

    // Bonus calculation with exponential growth
    return maxSequenceLength > 2 ? Math.pow(maxSequenceLength, 2) : 0;
  }
  async playHumanCard(
    card: Card,
    trick: Trick,
    tricksClaimed: number = 0
  ): Promise<any> {
    //console.log(`Player ${this.id}, it's your turn. Your hand:`);
    //console.table(this.hand);

    let selectedCard: Card = card;
    let leadingSuit: string | undefined;
    let leadingSuitSymbol: string | undefined;
    let mustFollowSuit = false;

    // Determine game state and constraints
    if (trick.cards.length > 0) {
      leadingSuit = trick.cards[0].suit;
      leadingSuitSymbol = trick.cards[0].symbol;

      // Find cards matching the leading suit
      const suitCards = this.hand.filter((card) => card.suit === leadingSuit);

      // Player must follow suit if possible
      mustFollowSuit = suitCards.length > 0;
    }
    console.log(mustFollowSuit, 'mustFollowSuit');

    // Default card selection strategy

    // Attempt to select a card

    // Use default callback if no custom callback provided

    // Additional validation
    if (!this.hand.includes(selectedCard)) {
      throw new Error("Selected card is not in the player's hand");
    }

    // If must follow suit, ensure selected card matches leading suit
    console.log(
      `mustFollowSuit: ${mustFollowSuit}, selectedCard.suit: ${selectedCard.suit}, leadingSuit: ${leadingSuit}`
    );
    if (mustFollowSuit && selectedCard.suit !== leadingSuit) {
      console.log(
        `mustFollowSuit: ${mustFollowSuit}, selectedCard.suit: ${selectedCard.suit}, leadingSuit: ${leadingSuit}`
      );
      //   throw new Error(`Must play a ${leadingSuit} card`);
      const suitColor =
        leadingSuitSymbol === '♥' || leadingSuitSymbol === '♦'
          ? 'red'
          : 'black';
      return Promise.reject(
        `Must play a ${leadingSuit} <span style="color: ${suitColor}; font-weight: bold;">${leadingSuitSymbol}</span> card`
      );
    }

    // Mark the card as played
    selectedCard.isPlayed = true;

    // Remove the card from the hand
    this.hand = this.hand.filter((card) => card !== selectedCard);

    // Add to played cards
    console.log(selectedCard, 'selected card');
    this.playedCards.push(selectedCard);
    if (this.resolveHumanPlay) {
      this.resolveHumanPlay(selectedCard);
      this.resolveHumanPlay = null; // Reset for next play
    }
    return Promise.resolve();
  }
  normalAiPlayCard(
    trick: Trick,
    trumpSuit: string,
    allPlayers: Player[],
    revealedCards: Card[],
    allCards: Card[]
  ): Card {
    const isFirstInTrick = trick.cards.length === 0;
    let selectedCard;

    if (isFirstInTrick) {
      selectedCard = this.leadCard(trumpSuit, revealedCards, allPlayers);
    } else {
      const leadingCard = trick.cards[0];
      const leadingSuit = leadingCard.suit;
      const suitCards = this.hand.filter((card) => card.suit === leadingSuit);

      if (suitCards.length > 0) {
        // Mandatory to play a card of the leading suit
        selectedCard = this.chooseBestCard(
          suitCards
        );
      } else {
        // If no suit cards, proceed with normal trick response
        selectedCard = this.respondToTrick(
          trick,
          trumpSuit,
          allPlayers,
          revealedCards,
          allCards,
        );
      }
    }

    selectedCard.isPlayed = true; // Mark the card as played
    this.playedCards.push(selectedCard);
    this.hand = this.hand.filter((card) => card !== selectedCard);
    return selectedCard;
  }
  leadCard(
    trumpSuit: string,
    revealedCards: Card[],
    allPlayers: Player[]
  ): Card {
    return this.chooseBestCard(this.hand);
  }

  cheatAiPlayCard(
    trick: Trick,
    trumpSuit: string,
    allPlayers: Player[],
    revealedCards: Card[],
    allCards: Card[]
  ): Card {
    const isFirstInTrick = trick.cards.length === 0;
    let selectedCard;

    if (isFirstInTrick) {
      selectedCard = this.cheatLeadCard(trumpSuit, allPlayers, revealedCards);
    } else {
      selectedCard = this.respondToTrick(
        trick,
        trumpSuit,
        allPlayers,
        revealedCards,
        allCards,

      );
    }

    selectedCard.isPlayed = true; // Mark the card as played
    this.playedCards.push(selectedCard);
    this.hand = this.hand.filter((card) => card !== selectedCard);
    return selectedCard;
  }

  cheatLeadCard(
    trumpSuit: string,
    allPlayers: Player[],
    revealedCards: Card[]
  ): Card {
    return this.chooseBestCard(this.hand);
  }

  respondToTrick(
    trick: Trick,
    trumpSuit: string,
    allPlayers: Player[],
    revealedCards: Card[],
    allCards: Card[]
  ): Card {
    const leadingSuit = trick.cards[0].suit;
    const leadingCard: Card = trick.cards.reduce((highest, card) => {
      if (card.suit === trumpSuit && highest.suit !== trumpSuit) {
        return card;
      } else if (card.suit === highest.suit || card.suit === trumpSuit) {
        return card.power > highest.power ? card : highest;
      } else {
        return highest;
      }
    });
    console.log(leadingCard, 'leadingCard');

    let validCards = this.hand.filter((card) => card.suit === leadingSuit);
    let turnNumber = trick.cards.length + 1;
    let trumpCards = this.hand.filter((card) => card.suit === trumpSuit);
    //let bettercard = this.chooseBetterCard(validCards, leadingCard);
    let alreadyPlayedofCurrentSuit = revealedCards.filter((card) => card.suit === leadingSuit);
    let remainingCardsOfCurrentSuit = allCards.filter((card) => card.suit === leadingSuit && card.isPlayed === false);
    let bestRemainingCardofCurrentSuit = remainingCardsOfCurrentSuit.length > 0 ? remainingCardsOfCurrentSuit.reduce((bestCard, card) => card.power > bestCard.power && card.belongsTo !== this.id ? card : bestCard) : null;
    let handSuits = {
      Hearts: this.hand.filter((card) => card.suit === 'Hearts'),
      Diamonds: this.hand.filter((card) => card.suit === 'Diamonds'),
      Clubs: this.hand.filter((card) => card.suit === 'Clubs'),
      Spades: this.hand.filter((card) => card.suit === 'Spades'),
    };
    let suitWithMostCards = Object.values(handSuits).reduce((max, suit) => suit.length > max.length ? suit : max, []);
    let leastCardsInSuit = Object.values(handSuits).reduce((min, suit) => suit.length < min.length ? suit : min, []);

    if (validCards.length > 0) {
      let bestcard = this.chooseBestCard(
        validCards
      );
      if (leadingCard.suit === trumpSuit && leadingSuit !== trumpSuit) {
        return this.chooseWorstCard(validCards);
      }

      let bettercard = this.chooseBetterCard(validCards, leadingCard)
      if (bettercard.power < leadingCard.power) {
        return this.chooseWorstCard(validCards);
      }
      if (turnNumber === 4) {

        return bettercard;
      }
      if (bestcard.power > leadingCard.power && bestcard.suit === leadingSuit) {
        let otherPlayersRemainingCards = remainingCardsOfCurrentSuit.filter((card) => card.belongsTo !== this.id);
        if (bestRemainingCardofCurrentSuit && bestcard.power < bestRemainingCardofCurrentSuit?.power) {
          return bettercard;
        };
        return bestcard;
      } else {
        return this.chooseWorstCard(validCards);

      }


    } else if (trumpCards.length > 0) {

      if (leadingCard.suit === trumpSuit) {
        let bettercard = this.chooseBetterCard(trumpCards, leadingCard);
        if (bettercard.power > leadingCard.power) {
          return bettercard;
        }
        if (suitWithMostCards[0].suit !== trumpSuit) {
          return this.chooseWorstCard(suitWithMostCards);

        }
        return this.chooseWorstCard(this._hand.filter((card) => card.suit !== trumpSuit));

      }
      return this.chooseWorstCard(trumpCards);
    }
    else {
      return this.chooseWorstCard(suitWithMostCards);
    }
  }
  chooseBestCard(cards: Card[]): Card {
    return cards.reduce((bestCard, card) => card.power > bestCard.power ? card : bestCard);
  }


  chooseWorstCard(cards: Card[]): Card {
    return cards.reduce((worstCard: Card, card: Card) => {
      if (card.suit === worstCard.suit) {
        return card.power < worstCard.power ? card : worstCard;
      }
      return worstCard;  // Always return worstCard if suits don't match
    });
  }

  chooseBetterCard(cards: Card[], leadingCard: Card): Card {
    if (cards.length === 0) {
      return {} as Card;
    }
    return cards.reduce((bestCard: Card, card: Card) => {
      // If both cards are trump, choose the higher power
      if (card.power < bestCard.power && card.power > leadingCard.power) {
        return card;
      }
      else if (card.power > bestCard.power && bestCard.power < leadingCard.power) {
        return card;
      }
      else {
        return bestCard;
      }

    });
  }

  resetTricks(): void {
    this.tricksWon = 0;
  }
}
// ClaimTricks class to manage trick claiming process
class ClaimTricks {
  private game: Game;
  private totalTricks: number;
  private currentPlayerIndex: number;
  private consecutivePasses: number;
  private highestClaim: number;
  private claimWinnerIndex: number | null;
  private humanClaimPromise: Promise<number> | null;
  resolveHumanClaim: ((claim: number) => void) | null;
  resolveHumanTrumpSuit?: (value: string) => void;
  claimWinnerId: string | undefined;

  constructor(game: Game) {
    this.game = game;
    this.totalTricks = 13;
    this.currentPlayerIndex = 0;
    this.consecutivePasses = 0;
    this.highestClaim = 0;
    this.claimWinnerIndex = null;
    this.humanClaimPromise = null;
    this.resolveHumanClaim = null;
  }

  async performTrickClaiming(): Promise<void> {
    // Reset trick claims for all players
    this.game.players.forEach((player) => (player.tricksClaimed = -1));

    let claimers = this.game.players
      .filter((player) => player.tricksClaimed != 0)
      .map((player) => player.index);
    console.log(`Claimers: ${claimers}`);

    while (claimers.length > 1) {
      if (this.currentPlayerIndex >= claimers.length) {
        this.currentPlayerIndex = 0;
      }
      let currentPlayer = this.game.players[claimers[this.currentPlayerIndex]];

      let playerClaim: number;
      if (currentPlayer.isHuman) {
        playerClaim = await this.handleHumanClaim(this.highestClaim);
        console.log(
          `Human Player ${currentPlayer.id} claims ${playerClaim} tricks`
        );
      } else {
        playerClaim = currentPlayer.aiClaimTricks(this.highestClaim);
      }

      console.log(`Player ${currentPlayer.id} claims ${playerClaim} tricks`);

      if (playerClaim > 0) {
        // Reset consecutive passes
        this.consecutivePasses = 0;

        // Update highest claim and claim winner only if claim is higher
        if (playerClaim > this.highestClaim) {
          this.highestClaim = playerClaim;
          this.claimWinnerIndex = claimers[this.currentPlayerIndex];
          this.claimWinnerId = currentPlayer.id;
          currentPlayer.tricksClaimed = playerClaim;
          this.currentPlayerIndex = this.currentPlayerIndex + 1;
        }
      } else {
        currentPlayer.tricksClaimed = playerClaim;

        claimers.splice(this.currentPlayerIndex, 1);

        //this.currentPlayerIndex = 0;
      }
      console.log(
        `Claimer ${this.currentPlayerIndex} with ${this.highestClaim} tricks`
      );

      this.game.claimTricksChanged.emit({
        status: 'Tricks Claimed',
        claimedTricks: currentPlayer.tricksClaimed,
        currentPlayer: currentPlayer,
      });
      // Move to next player

      //claimers = this.game.players.filter(player => player.tricksClaimed != 0).map(player => player.id);

      await this.game.wait(6000);
      if (claimers.length === 1) {
        currentPlayer = this.game.players[claimers[0]];

        currentPlayer.tricksClaimed =
          currentPlayer.tricksClaimed !== 0 ? currentPlayer.tricksClaimed : 8;
        this.claimWinnerIndex = claimers[0];
        this.game.claimTricksChanged.emit({
          status: 'Tricks Claimed',
          claimedTricks: currentPlayer.tricksClaimed,
          currentPlayer: currentPlayer,
        });
        await this.game.wait(6000);
      }

      // Optional: Add a small delay between claims
      //await this.game.wait(6000);
      console.log(`Claimers: ${claimers}`);
    }

    // Set the claim winner
    if (this.claimWinnerIndex !== null) {
      this.game.claimWinner = this.game.players[this.claimWinnerIndex];
      console.log(
        `Claim winner is Player ${this.game.claimWinner.id} with ${this.game.claimWinner.tricksClaimed} tricks`
      );

      // Allow claim winner to choose trump suit
      await this.chooseTrumpSuit();
    }

    // Emit game state change
    this.game.gameStateChanged.emit({
      status: 'Trick Claiming Completed',
      trick: this.game.trick,
      players: this.game.players,
      currentPlayer: this.game.claimWinner || undefined,
    });
  }

  // Method to choose trump suit
  private async chooseTrumpSuit(): Promise<void> {
    const claimWinner = this.game.claimWinner;
    if (!claimWinner) return;

    let trumpSuit: string;
    if (claimWinner.isHuman) {
      // For human player, wait for UI input
      trumpSuit = await this.handleHumanTrumpSuitSelection();
    } else {
      // For AI, choose trump suit based on hand analysis
      trumpSuit = this.chooseAITrumpSuit();
    }

    // Set the trump suit
    this.game.setTrumpSuit(trumpSuit);
    console.log(`Trump suit chosen by Player ${claimWinner.id}: ${trumpSuit}`);

    // Emit game state change for trump suit selection
    this.game.trumpSuitSelected.emit({
      status: 'Trump Suit Selected',
      suit: this.game.trumpSuit,
      suitSymbol: CardSymbol[this.game.trumpSuit as keyof typeof CardSymbol],
      winner: claimWinner,
    });
  }

  // Method to handle human player's trump suit selection
  private handleHumanTrumpSuitSelection(): Promise<string> {
    // Create a new promise for human trump suit selection
    const humanTrumpSuitPromise = new Promise<string>((resolve) => {
      this.resolveHumanTrumpSuit = resolve;
    });

    // Emit an event to trigger UI for trump suit selection
    this.game.humanClaim.emit({
      status: 'Trump_Selection',
      callback: this.submitHumanTrumpSuit.bind(this),
    });

    return humanTrumpSuitPromise;
  }

  // Method to choose trump suit for AI
  private chooseAITrumpSuit(): string {
    const claimWinner = this.game.claimWinner;
    if (!claimWinner) return this.game.deck.suits[0]; // Fallback

    // Group cards by suit
    const suitGroups = claimWinner.hand.reduce((groups, card) => {
      if (!groups[card.suit]) {
        groups[card.suit] = [];
      }
      groups[card.suit].push(card);
      return groups;
    }, {} as Record<string, Card[]>);

    // Evaluate suit strength
    const suitStrengths = Object.entries(suitGroups).map(([suit, cards]) => {
      const highCards = cards.filter((card) => card.power >= 10);
      return {
        suit,
        strength: cards.length * 1.5 + highCards.length * 2,
      };
    });

    // Choose suit with highest strength
    const chosenSuit = suitStrengths.reduce((max, current) =>
      current.strength > max.strength ? current : max
    ).suit;

    return chosenSuit;
  }

  // Method to be called from UI when human player submits their trump suit
  submitHumanTrumpSuit(suit: string): void {
    if (this.resolveHumanTrumpSuit && this.game.deck.suits.includes(suit)) {
      console.log("trump suit", suit);
      this.resolveHumanTrumpSuit(suit);
      this.resolveHumanTrumpSuit = undefined;
    } else {
      console.error('Invalid trump suit selection.');
    }
  }

  // Method to handle human player's trick claim
  private handleHumanClaim(highestClaim: number): Promise<number> {
    // Create a new promise for human claim
    this.humanClaimPromise = new Promise<number>((resolve) => {
      this.resolveHumanClaim = resolve;
      console.log('this.resolveHumanClaim', this.resolveHumanClaim);
    });

    // Emit an event to trigger UI for human trick claim
    this.game.humanClaim.emit({
      status: 'Tricks_Selection',
      highestClaim: highestClaim,
      claimer: this.game.players[this.currentPlayerIndex - 1],
      callback: this.submitHumanClaim.bind(this),
    });

    return this.humanClaimPromise;
  }

  // Method to be called from UI when human player submits their claim
  async submitHumanClaim(claim: number): Promise<void> {
    console.log('resolveHumanClaim', this.resolveHumanClaim);
    if (this.resolveHumanClaim) {
      // Validate claim
      if (claim >= 0 && claim <= this.totalTricks) {
        console.log('submitHumanClaim', claim);
        this.resolveHumanClaim(claim);
        this.resolveHumanClaim = null;
        this.humanClaimPromise = null;
      } else {
        console.error('Invalid claim. Must be between 0 and 13.');
      }
    }
  }
}

// Modify Game class to use ClaimTricks

// Game class to handle game flow and logic

class Game {
  deck: Deck;
  players: Player[] = [];
  trumpSuit: string | undefined;
  claimWinner: Player | null;
  revealedCards: Card[];
  tricks: Array<Trick[]> = [];
  trick: Trick = { cards: [], winnerId: undefined };
  humanPlayedCard!: Card | PromiseLike<Card | null> | null;
  gameProgressionTimer: any;
  claimTricks: ClaimTricks;
  scoreBoard: ScoreBoard;

  constructor(players?: { id: string, name: string }[]) {
    this.deck = new Deck();

    /* this.players = [
      new Player(0, 2, true, 0), // Player 0 (human)
      new Player(1, 3, false, 1, true), // Player 1 (AI)
      new Player(2, 0, false, 2), // Player 2 (AI)
      new Player(3, 1, false, 3, true), // Player 3 (AI)
    ]; */

    // If players are provided, update the isHuman status
    if (players) {
      players.forEach((player, index) => {
        if (index < this.players.length) {
          this.players[index].isHuman = true;
        }
      });
    }

    this.trumpSuit = undefined;
    this.claimWinner = null;
    this.revealedCards = [];
    this.claimTricks = new ClaimTricks(this);
    this.scoreBoard = new ScoreBoard();
    this.players.forEach((player) => this.scoreBoard.initializePlayerScore(player.index));

    console.log(this.players, this.scoreBoard);
  }
  addPlayer(id: string, name: string, isHuman: boolean = false, index: number = -1): void {
    this.players.push(new Player(id, "", isHuman, index));

  }
  onPlayersJoined() {
    if (this.players.length === 4) {
      // this.startGame();
    }

  }
  setTrumpSuit(suit: string): void {
    this.trumpSuit = suit;
  }

  gameInit = new EventEmitter<{
    status: string;
    player: Player;
    partner: Player;
  }>();

  claimTricksChanged = new EventEmitter<{
    status: string;
    claimedTricks: number;
    currentPlayer?: Player;
    winner?: boolean;
  }>();
  gameStateChanged = new EventEmitter<{
    status: string;
    params?: any;
    trick?: Trick;
    players?: Player[];
    currentPlayer?: Player;
  }>();

  trickCompleted = new EventEmitter<{
    winnerId: string;
    trick: Trick;
  }>();

  trumpSuitSelected = new EventEmitter<{
    status: string;
    suit?: string;
    suitSymbol?: string;
    winner?: Player;
  }>();

  gameOver = new EventEmitter<{
    winnerId: string;
  }>();

  humanClaim = new EventEmitter<{
    status: string;
    highestClaim?: number;
    claimer?: Player;
    callback?: (...args: any) => void;
  }>();

  currentPlayerIndex: number = 0;

  async playRound(): Promise<void> {
    const currentPlayer = this.players[this.currentPlayerIndex];
    const playedCard = await this.playCurrentPlayerCard(currentPlayer);

    // Add played card to trick
    // Log the entire trick

    if (playedCard) {
      // playedCard.belongsTo = currentPlayer.id;
      this.trick.cards.push(playedCard);
      this.revealedCards.push(playedCard);
    }
    await this.wait(1000);
    this.checkStates();
    this.nextTurn();
  }
  private nextTurn(): void {
    if (this.trick.cards.length !== 0) {
      this.currentPlayerIndex =
        (this.currentPlayerIndex + 1) % this.players.length;
    }

    const currentPlayer = this.players[this.currentPlayerIndex];

    // Emit current game state
    this.gameStateChanged.emit({
      status: `Player ${currentPlayer.id}'s turn`,
      trick: this.trick,
      players: this.players,
      currentPlayer: currentPlayer,
    });
  }
  // Add these methods to the Game class

  async startGame(): Promise<void> {
    this.deck.distribute(this.players);
    this.trumpSuit = this.deck.suits[Math.floor(Math.random() * 4)];
    console.log(`Trump suit: ${this.trumpSuit}`);
    console.log(this.players);
    await this.claimTricks.performTrickClaiming();

    // Emit initial game state
    this.gameStateChanged.emit({
      status: 'Game started',
      trick: this.trick,
      players: this.players,
      currentPlayer: this.players[this.currentPlayerIndex],
    });
    this.gameInit.emit({
      status: 'Game initiated',
      player: this.players.find((p) => p.isHuman) || {} as Player,
      partner: this.players.find((p) => p.id === this.players.find((p) => p.isHuman)?.partnerId) || {} as Player,
    });
    this.startInterval(30);
    /* while (!this.isGameOver()) {
      // await this.checkStates();
      //this.nextTurn();
    } */
    return Promise.resolve()
  }
  startInterval(frames: number): void {
    const interval = 1000 / frames;
    const runInterval = async () => {
      if (!this.isGameOver()) {
        await this.onInterval();
        setTimeout(runInterval, interval);
      }
    };
    runInterval();
  }

  async onInterval(): Promise<void> {
    if (!this.isGameOver()) {
      await this.wait(200);
      await this.playRound();
    }
  }

  private async checkStates(): Promise<void> {
    if (this.trick.cards.length === this.players.length) {
      console.log('Trick details:');
      this.trick.cards.forEach((t) => {
        console.log(`Player ${t.belongsTo}: ${t}`);
      });
      const trickWinner = this.evaluateTrickWinner(this.trick);
      console.log(`Trick Winner: Player ${trickWinner.id}`);
      let trickClone = JSON.parse(JSON.stringify(this.trick));
      this.trickCompleted.emit({
        winnerId: trickWinner.id,
        trick: trickClone,
      });

      // Reset trick and update trick winner
      this.currentPlayerIndex = this.players.findIndex(
        (p) => p.id === trickWinner.id
      );
      trickWinner.tricksWon++;
      this.trick.winnerId = trickWinner.id;
      this.tricks.push(trickClone); // Deep copy this.trick);

      this.trick.cards = [];
    }

    // Check for game end
    if (this.isGameOver()) {
      console.log('\n--- Final Trick Counts ---');
      this.players.forEach((player) => {
        console.log(`Player ${player.id}: ${player.tricksWon} tricks`);
      });

      // Evaluate the overall game winner after all tricks
      this.evaluateGameWinner();
      const gameWinner = this.determineGameWinner();
      this.gameOver.emit({
        winnerId: gameWinner.id,
      });
    }
  }
  private async playCurrentPlayerCard(player: Player): Promise<Card | null> {
    // Determine card playing strategy based on player type

    return player.playCard(
      this.trick,
      this.trumpSuit || '',
      this.players,
      this.revealedCards,
      this.deck.cards,
    );
  }

  private isGameOver(): boolean {
    return this.tricks.length == 13; // Example condition
  }

  private determineGameWinner(): Player {
    return this.players.reduce((winner, player) =>
      player.tricksWon > winner.tricksWon ? player : winner
    );
  }

  evaluateTrickWinner(trick: Trick): Player {
    const leadingSuit = trick.cards[0].suit;
    let winningCard: Card = trick.cards[0];

    // First, check for trump cards
    const trumpTricks = trick.cards.filter(
      (card: Card) => card.suit === this.trumpSuit
    );
    if (trumpTricks.length > 0) {
      winningCard = trumpTricks.reduce((highest: Card, current: Card) =>
        current.power > highest.power ? current : highest
      );
    } else {
      // If no trump cards, find the highest card of the leading suit
      const leadingSuitTricks = trick.cards.filter(
        (card: Card) => card.suit === leadingSuit
      );
      winningCard = leadingSuitTricks.reduce((highest: Card, current: Card) =>
        current.power > highest.power ? current : highest
      );
    }

    return this.players.find((player) => player.id === winningCard.belongsTo)!;
  }
  evaluateGameWinner(): void {
    let team1Score = this.players[0].tricksWon + this.players[2].tricksWon;
    let team2Score = this.players[1].tricksWon + this.players[3].tricksWon;
    console.log(`Team 1 Score: ${team1Score}`);
    console.log(`Team 2 Score: ${team2Score}`);
    let Team = this.claimWinner?.index == 0 || this.claimWinner?.index == 2 ? 1 : 2;
    this.scoreBoard.updateRoundScore(Team, this.players[this.claimWinner?.index || 0].tricksClaimed, Team === 1 ? team1Score : team2Score);
    console.log(`Team 1 Score: ${team1Score} | Team 2 Score: ${team2Score}`);
    if (team1Score > team2Score) {
      console.log(`Team 1 wins the game!`);
    } else if (team2Score > team1Score) {
      console.log(`Team 2 wins the game!`);
    } else {
    }
  }
  wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
interface team {
  id: number;
  score: number;
  players: Array<{ index: number, tricksWon: number }>;
}
class ScoreBoard {

  private scores: Map<number, number>;
  private team1: team = { id: 1, score: 0, players: [{ index: 0, tricksWon: 0 }, { index: 2, tricksWon: 0 }] };
  private team2: team = { id: 2, score: 0, players: [{ index: 1, tricksWon: 0 }, { index: 3, tricksWon: 0 }] };
  private teams: Array<Array<team>> = [];
  private teamScores: Map<number, number>;
  private roundScores: Array<{ team1: number, team2: number }>;
  private currentRound: number;
  private readonly TOTAL_SCORE: number = 52;

  constructor() {
    this.scores = new Map();
    this.teamScores = new Map();
    this.roundScores = [];
    this.currentRound = 0;

    // Initialize team scores
    this.teamScores.set(1, 0); // Team 1 (players 0 and 2)
    this.teamScores.set(2, 0); // Team 2 (players 1 and 3)
  }
  updateScore(playerIndex: number, playerId: string) {

    switch (playerIndex) {
      case 0:
        this.team1.players[0].tricksWon++;
        break;
      case 1:
        this.team1.players[1].tricksWon++;
        break;
      case 2:
        this.team2.players[0].tricksWon++;
        break;
      case 3:
        this.team2.players[1].tricksWon++
        break;
    }
  }
  initializePlayerScore(playerIndex: number) {
    this.scores.set(playerIndex, 0);
  }

  updateRoundScore(claimingTeam: number, claimedTricks: number, tricksWon: number) {
    let team1Score = 0;
    let team2Score = 0;
    const score = this.calculateRoundScore(claimedTricks, tricksWon);

    // Determine which team gets the score
    if (claimingTeam === 1) {
      team1Score = score;
      team2Score = -score;
    } else {
      team1Score = -score;
      team2Score = score;
    }

    this.roundScores.push({ team1: team1Score, team2: team2Score });

    // Update team scores with reciprocal scoring system
    let currentTeam1Score = this.teamScores.get(1) || 0;
    let currentTeam2Score = this.teamScores.get(2) || 0;

    // Apply reciprocal scoring
    if (team1Score > 0) {
      // If Team 1 is scoring
      if (currentTeam2Score > 0) {
        // First reduce Team 2's score to 0
        const reduction = Math.min(team1Score, currentTeam2Score);
        currentTeam2Score -= reduction;
        team1Score -= reduction;
      }
      // Add remaining score to Team 1
      currentTeam1Score += team1Score;
    } else if (team2Score > 0) {
      // If Team 2 is scoring
      if (currentTeam1Score > 0) {
        // First reduce Team 1's score to 0
        const reduction = Math.min(team2Score, currentTeam1Score);
        currentTeam1Score -= reduction;
        team2Score -= reduction;
      }
      // Add remaining score to Team 2
      currentTeam2Score += team2Score;
    }

    this.teamScores.set(1, currentTeam1Score);
    this.teamScores.set(2, currentTeam2Score);

    this.currentRound++;
  }

  calculateRoundScore(claimedTricks: number, tricksWon: number): number {
    if (tricksWon >= claimedTricks) {
      // If team makes their claim or more, they get the actual tricks won
      return tricksWon;
    } else {
      // Penalty calculation: claimedTricks * (claimedTricks - tricksWon + 1)
      return claimedTricks * (claimedTricks - tricksWon + 1);
    }
  }

  getTeamScore(teamId: number): number {
    return this.teamScores.get(teamId) || 0;
  }

  getRoundScores(): Array<{ team1: number, team2: number }> {
    return this.roundScores;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  isGameOver(): boolean {
    return this.getTeamScore(1) >= this.TOTAL_SCORE || this.getTeamScore(2) >= this.TOTAL_SCORE;
  }

  getWinningTeam(): number | null {
    const team1Score = this.getTeamScore(1);
    const team2Score = this.getTeamScore(2);

    if (team1Score >= this.TOTAL_SCORE) return 1;
    if (team2Score >= this.TOTAL_SCORE) return 2;
    return null;
  }

  resetScores() {
    this.scores.clear();
    this.teamScores.set(1, 0);
    this.teamScores.set(2, 0);
    this.roundScores = [];
    this.currentRound = 0;
  }
}

// Trick interface to store the card and player who played it
interface Trick {
  cards: Card[];
  winnerId?: string;
}
class OtherPlayerStrategyInfo {
  id: string;
  tricksWon: number;
  outOfSuits: Map<string, boolean>;  // Track which suits player is out of
  highCardCount: Map<string, number>; // Count of high cards (A, K, Q) per suit
  playedCards: Card[];
  partnerInfo?: OtherPlayerStrategyInfo; // Reference to partner's info
  tricksBid: number;  // Number of tricks player bid
  strongSuits: string[];  // Suits where player showed strength
  weakSuits: string[];   // Suits where player showed weakness
  lastPlayedPower: number;  // Power of last played card
  isPartner: boolean;    // Whether this player is partner

  constructor(id: string, tricksWon: number, isPartner: boolean = false) {
    this.id = id;
    this.tricksWon = tricksWon;
    this.isPartner = isPartner;
    this.outOfSuits = new Map();
    this.highCardCount = new Map();
    this.playedCards = [];
    this.strongSuits = [];
    this.weakSuits = [];
    this.lastPlayedPower = -1;
    this.tricksBid = 0;
  }

  updateSuitStatus(suit: string, isOut: boolean) {
    this.outOfSuits.set(suit, isOut);
  }

  recordPlayedCard(card: Card) {
    this.playedCards.push(card);
    this.lastPlayedPower = card.power;

    // Update high card count
    if (card.power >= 10) { // A, K, Q
      const currentCount = this.highCardCount.get(card.suit) || 0;
      this.highCardCount.set(card.suit, currentCount + 1);
    }
  }

  analyzeSuitStrength() {
    for (const [suit, highCards] of this.highCardCount) {
      if (highCards >= 2) {
        this.strongSuits.push(suit);
      } else if (this.outOfSuits.get(suit)) {
        this.weakSuits.push(suit);
      }
    }
  }

  getPlayStyle(): 'aggressive' | 'conservative' | 'balanced' {
    if (this.tricksWon > this.tricksBid) {
      return 'aggressive';
    } else if (this.tricksWon < this.tricksBid) {
      return 'conservative';
    }
    return 'balanced';
  }
}
// Running the game

export { Game, Player, Trick, Card, Deck, ScoreBoard, ClaimTricks, OtherPlayerStrategyInfo };
