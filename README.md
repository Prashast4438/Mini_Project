# Mini Project: Blockchain Ticket Booking System

## Overview
This project is a decentralized ticket booking system leveraging blockchain technology for secure, transparent, and automated ticket management. It includes a React frontend, Node.js backend, and Ethereum smart contracts.

## Features
- **MetaMask wallet integration** for secure user authentication and payments
- **Automated ticket price calculation** based on real-time distance
- **Smart contract** for transparent ticket issuance and management
- **REST API** for distance calculation
- **Full-stack DApp**: React (frontend), Node.js (backend), Solidity (smart contract)

## Architecture
- **Frontend (React):**
  - MetaMask integration
  - Source/destination input
  - Displays calculated distance and ticket price
  - Interacts with smart contract via Web3.js
- **Backend (Node.js):**
  - `/calculate-distance` API endpoint
  - Integrates with external APIs to compute distance
  - Returns distance in kilometers
- **Smart Contract (Solidity):**
  - Receives distance, calculates price
  - Handles booking and payment in ETH

## Data Flow
1. User inputs source/destination in frontend
2. Backend API calculates distance
3. Distance sent to frontend
4. Frontend interacts with smart contract for booking
5. Smart contract processes payment and issues ticket

## Project Structure
```
Mini_Project_Fresh/
├── AI_Server/           # AI/ML model server (Flask, TensorFlow)
├── Backend/             # Node.js backend API
├── Frontend/            # React frontend
├── SmartContract/       # Solidity smart contracts
├── embeddings.db        # SQLite database for embeddings
└── uploads/             # File uploads
```

## Getting Started
### Prerequisites
- Node.js & npm
- Python 3.x
- Ganache or Ethereum testnet
- MetaMask browser extension

### Backend Setup
```
cd Backend
npm install
npm start
```

### Frontend Setup
```
cd Frontend
npm install
npm start
```

### AI Server Setup
```
cd AI_Server
pip install -r requirements.txt
python ai_server.py
```

### Smart Contract Deployment
- Use Truffle/Hardhat to deploy contracts in `SmartContract/`

## Usage
1. Start all servers (backend, frontend, AI server)
2. Open frontend in browser
3. Connect MetaMask
4. Enter source/destination, book ticket

## License
MIT

## Authors
Prashast Nigam
Dheemanth SM
Nikhil EB Reddy
