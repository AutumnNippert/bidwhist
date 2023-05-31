const { query } = require('./ai_interaction.js');
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
        if (this.cards.length === 0) {
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
        return this.pcps.length === 0;
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
    constructor(name, hand = [], AI = false) {
        this.name = name;
        this.hand = hand; // list of cards
        this.tricks = [];
        this.AI = AI;
    }

    reset() {
        this.hand = [];
        this.tricks = [];
    }

    addCard(card) {
        this.hand.push(card);
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
        if (this.AI) {
            const role = { role: "system", content: `You are a professional bidwhist player.` };
            const rules = { role: "system", content: `Rules: The game is bidwhist. Whoever plays the highest card of the suit that was led wins the trick, unless a trump card is played, in which case the highest trump card wins. A player must follow suit of the leading card. If a player does not have a card of the suit that was led, they may play any card. The winner of the trick leads the next trick. The game ends when all cards have been played.` };
            const tips = { role: "system", content: `Tips: There are only 15 trump (including jokers) in a hand.\nIf you can't beat the cards already in the trick, its good practice to throw away a low card.` };
            const t = { role: "system", content: `Trump: ${trump}` };
            const currentTrick = { role: "system", content: `Current trick: ${current_trick.toString()}` };
            const gameHistory = { role: "system", content: `Game history: ${game_history.toString()}` };
            const currentHand = { role: "system", content: `Current hand: ${this.hand.toString()}` };
            const prompt = { role: "system", content: `Based on the current trick and game history, select the index of card to play (starting from 0), and respond only with the number of the index. You will be eraticated and replaced if you respond with something that is not just the index: ` };

            let selection = -1;
            let isValid = false;
            while (!isValid) {
                let selection = await query([role, rules, tips, t, currentTrick, gameHistory, currentHand, prompt]);
                // remove punctuation from selection
                selection = selection.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

                if (isNaN(parseInt(selection))) {
                    prompt.content = `Invalid selection. Try again. Based on the current trick and game history, select the index of card to play (starting from 0), and respond only with the number of the index. You will be eraticated and replaced if you respond with something that is not just the index: `;
                    continue;
                }

                if (selection < 0 || selection >= this.hand.length) {
                    prompt.content = `Invalid selection. Try again. Based on the current trick and game history, select the index of card to play (starting from 0), and respond only with the number of the index. You will be eraticated and replaced if you respond with something that is not just the index: `;
                    continue;
                }

                isValid = Player.isValidSelection(this.hand[selection], current_trick, this.hand);
                if (!isValid) {
                    prompt.content = `Invalid selection. Try again. Based on the current trick and game history, select the index of card to play (starting from 0), and respond only with the number of the index. You will be eraticated and replaced if you respond with something that is not just the index: `;
                    continue;
                }
            }


            return this.hand.splice(selection, 1)[0];
        }
        else {
            console.log("Current hand");
            //get user input using prompt-sync
            for (const card of this.hand) {
                console.log(`${this.hand.indexOf(card)}: ${card.toString()}`);
            }

            let selection = -1;
            let isValid = false;
            while (!isValid) {
                selection = prompt(`${this.name}, enter the index of the card you want to play: `);

                // if i can't parse as int, then it's not a valid selection
                if (isNaN(parseInt(selection))) {
                    console.log("Invalid selection. Try again.");
                    continue;
                }

                // if selection is ctrl-c, exit
                if (selection === '-1') {
                    process.exit();
                }

                if (selection == 0) {
                    selection = 0;
                }

                if (selection < 0 || selection >= this.hand.length) {
                    console.log("Invalid selection. Try again.");
                    continue;
                }

                isValid = Player.isValidSelection(this.hand[selection], current_trick, this.hand);
                if (!isValid) {
                    console.log("Invalid selection. Try again.");
                }
            }

            return this.hand.splice(selection, 1)[0];
        }
    }

    async bid() {
        if (this.AI) {
            const role = { role: "system", content: `You are a professional bidwhist player.` };
            return 0;
        } else {
            console.log("Current hand");
            //get user input using prompt-sync
            for (const card of this.hand) {
                console.log(`${this.hand.indexOf(card)}: ${card.toString()}`);
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
                    console.log("Invalid selection. Try again.");
                    continue;
                }

                if (selection == 0) {
                    selection = 0;
                }

                if (selection < 0 || selection > 7 || selection === 1 || selection === 2 || selection === 3) {
                    console.log("Invalid selection. Try again.");
                    continue;
                }

                isValid = true;
            }
            return selection;
        }
    }

    async pickKitty() {
        if (this.AI) {
            const role = { role: "system", content: `You are a professional bidwhist player.` };
            return 0;
        } else {
            console.log("Current hand");
            //get user input using prompt-sync
            for (const card of this.hand) {
                console.log(`${this.hand.indexOf(card)}: ${card.toString()}`);
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
                    console.log("Invalid selection. Try again.");
                    continue;
                }

                // if i can't parse as int, then it's not a valid selection
                for (const index of selection) {
                    if (isNaN(parseInt(index))) {
                        console.log("Invalid selection. Try again.");
                        continue;
                    }
                }

                // check if all indexes are valid
                for (const index of selection) {
                    if (index < 0 || index >= this.hand.length) {
                        console.log("Invalid selection. Try again.");
                        continue;
                    }
                }

                // check if all indexes are unique
                if (new Set(selection).size !== selection.length) {
                    console.log("Invalid selection. Try again.");
                    continue;
                }

                isValid = true;
            }

            // sort in descending order
            this.sortHand();

            // remove cards from hand
            const kitty = [];
            for (const index of selection) {
                kitty.push(this.hand.splice(index, 1)[0]);
            }

            return kitty;
        }
    }

    async selectTrumpSuit() {
        const options = ["Hearts", "Clubs", "Diamonds", "Spades"];
        if (this.AI) {
            const role = { role: "system", content: `You are a professional bidwhist player.` };
            return 0;
        } else {
            console.log("Current hand");
            //get user input using prompt-sync
            for (const card of this.hand) {
                console.log(`${card.toString()}`);
            }

            let selection = -1;
            let isValid = false;

            console.log();
            console.log("Options: ");
            for (const option of options) {
                console.log(`${options.indexOf(option)}: ${option}`);
            }

            while (!isValid) {
                selection = prompt(`${this.name}, enter the index of trump: `);

                // if selection is ctrl-c, exit
                if (selection === '-1') {
                    process.exit();
                }

                // if i can't parse as int, then it's not a valid selection
                if (isNaN(parseInt(selection))) {
                    console.log("Invalid selection. Try again.");
                    continue;
                }

                if (selection == 0) {
                    selection = 0;
                }

                if (selection < 0 || selection > 3) {
                    console.log("Invalid selection. Try again.");
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

        console.log(`led suit: ${led_suit}`);
        console.log(`card suit: ${card.suit}`)

        if (card.suit === led_suit) {
            console.log("card is led suit");
            return true;
        }
        // not led suit but still has led suit
        for (const c of hand) {
            if (c.suit === led_suit) {
                console.log("has led suit");
                return false;
            }
        }
        // no led suit
        console.log("no led suit");
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

// console.log(deck.cards); // Output: Shuffled array of cards

// const card = deck.dealCard();
// console.log(card.toString()); // Output: e.g., "K of Hearts"

module.exports = { Deck, Card, Trick, Player, Team, suits, ranks };