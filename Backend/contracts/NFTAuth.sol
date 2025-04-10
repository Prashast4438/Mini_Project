// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract NFTAuth {
    address public owner;
    
    struct NFTData {
        string pHash; // Perceptual Hash of the NFT
        bool exists;  // Ensures NFT is registered
    }

    mapping(string => NFTData) public nftHashes; // NFT Name → NFTData (pHash, exists)

    event NFTRegistered(string indexed name, string pHash);
    

    constructor() {
        owner = msg.sender;
    }

    // 🔹 Modifier to restrict access to contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    // 🔹 Function to register an NFT (Only Owner)
    function registerNFT(string memory name, string memory pHash) public onlyOwner {
        require(!nftHashes[name].exists, "NFT already registered");
        nftHashes[name] = NFTData(pHash, true);
        emit NFTRegistered(name, pHash);
    }
    // 🔹 Function to verify NFT (Exact match only - On-chain check)
    function verifyNFT(string memory name, string memory uploadedPhash) public view returns (bool) {
        require(nftHashes[name].exists, "NFT not registered");
        bool isExactMatch = keccak256(abi.encodePacked(nftHashes[name].pHash)) == keccak256(abi.encodePacked(uploadedPhash));
       
        return isExactMatch;
    }
}
