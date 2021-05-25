import { createStore, Store, useStore as baseUseStore, createLogger } from "vuex";
import { socket, emitter } from "./setup";
import router from './router'
import {formatBlackCard} from './socket'
import { InjectionKey } from 'vue'

export const key: InjectionKey<Store<State>> = Symbol()

export function useStore () {
    return baseUseStore(key)
}

export interface State {
    name: string;
    lobby: string;
    zar: undefined | string;
    host: string;
    handSize: number;
    pointsToWin: number;
    cardDecks: string[];
    gameState: "Home" | "Lobby" | "Game";
    endLobby: boolean;
    blackCard: undefined | {text: string, pick: number};
    revealed: Record<string, any>;
    posNames: Object;
    hands: string[];
    users: User[];
    connected: boolean;
    winner: string;
    timer: number;
    language: string;
}

export interface User {
    name: string,
    placed: boolean,
    connected: boolean,
    points: number,
    trophy?: string
}

export const store = createStore<State>({
    state: {
        name: "",
        lobby: "",
        zar: "",
        host: "",
        handSize: 7,
        pointsToWin: 5,
        cardDecks: ["Base"],
        gameState: "Home", // Home, Lobby, Game
        endLobby: false,
        blackCard: undefined,
        revealed: {},
        posNames: {},
        hands: [],
        users: [],
        connected: false,
        winner: "",
        timer: 0,
        language: "en",
    },
    mutations: {
        setLanguage(state, lang) {
            state.language = lang;
        },
        setCardDecks(state, cardDecks) {
            state.cardDecks = cardDecks;
        },
        resetLobby(state) {
            state.zar = "";
            state.host = "";
            state.handSize = 7;
            state.pointsToWin = 5;
            state.cardDecks = ["Base"];
            state.gameState = "Home";
            state.endLobby = false;
            state.blackCard = undefined;
            state.revealed = {};
            state.posNames = {};
            state.hands = [];
            state.users = [];
            state.winner = "";
            state.language = "en";
        },
    },
    actions: {
        join_lobby({ state }) {
            socket.emit(
                "join",
                state.name,
                state.lobby,
                (response : any) => {
                    if (handleResponse(response)) return;

                    console.log(response);

                    state.users = response.players;
                    state.host = response.host;
                    state.handSize = response.hand_size;
                    state.cardDecks = response.card_decks;
                    state.pointsToWin = response.points_to_win;
                    state.language = response.language;

                    if (response.hand) {
                        state.gameState = "Game";
                        state.hands = response.hand;
                        state.blackCard = formatBlackCard(response.black);
                        state.zar = response.zar;
                        state.revealed = response.revealed;

                        router.push(`/game/${state.lobby}`);
                    } else {
                        state.gameState = "Lobby";
                        router.push(`/lobby/${state.lobby}`);
                    }
                }
            );
        },
        start_game({ state }) {
            socket.emit("start_game", (response: any) => {
                handleResponse(response);
            });
        },
        place_cards({ state }, cards) {
            console.log("Cards: ", cards);

            socket.emit("place_cards", cards, (response: any) => {
                handleResponse(response);
            });
        },
        reveal_cards({ state }, pos) {
            state.revealed[pos] = [];

            socket.emit("reveal", pos, (response:any) => {
                handleResponse(response);
            });
        },
        winner({ state }, pos) {
            console.log("Winner: ", pos);

            socket.emit("winner_selected", pos, (response: any) => {
                handleResponse(response);
            });
        },
        leave_game({ state, commit }) {
            commit("resetLobby");
            router.push("/");
            socket.emit("leave");
        },
        change_settings({ state }, settings) {
            socket.emit("change_settings", settings, (response: any) => {
                handleResponse(response);
            });
        },
        delete_card({ state }, card) {
            socket.emit("delete_card", card, (response: any) => {
                if (!handleResponse(response)) {
                    state.hands = state.hands.filter((c) => c !== card);
                }
            });
        },
    },
    plugins: [createLogger({
        logger: console
    })]
});

function handleResponse(response: any) {
    if (!response) return false;
    if (response.error) {
        console.error(response.error);
        emitter.emit("error", response.error);
        return true;
    }
    if (response.info) {
        console.info(response.info);
        emitter.emit("info", response.info);
    }
    return false;
}
