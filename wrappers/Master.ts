import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';

export type MasterConfig = {
    admin: Address;
    market: Address;
    marketFee: bigint;
    minBet: bigint;
    jettonAmount: bigint;
    ephemeralJettonBalance: bigint;
    ephemeralTonAmount: bigint;
};

export function masterConfigToCell(config: MasterConfig): Cell {
    return beginCell()
        .storeAddress(config.admin)
        .storeUint(0, 2)
        .storeAddress(config.market)
        .storeRef(
            beginCell()
                .storeUint(config.marketFee, 64)
                .storeCoins(config.minBet)
                .storeCoins(config.jettonAmount)
                .storeCoins(config.ephemeralJettonBalance)
                .storeCoins(config.ephemeralTonAmount)
                .storeCoins(0)
                .storeUint(0, 3)
                .storeRef(beginCell().storeUint(0, 4).endCell())
                .endCell(),
        )
        .endCell();
}

export class Master implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Master(address);
    }

    static createFromConfig(config: MasterConfig, code: Cell, workchain = 0) {
        const data = masterConfigToCell(config);
        const init = { code, data };
        return new Master(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSetData(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        queryId: bigint,
        jettnWallet: Address,
        jettnWalletWrap: Address,
        router: Address,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x7a88020a, 32)
                .storeUint(queryId, 64)
                .storeAddress(jettnWallet)
                .storeAddress(jettnWalletWrap)
                .storeAddress(router)
                .endCell(),
        });
    }

    async sendBuy(provider: ContractProvider, via: Sender, value: bigint, queryId: bigint) {
        await provider.internal(via, {
            value: (value * 100n) / 98n + toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x402eff0b, 32).storeUint(queryId, 64).endCell(),
        });
    }

    async sendGetFee(provider: ContractProvider, via: Sender, value: bigint, queryId: bigint, prisePool: Address) {
        await provider.internal(via, {
            value: (value * 100n) / 98n + toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x06b5e556, 32).storeUint(queryId, 64).storeAddress(prisePool).endCell(),
        });
    }

    async sendConfirmation(provider: ContractProvider, via: Sender, value: bigint, queryId: bigint) {
        await provider.internal(via, {
            value: (value * 100n) / 98n + toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x7a435aed, 32).storeUint(queryId, 64).endCell(),
        });
    }

    async getContractData(provider: ContractProvider) {
        const stack = (await provider.get('get_contract_data', [])).stack;
        return {
            admin: stack.readAddress(),
            router: stack.readAddress(),
            market: stack.readAddress(),
            marketFee: stack.readBigNumber(),
            minBet: stack.readBigNumber(),
            jettonAmount: stack.readBigNumber(),
            ephemeralJettonBalance: stack.readBigNumber(),
            ephemeralTonAmount: stack.readBigNumber(),
            fee: stack.readBigNumber(),
            active: stack.readBoolean(),
            finished: stack.readBoolean(),
            confirmation: stack.readBoolean(),
            jettonWallet: stack.readAddress(),
            jettonWalletWrap: stack.readAddress(),
        };
    }
}
