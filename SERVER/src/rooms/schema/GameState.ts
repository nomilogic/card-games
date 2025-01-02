import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

export class Card extends Schema {
    @type("string") suit: string;
    @type("string") rank: string;
    @type("number") power: number;
    @type("boolean") isPlayed: boolean;
    @type("string") belongsTo: string = "";
    @type("string") symbol: string;

    constructor(suit: string, rank: string, power: number, symbol: string, belongsTo: string = "") {
        super();
        this.suit = suit;
        this.rank = rank;
        this.power = power;
        this.isPlayed = false;
        this.belongsTo = "";
        this.symbol = symbol;
    }
}

export class Player extends Schema {
    @type("string") id: string;
    @type("number") index: number;
    @type("string") partnerId: string;
    @type("boolean") isHuman: boolean;
    @type("boolean") cheatMode: boolean;
    @type("number") tricksWon: number;
    @type("number") tricksClaimed: number;
    @type([Card]) hand: ArraySchema<Card>;
    @type([Card]) tricksWonCards: ArraySchema<Card>;
    @type([Card]) playedCards: ArraySchema<Card>;

    constructor(id: string, partnerId: string, isHuman: boolean = false, index: number = -1, cheatMode: boolean = false) {
        super();
        this.index = index;
        this.id = id;
        this.partnerId = partnerId;
        this.isHuman = isHuman;
        this.cheatMode = cheatMode;
        this.tricksWon = 0;
        this.tricksClaimed = -1;
        this.hand = new ArraySchema<Card>();
        this.tricksWonCards = new ArraySchema<Card>();
        this.playedCards = new ArraySchema<Card>();
    }
}

export class GameState extends Schema {
    @type("string") trumpSuit: string;
    @type({ map: Player }) players = new MapSchema<Player>();
    @type([Card]) revealedCards = new ArraySchema<Card>();
    @type([Card]) currentTrickCards = new ArraySchema<Card>();
    @type("number") currentPlayerIndex: number;
    @type("string") gamePhase: string;
    @type("string") claimWinnerId: string;
    @type("number") highestClaim: number;
    @type("number") consecutivePasses: number;

    constructor() {
        super();
        this.trumpSuit = "";
        this.currentPlayerIndex = 0;
        this.gamePhase = "waiting";
        this.claimWinnerId = "";
        this.highestClaim = 0;
        this.consecutivePasses = 0;
    }
}