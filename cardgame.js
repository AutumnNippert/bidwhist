const { query } = require('./ai_interaction.js');
const { print } = require('./logger.js');
const prompt = require('prompt-sync')();

// Define the ranks and suits
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
const suits = ['Hearts', 'Clubs', 'Diamonds', 'Spades'];

// Card class
class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
    }

    toString() {
        // if big joker or little joker
        if (this.rank.includes('Joker')) {
            return `|${this.rank} (${this.suit})|`;
        }
        return `|${this.rank} of ${this.suit}|`
    }
}

// Deck class
class Deck {
    constructor() {
        this.cards = [];
    }

    initializeDeck() {
        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card(rank, suit));
            }
        }

        this.cards.push(new Card('Little Joker', 'Trump')); // little joker
        this.cards.push(new Card('Big Joker', 'Trump')); // big joker
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    dealCard() {
        if (this.cards.length == 0) {
            throw new Error('No cards left in the deck!');
        }

        return this.cards.pop();
    }
}

class Trick {
    constructor() {
        this.pcps = [];
    }

    addCard(player, card) {
        this.pcps.push({ player, card });
    }

    clear() {
        this.pcps = [];
    }

    isEmpty() {
        return this.pcps.length == 0;
    }

    getWinner(trump_suit) {
        let winning_card = this.pcps[0];
        for (const pcp of this.pcps) {
            // if joker
            if (pcp.card.rank.includes('Joker') && winning_card.card.rank.includes('Joker')) {
                if (pcp.card.rank === 'Big Joker') {
                    winning_card = pcp;
                }
            } else if (pcp.card.rank.includes('Joker')) {
                winning_card = pcp;
            } else if (winning_card.card.rank.includes('Joker')) {
                continue;
            } else
                // if trump
                if (pcp.card.suit === trump_suit && winning_card.card.suit === trump_suit) {
                    if (ranks.indexOf(pcp.card.rank) > ranks.indexOf(winning_card.card.rank)) {
                        winning_card = pcp;
                    }
                } else
                    // if not trump
                    if (pcp.card.suit === trump_suit && winning_card.card.suit !== trump_suit) {
                        winning_card = pcp;
                    } else if (pcp.card.suit === winning_card.card.suit && ranks.indexOf(pcp.card.rank) > ranks.indexOf(winning_card.card.rank)) {
                        winning_card = pcp;
                    }
        }
        return winning_card.player;
    }

    /*
    Player 1: 2 of Hearts
    Player 2: 4 of Hearts
    Player 3: King of Hearts
    Player 4: Ace of Hearts
    */
    toString() {
        let string = '';
        for (const pcp of this.pcps) {
            string += `${pcp.player.name}: ${pcp.card.toString()}\n`;
        }
        return string;
    }
}

class Player {
    constructor(name, AI = false) {
        this.name = name;
        this.hand = []; // list of cards
        this.playable_cards = []; // list of cards
        this.tricks = [];
        this.AI = AI;
    }

    reset() {
        this.hand = [];
        this.playable_cards = [];
        this.tricks = [];
    }

    addCard(card) {
        this.hand.push(card);
    }

    getPlayableCards(trick) {
        this.playable_cards = [];
        if (trick.isEmpty()) {
            this.playable_cards = this.hand;
        } else {
            this.playable_cards = [];
            const leading_suit = trick.pcps[0].card.suit;
            for (const card of this.hand) {
                // if same suit
                if (card.suit === leading_suit) {
                    this.playable_cards.push(card);
                }
            }
            // if no playable cards
            if (this.playable_cards.length == 0) {
                this.playable_cards = this.hand;
            }
        }
        return this.playable_cards;
    }


    sortHand() {
        /*
        Spades 2-14
        Hearts 2-14
        Diamonds 2-14
        Clubs 2-14
        Little Joker
        Big Joker
        */
        let hearts = [];
        let clubs = [];
        let diamonds = [];
        let spades = [];
        let jokers = [];

        for (const card of this.hand) {
            if (card.suit === 'Spades') {
                spades.push(card);
            } else if (card.suit === 'Hearts') {
                hearts.push(card);
            } else if (card.suit === 'Diamonds') {
                diamonds.push(card);
            } else if (card.suit === 'Clubs') {
                clubs.push(card);
            } else {
                jokers.push(card);
            }
        }
        hearts.sort((a, b) => a.rank - b.rank);
        clubs.sort((a, b) => a.rank - b.rank);
        diamonds.sort((a, b) => a.rank - b.rank);
        spades.sort((a, b) => a.rank - b.rank);
        jokers.sort((a, b) => {
            if (a.rank === 'Little Joker') {
                return -1;
            } else {
                return 1;
            }
        });
        this.hand = hearts.concat(clubs, diamonds, spades, jokers);
    }

