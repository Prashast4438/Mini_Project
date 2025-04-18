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
import axios from 'axios';
import FormData from 'form-data';
import { execSync } from 'child_process'; // Corrected import statement

// No longer using the external verifier

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: "./backend.env" });
console.log('✅ Loaded environment variables.');

const app = express();
app.use(express.json());

app.use(cors({
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true
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

// Create provider with fallback options to handle rate limiting
console.log('Creating provider with fallback options...');

// List of RPC URLs to try (using public endpoints as fallbacks)
const rpcUrls = [
  process.env.INFURA_RPC_URL,
  'https://eth-sepolia.g.alchemy.com/v2/demo', // Alchemy public demo key
  'https://rpc.ankr.com/eth_sepolia',          // Ankr public endpoint
  'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161' // Infura public key
];

// Create a FallbackProvider with multiple backends
let provider;
try {
  // First try the primary provider
  provider = new ethers.JsonRpcProvider(rpcUrls[0]);
  console.log('Primary provider created.');
} catch (error) {
  console.error('Error creating primary provider:', error.message);
  // If primary fails, try fallbacks
  for (let i = 1; i < rpcUrls.length; i++) {
    try {
      provider = new ethers.JsonRpcProvider(rpcUrls[i]);
      console.log(`Fallback provider ${i} created.`);
      break;
    } catch (fallbackError) {
      console.error(`Error creating fallback provider ${i}:`, fallbackError.message);
    }
  }
}

if (!provider) {
  console.error('Failed to create any provider. Using a mock provider for testing.');
  // Create a minimal mock provider for testing
  provider = {
    getBlockNumber: () => Promise.resolve(0),
    call: () => Promise.resolve('0x')
  };
}

// Create wallet and contract
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log('Wallet created.');
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);
console.log("Contract created. Address:", process.env.CONTRACT_ADDRESS);

// Test contract connection but don't block server startup
contract.owner().then(owner => {
    console.log("✅ Connected to contract. Owner:", owner);
}).catch(error => {
    console.error("❌ Contract connection failed:", error);
    console.error("The server will continue running, but blockchain features won't work.");
    console.error("Try updating your Infura API key or using a different provider.");
});

const upload = multer({ dest: "uploads/" });

// Generate perceptual hash (pHash)
const generatePhash = (filePath) => {
    return new Promise((resolve, reject) => {
        // Check if file exists and is readable
        if (!fs.existsSync(filePath)) {
            const error = new Error(`File does not exist: ${filePath}`);
            error.code = 'ENOENT';
            reject(error);
            return;
        }
        
        // Check file size
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            const error = new Error(`File is empty: ${filePath}`);
            error.code = 'EMPTY_FILE';
            reject(error);
            return;
        }
        
        console.log(`Generating perceptual hash for file: ${filePath} (${stats.size} bytes)`);
        
        imageHash(filePath, 16, true, (error, hash) => {
            if (error) {
                console.error("Error generating perceptual hash:", error);
                reject(error);
                return;
            }
            
            console.log(`Generated perceptual hash: ${hash}`);
            resolve(hash);
        });
    });
};

const hammingDistance = (hash1, hash2) => {
    const bin1 = BigInt("0x" + hash1).toString(2).padStart(256, "0");
    const bin2 = BigInt("0x" + hash2).toString(2).padStart(256, "0");
    return [...bin1].reduce((dist, bit, i) => dist + (bit !== bin2[i]), 0);
};

// 🔹 Register NFT endpoint
// Basic route to check if server is running
app.get('/', (req, res) => {
    res.json({ message: "Backend server is running!" });
});

// Add a route to check if the server is responding to the register endpoint
app.get("/register", (req, res) => {
    res.json({ message: "Register endpoint is working!" });
});

// Add a route to check if the server is responding to the verify endpoint
app.get("/verify", (req, res) => {
    res.json({ message: "Verify endpoint is working!" });
});

app.post("/register", upload.single("image"), async (req, res) => {
    console.log("\n=== New Registration Request ===");
    console.log("Request body:", req.body);
    console.log("File:", req.file ? req.file.path : "No file uploaded");
    
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

        // Send image to AI server for feature extraction/storage
        try {
            const aiFormData = new FormData();
            const fileBuffer = fs.readFileSync(req.file.path);
            aiFormData.append('image', fileBuffer, { filename: path.basename(req.file.path) });
            aiFormData.append('name', name);

            // Call the AI server's /register endpoint
            const aiResponse = await axios.post('http://localhost:5050/register', aiFormData, {
                headers: {
                    ...aiFormData.getHeaders(),
                },
            });
            console.log("AI server registration response:", aiResponse.data);
        } catch (aiError) {
            console.error("AI server registration error:", aiError.message);
            // Optionally, you can decide to fail or continue registration if the AI step fails
        }

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
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
                console.log(`Cleaned up uploaded file: ${req.file.path}`);
            } catch (cleanupError) {
                console.error(`Error cleaning up uploaded file: ${cleanupError.message}`);
            }
        }
    }
});

