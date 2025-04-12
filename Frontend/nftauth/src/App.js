// 🔹 FRONTEND (React)
import React, { useState } from "react";

function App() {
    const [account, setAccount] = useState("");
    const [file, setFile] = useState(null);
    const [nftName, setNftName] = useState("");
    const [action, setAction] = useState("register");

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                setAccount(accounts[0]);
            } catch (error) {
                console.error("MetaMask Connection Error:", error);
                alert("Failed to connect MetaMask!");
            }
        } else {
            alert("MetaMask not detected. Please install it.");
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!account) return alert("Please connect MetaMask first!");
        if (!file || !nftName) return alert("Please upload an image and enter NFT name!");

        const formData = new FormData();
        formData.append("image", file);
        formData.append("name", nftName);
        formData.append("address", account);

        try {
            const endpoint = action === "register" ? "/register" : "/verify";
            console.log(`Sending ${action} request to backend...`);
            console.log("NFT Name:", nftName);
            console.log("Image File:", file.name);
            
            const response = await fetch(`http://localhost:3001${endpoint}`, {
                method: 'POST',
                body: formData,
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            alert(data.message);
            if (data.distance !== undefined) {
                console.log(`Hamming Distance: ${data.distance}`);
                console.log(`Threshold: ${data.threshold}`);
            }
        } catch (error) {
            console.error("Error Details:", {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack
            });
            
            if (error.message.includes("NFT not found")) {
                alert("NFT not found - Please check if the NFT name is correct");
            } else if (error.message.includes("connect MetaMask")) {
                alert("Please connect your MetaMask wallet first");
            } else {
                alert(`Error: ${error.message}`);
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
            <h1 className="text-3xl font-bold mb-6">NFT Registration & Verification</h1>

            <button onClick={connectWallet} className="bg-blue-600 px-4 py-2 rounded mb-4">
                {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect MetaMask"}
            </button>

            <div className="mb-4">
                <label className="mr-4">Action:</label>
                <button
                    onClick={() => setAction("register")}
                    className={`px-4 py-2 rounded ${action === "register" ? "bg-green-600" : "bg-gray-600"}`}
                >
                    Register
                </button>
                <button
                    onClick={() => setAction("verify")}
                    className={`ml-2 px-4 py-2 rounded ${action === "verify" ? "bg-yellow-600" : "bg-gray-600"}`}
                >
                    Verify
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded shadow-md w-96">
                <label className="block mb-2">NFT Name:</label>
                <input
                    type="text"
                    value={nftName}
                    onChange={(e) => setNftName(e.target.value)}
                    className="w-full p-2 mb-4 text-black"
                    required
                />

                <label className="block mb-2">Upload NFT Image:</label>
                <input type="file" onChange={handleFileChange} className="w-full p-2 mb-4 text-black" required />

                <button type="submit" className="w-full bg-blue-600 py-2 rounded">
                    {action === "register" ? "Register NFT" : "Verify NFT"}
                </button>
            </form>
        </div>
    );
}

export default App;