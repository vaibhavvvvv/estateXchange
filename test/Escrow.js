const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let buyer, seller, lender, inspector;
    let realEstate, escrow;

    //will execute that function before every test in the suite.
    beforeEach(async() =>{
         //setup accounts
         [buyer, seller, lender, inspector]   = await ethers.getSigners();  

         //deploy Real Estate
         const RealEstate= await ethers.getContractFactory('RealEstate');
         realEstate =  await RealEstate.deploy();
 
         //Mint
         let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS");
         await transaction.wait();
 
         const Escrow = await ethers.getContractFactory('Escrow');
         escrow = await Escrow.deploy( realEstate.address, seller.address, lender.address, inspector.address );
 
         //approve property - 
         transaction = await realEstate.connect(seller).approve(escrow.address, 1)
         await transaction.wait()

         //list property
         transaction = await escrow.connect(seller).list(1, buyer.address, tokens(10), tokens(5))
         await transaction.wait()


    } )

    describe('deployment', ()=>{
        it('Returns Nft Address ', async () =>{
            let result = await escrow.nftAddress();
            expect(result).to.be.equal(realEstate.address);
        });

        it('Returns Seller Address ', async () =>{
            result = await escrow.seller();
            expect(result).to.be.equal(seller.address);
        });

        it('Returns Lender Address ', async () =>{
            result = await escrow.lender();
            expect(result).to.be.equal(lender.address);
        });

        it('Returns Inspector Address ', async () =>{
            result = await escrow.inspector();
            expect(result).to.be.equal(inspector.address);
        });
    })

    describe('Listing', ()=>{

        it('Updates as Listed', async () =>{
            const result = await escrow.isListed(1)
            expect(result).to.be.equal(true)
        });

        it('Returns buyer', async () =>{
            const result = await escrow.buyer(1)
            expect(result).to.be.equal(buyer.address)
        });

        it('Returns purchasePrice ', async () =>{
            const result = await escrow.purchasePrice(1)
            expect(result).to.be.equal(tokens(10))
        });

        it('Returns escrowAmount ', async () =>{
            const result = await escrow.escrowAmount(1)
            expect(result).to.be.equal(tokens(5))
        });

        it('Update Ownership', async () =>{
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
        });
       
    })

    describe('Deposits', ()=>{

        it('Updates Contract balance', async () =>{
            const transaction = await escrow.connect(buyer).depositEarnest(1, {value : tokens(5)});
            await transaction.wait();
            const result = await escrow.getBalance();
            expect(result).to.be.equal(tokens(5));
        });
       
    })

    describe('Inspection', ()=>{

        it('Updates Inspection Status', async () =>{
            const transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await transaction.wait();
            const result = await escrow.inspectionPassed(1);
            expect(result).to.be.equal(true);
        }); 
    })

    describe('Approval', ()=>{

        it('Updates Approval Status', async () =>{
            let transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();

            expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
            expect(await escrow.approval(1, seller.address)).to.be.equal(true);
            expect(await escrow.approval(1, lender.address)).to.be.equal(true);

        });
       
    })

    describe("Sale", async ()=>{
       beforeEach (async() => {
        let transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(5)})
        await transaction.wait();

        transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
        await transaction.wait();

        transaction = await escrow.connect(buyer).approveSale(1);
        await transaction.wait();

        transaction = await escrow.connect(seller).approveSale(1);
        await transaction.wait();

        transaction = await escrow.connect(lender).approveSale(1);
        await transaction.wait();

        await lender.sendTransaction({to: escrow.address, value: tokens(5)})
        
        transaction = await escrow.connect(seller).finalizeSale(1);
        await transaction.wait();
       })

       it("Updates Ownership", async() =>{
        expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
       })

       it("Updates balance", async() =>{
        expect(await escrow.getBalance()).to.be.equal(0)
       })
    })

})
