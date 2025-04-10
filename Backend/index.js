import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { ethers } from "ethers";
import fs from "fs";
import cors from "cors";
import { imageHash } from "image-hash";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Load contract ABI
const contractABI = JSON.parse(fs.readFileSync("./Users/prashastnigam/Library/Mobile Documents/com~apple~CloudDocs/Desktop/New Folder With Items/Mini_project/Backend/artifacts/contracts/NFTAuth.sol/NFTAuth.json", "utf8"));
const provider = new ethers.JsonRpcProvider(process.env.INFURA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

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
  

app.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!req.file || !name) return res.status(400).json({ error: "Missing image or name" });

    const contractOwner = await contract.owner();
    if (address.toLowerCase() !== contractOwner.toLowerCase()) {
      return res.status(403).json({ error: "Only owner can register NFTs" });
    }

    const pHash = await generatePhash(req.file.path);

    try {
      const existing = await contract.getNFTPhash(name);
      if (existing) return res.status(400).json({ error: "NFT already registered" });
    } catch (_) {
      console.log("NFT not found. Proceeding to register.");
    }

    const tx = await contract.registerNFT(name, pHash);
    await tx.wait();
    res.json({ message: "NFT registered successfully!", txHash: tx.hash });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: error.reason || "Registration failed" });
  }
});

app.post("/verify", upload.single("image"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!req.file || !name) return res.status(400).json({ error: "Missing image or name" });

    const uploadedPhash = await generatePhash(req.file.path);
    const storedPhash = await contract.getNFTPhash(name);
    const isExact = await contract.verifyNFT(name, uploadedPhash);

    if (isExact) {
      return res.json({ message: "NFT is authentic ✅ (Exact Match)" });
    }

    const distance = hammingDistance(uploadedPhash, storedPhash);
    const threshold = 5; // pHash recommended threshold
    if (distance <= threshold) {
      return res.json({ message: "NFT is authentic ✅ (Near Match)", distance });
    } else {
      return res.json({ message: "NFT is FAKE ❌", distance });
    }
  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
