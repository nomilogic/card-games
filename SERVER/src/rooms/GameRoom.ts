import { Room, Client } from "@colyseus/core";
import { MapSchema } from "@colyseus/schema";
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
            this.state.roundNumber = 1;
            this.state.team1Score = 0;
            this.state.team2Score = 0;
            this.state.lastAction = "Game initialized";
            this.state.turnTimeLeft = 30;
            this.startTurnTimer();
            this.syncGameState();
        });

        this.game.gameStateChanged.on((data) => {
            this.state.lastAction = "Game state updated";
            this.syncGameState();
        });

        this.game.trickCompleted.on((data) => {
            const winningPlayer = this.game.players.find(p => p.id === data.winnerId);
            if (winningPlayer) {
                this.state.lastAction = `Player ${winningPlayer.id} won the trick`;
                // Update team scores based on tricks won
                const playerIndex = this.game.players.findIndex(p => p.id === data.winnerId);
                if (playerIndex % 2 === 0) {
                    this.state.team1Score++;
                } else {
                    this.state.team2Score++;
                }
            }
            this.syncGameState();
        });

        this.game.trumpSuitSelected.on((data) => {
            this.state.trumpSuit = data.suit || "";
            this.state.lastAction = `Trump suit selected: ${data.suit}`;
            this.syncGameState();
        });

        this.game.trickCompleted.on((data) => {
            this.checkGameOver();
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
        // Prevent joining if game has already started
        if (this.state.gamePhase !== "waiting") {
            throw new Error("Game has already started");
        }

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
            // Lock the room when game starts
            this.lock();
        } else {
            this.startJoinTimer();
        }
    }

    assignPlayerPartners() {
        for (let i = 0; i < this.game.players.length; i++) {
            this.game.players[i].partnerId = this.game.players[(i + 1) % this.game.players.length].id;
        }
    }

    private async startJoinTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }

        this.timer = setTimeout(async () => {
            if (this.game.players.length >= 1) {
                // Fill remaining slots with AI players
                while (this.game.players.length < 4) {
                    const aiClient = new AIClient(`ai_${this.game.players.length}`);
                    const aiId = `ai_${this.game.players.length}`;
                    const aiPlayer = new SchemaPlayer(aiId, "AI", false, this.game.players.length);
                    this.state.players.set(aiId, aiPlayer);
                    this.game.addPlayer(aiId, "AI", false, this.game.players.length);
                }
                this.assignPlayerPartners();
                this.state.gamePhase = "initialized";
                this.game.startGame();
                // Lock the room when game starts with AI players
                this.lock();
                this.syncGameState();
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
        // Create a broadcast message for each client
        this.broadcast("syncState", (client: Client) => {
            const currentClientId = client.sessionId;
            const playerState = new MapSchema<SchemaPlayer>();

            // Sync players with filtered information
            this.game.players.forEach((gamePlayer, index) => {
                const sessionId = Array.from(this.state.players.entries())
                    .find(([_, player]) => player.index === index)?.[0];

                if (sessionId) {
                    const schemaPlayer = new SchemaPlayer(
                        sessionId,
                        "",
                        gamePlayer.isHuman,
                        gamePlayer.index
                    );

                    // Only show full hand to the player who owns it
                    if (sessionId === currentClientId) {
                        gamePlayer.hand.forEach(card => {
                            let schemacard = this.convertToSchemaCard(card);
                            schemacard.isPlayed = card.isPlayed;
                            schemacard.belongsTo = card.belongsTo;
                            schemaPlayer.hand.push(schemacard);
                        });
                    } else {
                        // For other players, only show number of cards
                        gamePlayer.hand.forEach(() => {
                            schemaPlayer.hand.push(new SchemaCard("hidden", "hidden", 0, "🂠"));
                        });
                    }

                    // Show only public information for all players
                    schemaPlayer.tricksWon = gamePlayer.tricksWon;
                    schemaPlayer.tricksClaimed = gamePlayer.tricksClaimed;

                    // Sync played cards - these are visible to all
                    gamePlayer.playedCards.forEach(card => {
                        let schemacard = this.convertToSchemaCard(card);
                        schemacard.isPlayed = card.isPlayed;
                        schemacard.belongsTo = card.belongsTo;
                        schemaPlayer.playedCards.push(schemacard);
                    });

                    playerState.set(sessionId, schemaPlayer);
                }
            });

            // Update the state with filtered player information
            this.state.players = playerState;

            // Sync current trick - these cards are visible to all
            this.state.currentTrickCards.clear();
            this.game.trick.cards.forEach(card => {
                let schemacard = this.convertToSchemaCard(card);
                schemacard.isPlayed = card.isPlayed;
                schemacard.belongsTo = card.belongsTo;
                this.state.currentTrickCards.push(schemacard);
            });

            // Sync game state
            this.state.claimWinnerId = this.game.claimWinner?.id || "";
            this.state.currentPlayerIndex = this.game.currentPlayerIndex || 0;
            this.state.trumpSuit = this.game.trumpSuit || "";
        });
    }

    private convertToSchemaCard(gameCard: Card): SchemaCard {
        return new SchemaCard(
            gameCard.suit,
            gameCard.rank,
            gameCard.power,
            gameCard.symbol,
        );
    }

    private getPlayerIndex(sessionId: string): number {
        return this.state.players.get(sessionId)?.index || 0
    };

    private startTurnTimer() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            if (this.state.turnTimeLeft > 0) {
                this.state.turnTimeLeft--;
            } else {
                // Time's up for current player
                const currentPlayer = this.game.players[this.state.currentPlayerIndex];
                if (currentPlayer) {
                    // Auto-play a random card or pass
                    const randomCard = currentPlayer.hand[0];
                    if (randomCard) {
                        currentPlayer.playHumanCard(randomCard, this.game.trick);
                        this.state.lastAction = `Auto-played card for Player ${currentPlayer.id} (time's up)`;
                    }
                }
                this.state.turnTimeLeft = 30; // Reset timer for next player
            }
        }, 1000);
    }

    private checkGameOver() {
        // Example game over condition: when all tricks are played
        const totalTricks = this.game.players.reduce((sum, player) => sum + player.tricksWon, 0);
        if (totalTricks >= 13) { // Assuming 13 tricks in total
            this.state.isGameOver = true;
            this.state.winningTeam = this.state.team1Score > this.state.team2Score ? "Team 1" : "Team 2";
            this.state.lastAction = `Game Over! ${this.state.winningTeam} wins!`;
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }
    }
}

class AIClient implements Partial<Client> {
    sessionId: string;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
    }
}