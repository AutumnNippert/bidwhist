const { Deck, Card, Trick, Player, Team, suits, ranks } = require('./cardgame.js');
const { print } = require('./logger.js');
const prompt = require('prompt-sync')();

class Game {
    constructor() {
        this.players = [new Player('Chris'), new Player('Katy', [], true), new Player('Mom', [], true), new Player('Dad', [], true)];
        this.kitty = [];
        this.deck = new Deck();
        this.currentBid = 0;

        this.history = [];

        this.lastTrick = new Trick();

        this.team1 = new Team(this.players[0], this.players[2]);
        this.team2 = new Team(this.players[1], this.players[3]);
    }

    deal() {
        for (let i = 0; i < 12; i++) {
            for (const player of this.players) {
                player.addCard(this.deck.dealCard());
            }
        }

        for (let i = 0; i < 6; i++) {
            this.kitty.push(this.deck.dealCard());
        }

        for (const player of this.players) {
            player.sortHand();
        }

        for (const player of this.players) {
            //print(player.toString());
        }
        //print(`Kitty has ${this.kitty.length} cards: ${this.kitty.toString()}`);
    }

    async playHand() {
        this.deck.shuffle();
        this.deal();

        // go through each player and ask them to bid
        const bids = [];
        for (const player of this.players) {
            console.clear();
            print(`Scores\n${this.team1.toString()}: ${this.team1.score}\n${this.team2.toString()}: ${this.team2.score}\n`);
            print("Bids:");
            for (let i = 0; i < bids.length; i++) {
                print(`${this.players[i].name}: ${bids[i]}`);
            }
            print();
            const bid = await player.bid(bids);
            bids.push(parseInt(bid));
        }

        // find the highest bid
        let highestBid = 0;
        let bidIndex = 0;
        for (const bid of bids) {
            if (bid > highestBid) {
                highestBid = bid;
                bidIndex = bids.indexOf(bid);
            }
        }

        // find the player with the highest bid based on bidindex
        const highestBidder = this.players[bidIndex];

        // shift so that the highest bidder goes first
        while (this.players[0] != highestBidder) {
            this.players.push(this.players.shift());
        }
        console.clear();


        print(`${highestBidder.name} won the bid with ${highestBid}!\n`);

        let leadingTeam = this.team1.isOnTeam(highestBidder) ? this.team1 : this.team2;
        let otherTeam = this.team1.isOnTeam(highestBidder) ? this.team2 : this.team1;

        // kitty time
        for (const card of this.kitty) {
            highestBidder.addCard(card);
        }
        highestBidder.sortHand();

        // ask the highest bidder to select a trump suit
        const discard = await highestBidder.pickKitty();

        print(discard)

        console.clear();

        let trump_suit = await highestBidder.selectTrumpSuit();

        // convert the jokers to trump
        for (const player of this.players) {
            for (const card of player.hand) {
                if (card.rank.includes("Joker")) {
                    card.suit = trump_suit;
                }
            }
        }

        const trick = new Trick();
        let winningPlayer = null;

        for (; ;) {
            for (const player of this.players) {
                console.clear();
                if (winningPlayer) {
                    print(`${winningPlayer.name} won the trick!`);
                    print(`Last Trick:\n${this.lastTrick.toString()}`);
                }

                print(`Tricks`);
                print(`${leadingTeam.toString()}: ${leadingTeam.tricks.length}`);
                print(`${otherTeam.toString()}: ${otherTeam.tricks.length} | Get to ${8 - highestBid} to win\n`);
                print(`\nLeader: ${this.players[0].name}`);
                print(`Trump Suit: ${trump_suit}\n`);
                print(`On the Table:\n${trick.toString()}`)
                const playerTeam = this.team1.isOnTeam(player) ? this.team1 : this.team2;
                const c = await player.selectCard(trick, this.history, trump_suit, playerTeam);
                trick.addCard(player, c);
            }
            this.history.push(trick);

            winningPlayer = trick.getWinner(trump_suit);
            // get player from p string
            if (this.team1.isOnTeam(winningPlayer)) {
                this.team1.addTrick(trick);
            } else {
                this.team2.addTrick(trick);
            }

            // shift over the players so that the winner goes first (round robin)
            while (this.players[0] != winningPlayer) {
                this.players.push(this.players.shift());
            }

            // check if the game is over
            if (8 - highestBid == otherTeam.tricks.length) {
                console.clear();
                print(`Last Trick:\n${trick.toString()}`);
                //other wins
                print(`${otherTeam.toString()} won the hand!`);
                otherTeam.score += highestBid;
                break;
            }
            // if no cards left
            if (this.players[0].hand.length == 0) {
                //leading team wins
                console.clear();
                print(`Last Trick:\n${trick.toString()}`);

                print(`${leadingTeam.toString()} won the hand!`);
                leadingTeam.score += 7 - otherTeam.tricks.length;
                break;
            }
            // copy the trick to last trick
            this.lastTrick = new Trick();
            for (const pcp of trick.pcps) {
                this.lastTrick.addCard(pcp.player, pcp.card);
            }
            trick.clear();
        }
    }

    async playGame() {
        for (; ;) {
            this.deck.initializeDeck();
            await game.playHand();
            if (this.team1.score >= 21) {
                print(`${this.team1.players[0].name} and ${this.team1.players[1].name} won the game!`);
                break;
            }
            if (this.team2.score >= 21) {
                print(`${this.team2.players[0].name} and ${this.team2.players[1].name} won the game!`);
                break;
            }

            //wait for user input with prompt
            await prompt("Press enter to continue...");

            // reset teams
            this.team1.reset();
            this.team2.reset();
            this.history = [];
            this.kitty = [];
            //rotate players
            this.players.push(this.players.shift());
        }
    }
}

const game = new Game();
game.playGame();