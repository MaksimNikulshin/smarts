import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton/sandbox';
import { Cell, Dictionary, beginCell, toNano } from '@ton/core';
import { TestMath } from '../wrappers/Math';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('testMath', () => {
    let nanoMathCode: Cell;

    beforeAll(async () => {
        nanoMathCode = await compile('Math');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let users: SandboxContract<TreasuryContract>[];
    let testMath: SandboxContract<TestMath>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = 1600000000;
        users = await blockchain.createWallets(1);

        testMath = blockchain.openContract(TestMath.createFromConfig({}, nanoMathCode));

        const deployResult = await testMath.sendDeploy(users[0].getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: users[0].address,
            to: testMath.address,
            deploy: true,
            success: true,
        });
    });

    it('should calculate compound interest', async () => {
        const result = await testMath.getSqrt(toNano(10), toNano(0.000005));

        console.log(result);
    });
});
