import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { ethers } from "ethers";
import fs from "fs";
import cors from "cors";
import { imageHash } from "image-hash";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: "./backend.env" });

const app = express();
app.use(express.json());

app.use(cors({
    origin: true, // Allow all origins for now
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept'],
}));

// Add logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Load contract ABI
const contractABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "pHash",
          "type": "string"
        }
      ],
      "name": "NFTRegistered",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        }
      ],
      "name": "getNFTPhash",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "nftHashes",
      "outputs": [
        {
          "internalType": "string",
          "name": "pHash",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "pHash",
          "type": "string"
        }
      ],
      "name": "registerNFT",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
];

const provider = new ethers.JsonRpcProvider(process.env.INFURA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

console.log("Contract address:", process.env.CONTRACT_ADDRESS);
console.log("Testing contract connection...");
contract.owner().then(owner => {
    console.log("✅ Connected to contract. Owner:", owner);
}).catch(error => {
    console.error("❌ Contract connection failed:", error);
    process.exit(1);
});

const upload = multer({ dest: "uploads/" });

// Generate perceptual hash (pHash)
const generatePhash = (filePath) => {
  return new Promise((resolve, reject) => {
    imageHash(filePath, 16, true, (error, hash) => {
      fs.unlinkSync(filePath); // Delete uploaded file after hashing
      if (error) return reject(error);
      resolve(hash); // e.g., "ffcc00dd..."
    });
  });
};

const hammingDistance = (hash1, hash2) => {
    const bin1 = BigInt("0x" + hash1).toString(2).padStart(256, "0");
    const bin2 = BigInt("0x" + hash2).toString(2).padStart(256, "0");
    return [...bin1].reduce((dist, bit, i) => dist + (bit !== bin2[i]), 0);
  };

// 🔹 Register NFT endpoint
app.post("/register", upload.single("image"), async (req, res) => {
    console.log("\n=== New Registration Request ===");
    console.log("Request body:", req.body);
    console.log("File:", req.file);
    
    try {
        const { name, address } = req.body;
        if (!req.file || !name) {
            console.log("Missing required fields");
            return res.status(400).json({ error: "Missing image or name" });
        }

        console.log("Checking contract owner...");
        const contractOwner = await contract.owner();
        console.log("Contract owner:", contractOwner);
        console.log("Request address:", address);
        
        if (address.toLowerCase() !== contractOwner.toLowerCase()) {
            console.log("Authorization failed - not owner");
            return res.status(403).json({ error: "Only owner can register NFTs" });
        }

        console.log("Generating pHash...");
        const pHash = await generatePhash(req.file.path);
        console.log("Generated pHash:", pHash);

        try {
            console.log("Checking if NFT exists...");
            const exists = await contract.nftHashes(name);
            console.log("NFT exists check result:", exists);
            if (exists.exists) {
                console.log("NFT already exists");
                return res.status(400).json({ error: "NFT already registered" });
            }
        } catch (error) {
            console.log("Error checking NFT existence:", error);
            // If error, assume NFT doesn't exist and continue
        }

        console.log("Registering NFT...");
        console.log("Name:", name);
        console.log("pHash:", pHash);
        const tx = await contract.registerNFT(name, pHash);
        console.log("Transaction sent:", tx.hash);
        console.log("Waiting for confirmation...");
        await tx.wait();
        console.log("NFT registered successfully!");
        
        res.json({ 
            message: "NFT registered successfully!", 
            txHash: tx.hash,
            details: {
                name,
                pHash,
                owner: contractOwner
            }
        });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ 
            error: "Registration failed", 
            details: error.message,
            reason: error.reason
        });
    } finally {
        // Clean up uploaded file
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        }
    }
});

// 🔹 Verify NFT endpoint
app.post("/verify", upload.single("image"), async (req, res) => {
    try {
        console.log("\n=== New Verification Request ===");
        console.log("Request body:", req.body);
        console.log("File:", req.file);

        const { name } = req.body;
        if (!req.file || !name) {
            return res.status(400).json({ error: "Missing image or name" });
        }

        // Get the stored hash
        console.log("Getting hash for NFT:", name);
        try {
            const storedHash = await contract.getNFTPhash(name);
            console.log("Got stored hash:", storedHash);
            
            // Generate hash for uploaded image
            console.log("Generating hash for uploaded image...");
            const uploadedHash = await generatePhash(req.file.path);
            console.log("Uploaded hash:", uploadedHash);

            // Compare hashes
            console.log("Comparing hashes...");
            const isExact = storedHash === uploadedHash;
            console.log("Is exact match?", isExact);

            if (isExact) {
                return res.json({ message: "NFT is authentic ✅ (Exact Match)" });
            }

            // Calculate similarity
            console.log("Calculating similarity...");
            const distance = hammingDistance(uploadedHash, storedHash);
            console.log("Hamming distance:", distance);

            const threshold = 5;
            if (distance <= threshold) {
                return res.json({ 
                    message: "NFT is authentic ✅ (Near Match)", 
                    distance,
                    threshold 
                });
            } else {
                return res.json({ 
                    message: "NFT is FAKE ❌", 
                    distance,
                    threshold 
                });
            }
        } catch (error) {
            console.error("Contract call error:", error);
            if (error.message.includes("NFT not found")) {
                return res.status(404).json({ error: "NFT not found - Please check the NFT name" });
            }
            throw error;
        }
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ 
            error: "Verification failed",
            details: error.message
        });
    } finally {
        // Clean up uploaded file
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        }
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
