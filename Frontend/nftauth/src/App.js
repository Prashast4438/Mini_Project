import React, { useState } from "react";

function App() {
    const [account, setAccount] = useState("");
    const [file, setFile] = useState(null);
    const [nftName, setNftName] = useState("");
    const [action, setAction] = useState("register");
    const [responseMessage, setResponseMessage] = useState("");
    const [distance, setDistance] = useState(null);
    const [threshold, setThreshold] = useState(null);

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
            const response = await fetch(`http://localhost:3001${endpoint}`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            setResponseMessage(data.message);
            if (data.distance !== undefined) {
                setDistance(data.distance);
                setThreshold(data.threshold);
            }
        } catch (error) {
            console.error("Error Details:", {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack
            });

            if (error.message.includes("NFT not found")) {
                setResponseMessage("NFT not found - Please check if the NFT name is correct");
            } else if (error.message.includes("connect MetaMask")) {
                setResponseMessage("Please connect your MetaMask wallet first");
            } else {
                setResponseMessage(`Error: ${error.message}`);
            }
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.cardBox}>
                <h1 style={styles.title}>NFT Registration & Verification</h1>

                <button onClick={connectWallet} style={styles.walletButton}>
                    {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect MetaMask"}
                </button>

                <div style={styles.actionButtonsContainer}>
                    <label style={styles.actionLabel}>Action:</label>
                    <button
                        onClick={() => setAction("register")}
                        style={action === "register" ? styles.activeButton : styles.inactiveButton}
                    >
                        Register
                    </button>
                    <button
                        onClick={() => setAction("verify")}
                        style={action === "verify" ? styles.activeButton : styles.inactiveButton}
                    >
                        Verify
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <label style={styles.label}>NFT Name:</label>
                    <input
                        type="text"
                        value={nftName}
                        onChange={(e) => setNftName(e.target.value)}
                        style={styles.input}
                        required
                    />

                    <label style={styles.label}>Upload NFT Image:</label>
                    <input type="file" onChange={handleFileChange} style={styles.input} required />

                    <button type="submit" style={styles.submitButton}>
                        {action === "register" ? "Register NFT" : "Verify NFT"}
                    </button>
                </form>

                {responseMessage && <p style={styles.responseMessage}>{responseMessage}</p>}
                {distance !== null && threshold !== null && (
                    <div style={styles.detailsContainer}>
                        <p>Hamming Distance: {distance}</p>
                        <p>Threshold: {threshold}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%)", // gradient background
        padding: "20px",
        color: "white",
    },
    cardBox: {
        backgroundColor: "#3c366b",
        padding: "30px",
        borderRadius: "20px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
        width: "90%",
        maxWidth: "500px",
        border: "2px solid #ffffff33", // subtle border
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    title: {
        fontSize: "24px",
        fontWeight: "bold",
        marginBottom: "20px",
    },
    walletButton: {
        backgroundColor: "#3182ce",
        padding: "10px 20px",
        borderRadius: "8px",
        marginBottom: "20px",
        cursor: "pointer",
        color: "white",
        border: "none",
    },
    actionButtonsContainer: {
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    actionLabel: {
        marginRight: "10px",
        color: "white",
    },
    activeButton: {
        backgroundColor: "#38a169",
        padding: "10px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        color: "white",
        border: "none",
    },
    inactiveButton: {
        backgroundColor: "#4a5568",
        padding: "10px 20px",
        borderRadius: "8px",
        cursor: "pointer",
        color: "white",
        border: "none",
    },
    form: {
        backgroundColor: "#2d3748",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        width: "100%",
        marginBottom: "20px",
    },
    label: {
        display: "block",
        marginBottom: "10px",
        color: "white",
    },
    input: {
        width: "475px",
        padding: "10px",
        marginBottom: "20px",
        backgroundColor: "#edf2f7",
        borderRadius: "8px",
        border: "1px solid #ccc",
        color:"black",
    },
    submitButton: {
        width: "100%",
        padding: "12px",
        backgroundColor: "#3182ce",
        color: "white",
        borderRadius: "8px",
        cursor: "pointer",
        border: "none",
    },
    responseMessage: {
        marginTop: "20px",
        color: "white",
        border: "3px solid #ffffff",
        borderRadius: "15px",
        padding: "15px",
        textAlign: "center",
        width: "100%",
        backgroundColor: "#4c1d95",
    },
    detailsContainer: {
        marginTop: "15px",
        color: "yellow",
        textAlign: "center",
    },
};

export default App;
