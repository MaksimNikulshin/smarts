import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { Master, masterConfigToCell, MasterConfig } from '../wrappers/Master';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { JettonMinter } from '../wrappers/JettonMinter';
import { JettonWallet } from '../wrappers/JettonWallet';
import exp from 'constants';

describe('Master', () => {
    let code: Cell;
    let codeJettonMinter: Cell;
    let codeJettonWallet: Cell;

    beforeAll(async () => {
        code = await compile('Master');
        codeJettonMinter = await compile('JettonMinter');
        codeJettonWallet = await compile('JettonWallet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let master: SandboxContract<Master>;
    let users: SandboxContract<TreasuryContract>[];
    let jettonMinter: SandboxContract<JettonMinter>;
    let jettonWallets: SandboxContract<JettonWallet>[];

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 1600000000;
        users = await blockchain.createWallets(100);
        jettonMinter = blockchain.openContract(
            JettonMinter.createFromConfig(
                {
                    admin: users[0].address,
                    content: Cell.EMPTY,
                    walletCode: codeJettonWallet,
                },
                codeJettonMinter,
            ),
        );
        await jettonMinter.sendDeploy(users[0].getSender(), toNano('0.1'));
        jettonWallets = await Promise.all(
            users.map(async (user) =>
                blockchain.openContract(
                    JettonWallet.createFromAddress(await jettonMinter.getWalletAddressOf(user.address)),
                ),
            ),
        );

        for (let i = 0; i < 99; i++) {
            await jettonMinter.sendMint(users[0].getSender(), toNano('100'), 0n, users[i].address, toNano('100'));
        }

        master = blockchain.openContract(
            Master.createFromConfig(
                {
                    admin: users[0].address,
                    market: users[1].address,
                    marketFee: toNano('0.02'),
                    minBet: toNano('0.5'),
                    jettonAmount: toNano('800000000'),
                    ephemeralJettonBalance: toNano('1124661935'),
                    ephemeralTonAmount: toNano('445.178682208'),
                },
                code,
            ),
        );

        let deployResult = await master.sendSetData(
            users[0].getSender(),
            toNano('0.02'),
            1n,
            await jettonMinter.getWalletAddressOf(master.address),
            users[1].address,
            users[99].address,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: users[0].address,
            to: master.address,
            deploy: true,
            success: true,
        });

        let masterData = await master.getContractData();

        expect(masterData.admin).toEqualAddress(users[0].address);
        expect(masterData.router).toEqualAddress(users[99].address);
        expect(masterData.market).toEqualAddress(users[1].address);
        expect(masterData.marketFee).toEqual(toNano('0.02'));
        expect(masterData.minBet).toEqual(toNano('0.5'));
        expect(masterData.jettonAmount).toEqual(toNano('800000000'));
        expect(masterData.ephemeralJettonBalance).toEqual(toNano('1124661935'));
        expect(masterData.ephemeralTonAmount).toEqual(toNano('445.178682208'));
        expect(masterData.fee).toEqual(0n);
        expect(masterData.active).toBeFalsy();
        expect(masterData.jettonWallet).toEqualAddress(await jettonMinter.getWalletAddressOf(master.address));
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and master are ready to use
    });
});
