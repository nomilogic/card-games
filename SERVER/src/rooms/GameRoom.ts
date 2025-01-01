import { Room, Client } from "@colyseus/core";
import { GameState, Player as SchemaPlayer, Card as SchemaCard } from "./schema/GameState";
import { Game, Player, Card } from "../Game";

export class GameRoom extends Room<GameState> {
    private game: Game;
    private timer: NodeJS.Timeout | null = null;
    private readonly joinTimeout: number = 3;

    constructor() {
        super();
        this.setState(new GameState());
        this.maxClients = 4;
        this.game = new Game();
    }
    onCreate(options: any) {
        this.game.gameInit.on((data) => {
            this.state.gamePhase = "initialized";
            this.syncGameState();
        });

        this.game.gameStateChanged.on((data) => {
            this.syncGameState();
        });

        this.game.trickCompleted.on((data) => {
            this.syncGameState();
        });

        this.game.trumpSuitSelected.on((data) => {
            this.state.trumpSuit = data.suit || "";
            this.syncGameState();
        });

        this.onMessage("playCard", (client, message) => {
            const playerId = this.getPlayerIndex(client.sessionId);
            const player = this.game.players[playerId];
            if (player) {
                const card = player.hand.find(c =>
                    c.suit === message.suit &&
                    c.power === message.power
                );
                if (card) {
                    player.playHumanCard(card, this.game.trick);
                }
            }
        });

        this.onMessage("claimTricks", (client, message) => {
            const playerId = this.getPlayerIndex(client.sessionId);
            const player = this.game.players[playerId];
            console.log('claimTricks', message, playerId);
            if (player) {

                this.game.claimTricks.submitHumanClaim(message.claim);
            }

        });

        this.onMessage("selectTrump", (client, message) => {
            const playerId = client.sessionId
            if (playerId === this.state.claimWinnerId) {
                this.game.claimTricks.submitHumanTrumpSuit(message.suit);
            }
        });
    }

    onJoin(client: Client) {
        //const playerIndex = this.clients.length - 1;

        const player = new SchemaPlayer(
            client.sessionId,
            "",
            true,

            this.game.players.length

        );
        this.state.players.set(client.sessionId, player);
        const playerId = client.sessionId;

        this.game.addPlayer(playerId, "", true, this.game.players.length);
        this.syncGameState();

        if (this.game.players.length === 4) {
            this.assignPlayerPartners();
            this.state.gamePhase = "initialized";
            this.game.startGame();
        } else {
            this.startJoinTimer();
        }

        // Update the game's player to be human
        //this.game.players[playerIndex].isHuman = true;

        // if (this.clients.length === 4) {
        //     this.game.startGame();
        // }
    }
    assignPlayerPartners() {
        for (let i = 0; i < this.game.players.length; i++) {
            this.game.players[i].partnerId = this.game.players[(i + 1) % this.game.players.length].id;
        }
    }
    private startJoinTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }

        this.timer = setTimeout(() => {
            if (this.game.players.length >= 1) {
                // Fill remaining slots with AI players
                while (this.game.players.length < 4) {
                    const aiId = `ai_${this.game.players.length}`;
                    const aiPlayer = new SchemaPlayer(aiId, "AI", false, this.game.players.length);
                    this.state.players.set(aiId, aiPlayer);
                    this.game.addPlayer(aiId, "AI", false, this.game.players.length);
                }
                this.state.gamePhase = "initialized";
                this.game.startGame();
                this.syncGameState();
                //this.startGame();
            }
        }, this.joinTimeout * 1000);
    }
    onLeave(client: Client) {
        const playerIndex = this.getPlayerIndex(client.sessionId);
        if (playerIndex !== -1) {
            this.game.players[playerIndex].isHuman = false;
        }
        this.state.players.delete(client.sessionId);
    }

    private syncGameState() {
        // Sync players
        this.game.players.forEach((gamePlayer, index) => {
            const sessionId = Array.from(this.state.players.entries())
                .find(([_, player]) => player.index === index)?.[0];

            if (sessionId) {
                const schemaPlayer = this.state.players.get(sessionId);
                if (schemaPlayer) {
                    // Sync hand
                    schemaPlayer.hand.clear();
                    gamePlayer.hand.forEach(card => {
                        let schemacard = this.convertToSchemaCard(card);
                        schemacard.isPlayed = card.isPlayed;
                        schemacard.belongsTo = card.belongsTo;
                        schemaPlayer.hand.push(this.convertToSchemaCard(card));
                    });

                    // Sync tricks won
                    schemaPlayer.tricksWon = gamePlayer.tricksWon;
                    schemaPlayer.tricksClaimed = gamePlayer.tricksClaimed;

                    // Sync played cards
                    schemaPlayer.playedCards.clear();
                    gamePlayer.playedCards.forEach(card => {
                        schemaPlayer.playedCards.push(this.convertToSchemaCard(card));
                    });
                }
            }
        });

        // Sync current trick
        this.state.currentTrickCards.clear();
        this.game.trick.cards.forEach(card => {
            this.state.currentTrickCards.push(this.convertToSchemaCard(card));
        });

        // Sync game state
        this.state.claimWinnerId = this.game.claimWinner?.id || "";
        this.state.currentPlayerIndex = this.game.currentPlayerIndex || 0;
        this.state.trumpSuit = this.game.trumpSuit || "";
    }

    private convertToSchemaCard(gameCard: Card): SchemaCard {
        return new SchemaCard(
            gameCard.suit,
            gameCard.rank,
            gameCard.power,
            gameCard.symbol
        );
    }

    private getPlayerIndex(sessionId: string): number {
        return this.state.players.get(sessionId)?.index || 0
    };


}
class AIClient implements Partial<Client> {
    sessionId: string;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
    }
}