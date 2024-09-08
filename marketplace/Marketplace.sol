// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Marketplace {
    struct Item {
        uint256 Id;
        string Name;
        uint256 Price;
        address payable Seller;
        address Owner;
        bool IsSold;
    }

    uint256 public itemCount = 0;
    mapping(uint256 => Item) public items;
    mapping(address => uint256[]) public ownedItems;

    event ItemAdded(uint256 id, string name, uint256 price, address seller); 
    event ItemSold(uint256 id, address buyer); 

    function listItem(string memory _name, uint256 _price) public {
        require(_price > 0, "Price must be greater than 0");
        itemCount++;
        items[itemCount] = Item(
            itemCount,
            _name,
            _price,
            payable(msg.sender),
            msg.sender,
            false
        );
        ownedItems[msg.sender].push(itemCount);

        emit ItemAdded(itemCount, _name, _price, msg.sender);
    }
 
    function purchaseItem(uint256 _id) public payable {
        Item storage item = items[_id];

        require(_id > 0, "Invalid Id");
        require(msg.value == item.Price, "Incorrect Price");
        require(item.IsSold == false, "Item already sold");
        require(item.Seller != msg.sender, "Seller cannot buy their own item");

        item.IsSold = true;
        item.Seller.transfer(msg.value);
 
        _transferOwnership(_id, item.Seller, msg.sender);
 
        emit ItemSold(_id, msg.sender);
    }
 
    function _transferOwnership(
        uint256 _id,
        address _from,
        address _to
    ) internal {
        Item storage item = items[_id];
        item.Owner = _to;

        uint256[] storage fromItems = ownedItems[_from];
        for (uint256 id = 0; id < fromItems.length; id++) {
            if (fromItems[id] == _id) {
                fromItems[id] = fromItems[fromItems.length - 1];
                fromItems.pop();
                break;
            }
        }

        ownedItems[_to].push(_id);
    }
 
    function transferItem(uint256 _id, address _to) public {
        Item storage item = items[_id];

        require(_id > 0 && _id <= itemCount, "Item does not exist");
        require(msg.sender == item.Owner, "You are not the owner of this item");

        _transferOwnership(_id, msg.sender, _to);
    }

 
    function getItemsByOwner(address _owner) public view returns (uint256[] memory) {
        return ownedItems[_owner];
    }
}

// contract address: 0x13a935753a7173ba0a9fa6675f973a75330404c8