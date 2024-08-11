import {
    Address,
    beginCell,
    Builder,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    DictionaryValue,
    Sender,
    SendMode,
    Slice,
} from '@ton/core';

export type TestMathConfig = {};

export function feeRouterConfigToCell(config: TestMathConfig): Cell {
    return beginCell().endCell();
}

export class TestMath implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new TestMath(address);
    }

    static createFromConfig(config: TestMathConfig, code: Cell, workchain = 0) {
        const data = feeRouterConfigToCell(config);
        const init = { code, data };
        return new TestMath(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getSqrt(
        provider: ContractProvider,
        value: bigint,
        step: bigint,
    ): Promise<{
        result: bigint;
    }> {
        const stack = (
            await provider.get('get_sqrt', [
                { type: 'int', value: value },
                { type: 'int', value: step },
            ])
        ).stack;
        return {
            result: stack.readBigNumber(),
        };
    }
}