// 🔹 Verify NFT endpoint
app.post("/verify", upload.single("image"), async (req, res) => {
    let filePath = req.file?.path || null;

    console.log("\n=== New Verification Request ===");
    console.log("Request body:", req.body);
    console.log("File path:", filePath);

    let blockchainResult = null;
    let aiModelResult = null;

    try {
        // === BLOCKCHAIN VERIFICATION ===
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: "Missing NFT name" });

        const storedHash = await contract.getNFTPhash(name);
        const uploadedHash = await generatePhash(filePath);

        const isExact = storedHash === uploadedHash;
        const distance = hammingDistance(uploadedHash, storedHash);
        const threshold = 5;

        blockchainResult = {
            match: isExact ? "Exact Match" : (distance <= threshold ? "Near Match" : "No Match"),
            distance,
            threshold,
            isAuthentic: isExact || distance <= threshold
        };

        // === AI MODEL VERIFICATION ===
        console.log("Performing AI verification using separate process...");
        try {
            // Use a separate Node.js process to run the CommonJS verification module
            // This avoids the "require is not defined" error in ES6 modules
            console.log(`[AI VERIFY] Verifying NFT: ${name} using separate process`);
            // Create the command to run the verification script
            const verifyCommand = `node ${path.join(__dirname, 'ai_verify.cjs')} "${name}" "${filePath}"`;
            console.log(`[AI VERIFY] Executing command: ${verifyCommand}`);
            // Execute the command and get the output
            let verifyOutput;
            try {
                verifyOutput = execSync(verifyCommand).toString().trim();
                console.log(`[AI VERIFY] Verification output: ${verifyOutput}`);
            } catch (execError) {
                console.error(`[AI VERIFY] execSync error:`, execError);
                aiModelResult = {
                    isFake: true,
                    confidence: 0,
                    error: `execSync error: ${execError.message}`
                };
                throw execError;
            }
            // Parse the JSON output
            aiModelResult = JSON.parse(verifyOutput);
            // Normalize fields for downstream logic
            if ('matched' in aiModelResult && 'similarity' in aiModelResult) {
                aiModelResult = {
                    isFake: !aiModelResult.matched,
                    confidence: aiModelResult.similarity * 100,
                    ...aiModelResult
                };
            }
            console.log("[AI VERIFY] AI verification result (normalized):", aiModelResult);
        } catch (error) {
            console.error("Error in AI server communication:", error.message);
            console.error("Error stack:", error.stack);

            // If there's a response from the AI server, log it
            if (error.response) {
                console.error("AI server response status:", error.response.status);
                console.error("AI server response data:", JSON.stringify(error.response.data, null, 2));
            }

            aiModelResult = {
                isFake: true,
                confidence: 0,
                error: error.message,
                stack: error.stack
            };
        }

        // === FINAL CONCLUSION ===
        let finalConclusion = "NFT is FAKE ❌ - Both blockchain and AI verification failed";
        if (blockchainResult.isAuthentic && !aiModelResult.isFake) {
            finalConclusion = "NFT is authentic ✅ - Both verifications passed";
        } else if (blockchainResult.isAuthentic && aiModelResult.isFake) {
            finalConclusion = "NFT is FAKE ❌ - Blockchain verification passed but AI model detected potential forgery";
        }
        else if (!blockchainResult.isAuthentic && !aiModelResult.isFake) {
            finalConclusion = "NFT is FAKE ❌ - AI passed, Blockchain failed";
        }

        return res.json({
            blockchain: blockchainResult,
            aiModel: aiModelResult,
            finalConclusion
        });
    } catch (error) {
        console.error("Verification error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Verification failed",
            error: error.message,
            errorType: error.name,
            blockchainStatus: blockchainResult ? 'completed' : 'failed',
            aiStatus: aiModelResult ? 'completed' : 'failed'
        });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
                console.log("Cleaned up uploaded file:", filePath);
            } catch (err) {
                console.error("Cleanup error:", err.message);
            }
        }
    }
});

// Start the server after all routes are defined
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