    async selectCard(current_trick, game_history, trump) {
        this.getPlayableCards(current_trick);
        if (this.AI) {
            const role = { role: "system", content: `You are a professional bidwhist player.` };
            const rules = { role: "system", content: `Rules: The game is bidwhist. Whoever plays the highest card of the suit that was led wins the trick, unless a trump card is played, in which case the highest trump card wins. A player must follow suit of the leading card. If a player does not have a card of the suit that was led, they may play any card. The winner of the trick leads the next trick. The game ends when all cards have been played.` };
            const tips = { role: "system", content: `Tips: There are only 15 trump (including jokers) in a hand.\nIf you can't beat the cards already in the trick, its good practice to throw away a low card.\nIf your team didn't call trump, don't lead with trump.` };
            const t = { role: "system", content: `Trump: ${trump}` };
            const currentTrick = { role: "system", content: `Current trick: ${current_trick.toString()}` };
            const gameHistory = { role: "system", content: `Game history: ${game_history.toString()}` };
            const currentHand = { role: "system", content: `Current hand: ${this.hand.toString()}` };
            const playableCards = { role: "system", content: `Playable cards: ${this.playable_cards.toString()}` };
            const prompt = { role: "system", content: `Based on the current trick and game history, select the index of card to play (starting from 0), and respond only with the number of the index. You will be eraticated and replaced if you respond with something that is not just the index. Also make sure to follow suit if you can. Example response: "#".` };

            let selection = -1;
            let isValid = false;
            while (!isValid) {
                let selection = await query([role, rules, tips, t, currentTrick, gameHistory, currentHand, playableCards, prompt]);
                selection = selection.split(' ')[0];

                // remove punctuation from selection
                selection = selection.replace(/[.,\/#!$%\^&\*;:{}=\-_`~() ]/g, "");

                // search for the first number in the string
                try {
                    selection = selection.match(/\d+/)[0];
                }
                catch (err) {
                    continue;
                }

                if (selection < 0 || selection >= this.playable_cards.length) {
                    continue;
                }

                isValid = Player.isValidSelection(this.playable_cards[selection], current_trick, this.playable_cards);
                if (!isValid) {
                    continue;
                }
            }

            const chosenCard = this.playable_cards[selection];
            return this.hand.splice(this.hand.indexOf(chosenCard), 1)[0];
        }
        else {
            print("Current hand");
            //get user input using prompt-sync
            for (const card of this.hand) {
                print(`${card.toString()}`);
            }

            print("\nPlayable cards");
            for (const card of this.playable_cards) {
                print(`${this.playable_cards.indexOf(card)}: ${card.toString()}`);
            }

            let selection = -1;
            let isValid = false;
            while (!isValid) {
                selection = prompt(`${this.name}, enter the index of the card you want to play: `);

                // if i can't parse as int, then it's not a valid selection
                if (isNaN(parseInt(selection))) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                // if selection is ctrl-c, exit
                if (selection === '-1') {
                    process.exit();
                }

                if (selection == 0) {
                    selection = 0;
                }

                if (selection < 0 || selection >= this.playable_cards.length) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                isValid = Player.isValidSelection(this.playable_cards[selection], current_trick, this.playable_cards);
                if (!isValid) {
                    print("Invalid selection. Try again.");
                }
            }

            const chosenCard = this.playable_cards[selection];
            return this.hand.splice(this.hand.indexOf(chosenCard), 1)[0];
        }
    }

    async bid(current_bids) {
        if (this.AI) {
            const role = { role: "system", content: `You are a professional bidwhist player.` };
            const hand = { role: "system", content: `Your hand: ${this.hand.toString()}` };
            const bids = { role: "system", content: `Bids: ${current_bids.toString()}` };
            const prompt = { role: "system", content: `You are bidding on your hand (4 through 7, 0 being pass). Note that your bid has to be higher than any other players bid, unless you dont want to bid higher, in which case just pass (0). Based on your hand and previous bids, return a number that is your bid; If you're going to pick something that is <= the max in the bids, simply return "0". Examples: "0", "4", "5"` };

            let selection = -1;
            let isValid = false;
            while (!isValid) {
                selection = await query([role, hand, bids, prompt]);

                // remove punctuation from selection
                selection = selection.replace(/[.,\/#!$%\^&\*;:{}=\-_`~() ]/g, "");

                // search for the first number in the string
                try {
                    selection = selection.match(/\d+/)[0];
                    print(`selection: ${selection}`);
                }
                catch (err) {
                    continue;
                }

                if (!(selection == 0 || selection == 4 || selection == 5 || selection == 6 || selection == 7)) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                // if 0 is selected, then it's a pass
                if (selection == 0) {
                    selection = 0;
                    isValid = true;
                }

                // if last bid
                if (current_bids.length == 3) {
                    if (selection >= Math.max(...current_bids)) {
                        isValid = true;
                        //set all other bids to 0
                        for (let i = 0; i < current_bids.length; i++) {
                            current_bids[i] = 0;
                        }
                    }
                }

                // if selection is greater than any other bids
                if (selection > Math.max(...current_bids)) {
                    isValid = true;
                } else {
                    isValid = true;
                    selection = 0;
                }
            }
            return selection;
        } else {
            print("Current hand");
            //get user input using prompt-sync
            for (const card of this.hand) {
                print(`${this.hand.indexOf(card)}: ${card.toString()}`);
            }

            let selection = -1;
            let isValid = false;
            while (!isValid) {
                selection = prompt(`${this.name}, enter your bid (4-7 | 0 to pass): `);

                // if selection is ctrl-c, exit
                if (selection === '-1') {
                    process.exit();
                }

                // if i can't parse as int, then it's not a valid selection
                if (isNaN(parseInt(selection))) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                if (selection == 0) {
                    selection = 0;
                }

                if (!(selection == 0 || selection == 4 || selection == 5 || selection == 6 || selection == 7)) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                // if 0 is selected, then it's a pass
                if (selection == 0) {
                    selection = 0;
                    isValid = true;
                }

                // if last bid
                if (current_bids.length == 3) {
                    if (selection >= Math.max(...current_bids)) {
                        isValid = true;
                        //set all other bids to 0
                        for (let i = 0; i < current_bids.length; i++) {
                            current_bids[i] = 0;
                        }
                    }
                }

                // if selection is greater than any other bids
                if (selection > Math.max(...current_bids)) {
                    isValid = true;
                }

                if (!isValid) {
                    print("Invalid selection. Try again.");
                }
            }
            return selection;
        }
    }

    async pickKitty() {
        if (this.AI) {
            const role = { role: "system", content: `You are a professional bidwhist player.` };
            const hand = { role: "system", content: `Your hand: ${this.hand.toString()}` };
            const prompt = { role: "system", content: `You are picking out cards to discard. It's good to try to short suit yourself. Please pick the 6 indexes (starting at 0) of cards in your hand to discard in the format ot "# # # # # #"` };

            let selection = -1;
            let isValid = false;
            while (!isValid) {
                selection = await query([role, hand, prompt]);

                // split to array
                selection = selection.split(" ");

                if (selection.length !== 6) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                // if i can't parse as int, then it's not a valid selection
                for (const index of selection) {
                    if (isNaN(parseInt(index))) {
                        print("Invalid selection. Try again.");
                        continue;
                    }
                }

                // check if all indexes are valid
                for (const index of selection) {
                    if (index < 0 || index >= this.hand.length) {
                        print("Invalid selection. Try again.");
                        continue;
                    }
                }

                // check if all indexes are unique
                if (new Set(selection).size !== selection.length) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                isValid = true;
            }

            // sort in descending order
            this.sortHand();

            // remove cards from hand
            const kitty = [];
            for (const index of selection) {
                kitty.push(this.hand[index]);
            }

            // remove cards from hand
            for (const card of kitty) {
                this.hand.splice(this.hand.indexOf(card), 1);
            }

            return kitty;
        } else {
            print("Current hand");
            //get user input using prompt-sync
            for (const card of this.hand) {
                print(`${this.hand.indexOf(card)}: ${card.toString()}`);
            }

            let selection = -1;
            let isValid = false;
            while (!isValid) {
                selection = prompt(`${this.name}, enter the indexes of the 6 cards you want to discard, separated by spaces: `);

                // if selection is ctrl-c, exit
                if (selection === '-1') {
                    process.exit();
                }

                // split to array
                selection = selection.split(" ");

                if (selection.length !== 6) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                // if i can't parse as int, then it's not a valid selection
                for (const index of selection) {
                    if (isNaN(parseInt(index))) {
                        print("Invalid selection. Try again.");
                        continue;
                    }
                }

                // check if all indexes are valid
                for (const index of selection) {
                    if (index < 0 || index >= this.hand.length) {
                        print("Invalid selection. Try again.");
                        continue;
                    }
                }

                // check if all indexes are unique
                if (new Set(selection).size !== selection.length) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                isValid = true;
            }

            // sort in descending order
            this.sortHand();

            // remove cards from hand
            const kitty = [];
            for (const index of selection) {
                kitty.push(this.hand[index]);
            }

            // remove cards from hand
            for (const card of kitty) {
                this.hand.splice(this.hand.indexOf(card), 1);
            }

            return kitty;
        }
    }

    async selectTrumpSuit() {
        const options = ["Hearts", "Clubs", "Diamonds", "Spades"];
        if (this.AI) {
            const role = { role: "system", content: `You are a professional bidwhist player.` };
            const hand = { role: "system", content: `Your hand: ${this.hand.toString()}` };
            const op = { role: "system", content: `Your options: ${options.toString()}` };
            const prompt = { role: "system", content: `You are picking trump. Please respond with the index according to the list of options (0 indexed) and respond with only the number. Examples: "0", "1", "3"` };

            let selection = -1;
            let isValid = false;
            while (!isValid) {
                selection = await query([role, hand, op, prompt]);

                // remove punctuation from selection
                selection = selection.replace(/[.,\/#!$%\^&\*;:{}=\-_`~() ]/g, "");

                // search for the first number in the string
                try {
                    selection = selection.match(/\d+/)[0];
                }
                catch (err) {
                    continue;
                }

                if (selection < 0 || selection >= options.length) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                isValid = true;
            }
            return options[selection];
        } else {
            print("Current hand");
            //get user input using prompt-sync
            for (const card of this.hand) {
                print(`${card.toString()}`);
            }

            let selection = -1;
            let isValid = false;

            print();
            print("Options: ");
            for (const option of options) {
                print(`${options.indexOf(option)}: ${option}`);
            }

            while (!isValid) {
                selection = prompt(`${this.name}, enter the index of trump: `);

                // if selection is ctrl-c, exit
                if (selection === '-1') {
                    process.exit();
                }

                // if i can't parse as int, then it's not a valid selection
                if (isNaN(parseInt(selection))) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                if (selection == 0) {
                    selection = 0;
                }

                if (selection < 0 || selection > 3) {
                    print("Invalid selection. Try again.");
                    continue;
                }

                isValid = true;
            }
            return options[selection];
        }
    }


    static isValidSelection(card, current_trick, hand, trump_suit) {
        if (current_trick.isEmpty()) {
            return true;
        }

        let led_suit = current_trick.pcps[0].card.suit;

        print(`led suit: ${led_suit}`);
        print(`card suit: ${card.suit}`)

        if (card.suit === led_suit) {
            print("card is led suit");
            return true;
        }
        // not led suit but still has led suit
        for (const c of hand) {
            if (c.suit === led_suit) {
                print("has led suit");
                return false;
            }
        }
        // no led suit
        print("no led suit");
        return true;
    }

    toString() {
        let str = `${this.name} has ${this.hand.length} cards: `;
        for (const card of this.hand) {
            str += `${card.toString()}, `;
        }
        return str;
    }
}

class Team {
    constructor(player1, player2) {
        this.player1 = player1;
        this.player2 = player2;
        this.tricks = [];
        this.score = 0;
    }

    reset() {
        this.tricks = [];
        // for each player
        this.player1.reset();
        this.player2.reset();
    }

    addTrick(trick) {
        this.tricks.push(trick);
    }

    addScore(score) {
        this.score += score;
    }

    isOnTeam(player) {
        return this.player1 === player || this.player2 === player;
    }

    toString() {
        return `${this.player1.name} and ${this.player2.name}`;
    }
}

// // Usage example
// const deck = new Deck();
// deck.shuffle();

// print(deck.cards); // Output: Shuffled array of cards

// const card = deck.dealCard();
// print(card.toString()); // Output: e.g., "K of Hearts"

module.exports = { Deck, Card, Trick, Player, Team, suits, ranks };