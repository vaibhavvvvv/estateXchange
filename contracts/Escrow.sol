//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

//interface- kinda likda skeleton of contract. describes functions in it.
interface IERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

contract Escrow {

    address public nftAddress;
    address payable public seller;
    address public lender;
    address public inspector;

    mapping( uint256 => bool ) public isListed;
    mapping( uint256 => uint256 ) public purchasePrice;
    mapping( uint256 => uint256 ) public escrowAmount;
    mapping( uint256 => address ) public buyer;
    mapping( uint256 => bool) public inspectionPassed;
    mapping( uint256 => mapping(address => bool)) public approval;

    modifier onlySeller {
        require( msg.sender == seller, "Only seller can call this method");
        _;
    }

    modifier onlyBuyer(uint _nftId) {
        require(msg.sender == buyer[_nftId], "Only buyer can call this method");
        _;
    }

    modifier onlyInspector() {
        require(msg.sender == inspector , "Only inspector can call this method");
        _;
    }

    constructor(address _nftAddress , address payable _seller, address _lender, address _inspector){
        nftAddress = _nftAddress;
        seller = _seller;
        lender = _lender;
        inspector = _inspector;
        
    }

    function list(uint256 _nftId,  address _buyer, uint256 _purchasePrice, uint256 _escrowAmount) onlySeller payable public {
        //transfer nft from seller to this contract
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftId);
        isListed[_nftId] = true;
        purchasePrice[_nftId]= _purchasePrice;
        escrowAmount[_nftId] = _escrowAmount;
        buyer[_nftId] = _buyer;
    }

    //put under contract - (only buyer-payable escrow)
    function depositEarnest(uint256 _nftId) payable public onlyBuyer(_nftId) {
        require(msg.value == escrowAmount[_nftId]);
    }

    //Update inspection status (only inspector)
    function updateInspectionStatus(uint256 _nftId, bool _passed) public onlyInspector {
        inspectionPassed[_nftId] = _passed;
    }

    //Approve sale
    function approveSale(uint256 _nftId)  public{
        approval[_nftId][msg.sender] = true;
    }

    // Finalize sale 
    // -> Require Inspection Status (add more items here, like appraisal)
    // -> Require Sale to be authorized
    // -> Require Funds to be correct amount
    // -> Transfer NFT to buyer
    // -> Transfer funds to seller
    function finalizeSale(uint256 _nftId) public {
        require(inspectionPassed[_nftId]);
        require(approval[_nftId][buyer[_nftId]]);
        require(approval[_nftId][seller]);
        require(approval[_nftId][lender]);
        require(address(this).balance >= purchasePrice[_nftId]); 

        isListed[_nftId] = false;

        (bool success, ) = payable(seller).call{value: address(this).balance}("");
        require(success);

        IERC721(nftAddress).transferFrom(address(this), buyer[_nftId], _nftId);
    }

    // cancel sale (handle earnest deposit)
    // -> if inspection status is not approved the refund, otherwise send to seller
    function cancelSale( uint256 _nftId) public {
        if(inspectionPassed[_nftId] == false ){
            payable(buyer[_nftId]).transfer(address(this).balance);
        }else {
            payable(seller).transfer(address(this).balance);
        }
    }

    //allows to recieve ethers. for eg-  lender can send funds to increase balance
    receive() external payable {}

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

}
