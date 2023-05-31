const { Deck, Card, Trick, Player, Team, suits, ranks } = require('./cardgame.js');

class Game {


    constructor() {
        this.players = [new Player('Chris'), new Player('Katy', [], false), new Player('Mom'), new Player('Dad')];
        this.kitty = [];
        this.deck = new Deck();
        this.currentBid = 0;

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
            //console.log(player.toString());
        }
        //console.log(`Kitty has ${this.kitty.length} cards: ${this.kitty.toString()}`);
    }

    async playHand() {
        this.deck.shuffle();
        this.deal();

        // go through each player and ask them to bid
        const bids = [];
        for (const player of this.players) {
            console.clear();
            console.log(`Scores\n${this.team1.toString()}: ${this.team1.score}\n${this.team2.toString()}: ${this.team2.score}\n`);
            console.log("Bids:");
            for (const bid of bids) {
                console.log(`${this.players[bids.indexOf(bid)].name}: ${bid}`);
            }
            console.log();
            const bid = await player.bid();
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


        console.log(`${highestBidder.name} won the bid with ${highestBid}!\n`);

        let leadingTeam = this.team1.isOnTeam(highestBidder) ? this.team1 : this.team2;
        let otherTeam = this.team1.isOnTeam(highestBidder) ? this.team2 : this.team1;

        // kitty time
        for (const card of this.kitty) {
            highestBidder.addCard(card);
        }
        highestBidder.sortHand();

        // ask the highest bidder to select a trump suit
        const discard = await highestBidder.pickKitty();

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
        const history = [];
        let winningPlayer = null;

        for (; ; trick.clear()) {
            for (const player of this.players) {
                console.clear();
                if (winningPlayer) {
                    console.log(`${winningPlayer.name} won the trick!`);
                }

                console.log(`Tricks\n`);
                console.log(`${leadingTeam.toString()}: ${leadingTeam.tricks.length}\n`);
                console.log(`${otherTeam.toString()}: ${otherTeam.tricks.length} | Get to ${8 - highestBid} to win\n`);
                console.log(`\nLeader: ${this.players[0].name}`);
                console.log(`Trump Suit: ${trump_suit}\n`);
                console.log(`On the Table:\n${trick.toString()}`)
                const c = await player.selectCard(trick, history, trump_suit);
                trick.addCard(player, c);
            }
            history.push(trick);

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
                //other wins
                console.log(`${otherTeam.toString()} won the game!`);
                otherTeam.score += highestBid;
                break;
            }
            // if no cards left
            if (this.players[0].hand.length == 0) {
                //leading team wins
                console.log(`${leadingTeam.toString()} won the game!`);
                leadingTeam.score += 7 - otherTeam.tricks.length;
                break;
            }
        }
    }

    async playGame() {
        for (; ;) {
            this.deck.initializeDeck();
            await game.playHand();
            if (this.team1.score >= 21) {
                console.log(`${this.team1.players[0].name} and ${this.team1.players[1].name} won the game!`);
                break;
            }
            if (this.team2.score >= 21) {
                console.log(`${this.team2.players[0].name} and ${this.team2.players[1].name} won the game!`);
                break;
            }

            //wait for user input
            await new Promise(resolve => setTimeout(resolve, 5000));

            // reset teams
            this.team1.reset();
            this.team2.reset();
        }
    }
}

const game = new Game();
game.playGame();