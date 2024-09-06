// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

async function main() {
  //setup accounts
  [buyer, seller, lender, inspector]   = await ethers.getSigners();  
  //deploy Real Estate
  const RealEstate= await ethers.getContractFactory('RealEstate');
  realEstate =  await RealEstate.deploy();
  await realEstate.deployed()

  console.log(`Deployed Real Estate contract at ${realEstate.address}`);
  console.log(`Minting 3 properties...`);

  for(let i = 0; i<3; i++){
    let transaction = await realEstate.connect(seller).mint(`https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/${i +1}.json`);
    await transaction.wait();
  }

  //Deploy Escrow
  const Escrow = await ethers.getContractFactory('Escrow');
  escrow = await Escrow.deploy( realEstate.address, seller.address, lender.address, inspector.address );
  await escrow.deployed();

  console.log(`Deployed Escrow contract at ${escrow.address}`);

  for(let i = 0; i<3; i++){
    //Approve properties
    let transaction = await realEstate.connect(seller).approve(escrow.address, i+1);
    await transaction.wait()
  }


    //List properties
    let transaction = await escrow.connect(seller).list(1, buyer.address, tokens(20), tokens(10))
    await transaction.wait()

    transaction = await escrow.connect(seller).list(2, buyer.address, tokens(15), tokens(5))
    await transaction.wait()
    
    transaction = await escrow.connect(seller).list(3, buyer.address, tokens(10), tokens(5))
    await transaction.wait()

    console.log('...finished')

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
